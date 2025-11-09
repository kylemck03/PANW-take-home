"""
ML Analysis Service - Orchestrates the ML pipeline.
"""

from app.models.ml_models import (
    analyze_correlations,
    detect_anomalies,
    analyze_trends,
    analyze_lagged_correlations,
    detect_sleep_sugar_pattern,
    analyze_anomaly_context,
    calculate_baseline_stats
)
from app.services.supabase_service import supabase_service
from app.config import settings
import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import Dict, List, Optional, Any
import logging
import time

logger = logging.getLogger(__name__)


def convert_numpy_types(obj: Any) -> Any:
    """
    Recursively convert numpy types to native Python types for JSON serialization.
    
    Args:
        obj: Any object that might contain numpy types
    
    Returns:
        Object with numpy types converted to Python native types
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.strftime('%Y-%m-%d')
    elif hasattr(obj, 'strftime') and hasattr(obj, 'date'):  # datetime or date objects
        return obj.strftime('%Y-%m-%d')
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    elif pd.isna(obj):
        return None
    else:
        return obj


class MLAnalysisService:
    """Orchestrates ML analysis pipeline."""
    
    def __init__(self):
        self.min_data_points = settings.min_data_points
        self.contamination = settings.anomaly_contamination
    
    async def run_full_analysis(
        self,
        user_id: str,
        days: int = 90
    ) -> Dict:
        """
        Run complete ML pipeline for a user.
        
        Args:
            user_id: User UUID
            days: Number of days to analyze
        
        Returns:
            Dictionary with all analysis results
        """
        start_time = time.time()
        logger.info(f"Starting full ML analysis for user {user_id} ({days} days)")
        
        try:
            # 1. Fetch data
            df = await supabase_service.get_health_data(user_id, days=days)
            
            if df.empty or len(df) < self.min_data_points:
                return {
                    "error": f"Insufficient data (need at least {self.min_data_points} days, got {len(df)})",
                    "user_id": user_id,
                    "days_requested": days,
                    "days_available": len(df)
                }
            
            results = {
                "user_id": user_id,
                "days_analyzed": len(df),
                "analysis_date": str(date.today()),
                "data_range": {
                    "start": str(df['date'].min().date()) if not df.empty else None,
                    "end": str(df['date'].max().date()) if not df.empty else None
                }
            }
            
            # 2. Correlation Analysis
            logger.info("Running correlation analysis...")
            correlations_df, corr_matrix = analyze_correlations(df)
            results['correlations'] = correlations_df.to_dict('records') if not correlations_df.empty else []
            results['correlation_count'] = len(correlations_df)
            
            # Store top correlations in DB
            for _, corr in correlations_df.head(15).iterrows():
                await supabase_service.store_correlation(user_id, {
                    "metric_a": corr['metric_a'],
                    "metric_b": corr['metric_b'],
                    "correlation_value": float(corr['correlation']),
                    "p_value": float(corr['p_value']),
                    "strength": corr['strength'],
                    "direction": corr['direction'],
                    "sample_size": len(df),
                    "analysis_period_start": str(df['date'].min().date()),
                    "analysis_period_end": str(df['date'].max().date())
                })
            
            # 3. Anomaly Detection
            logger.info("Running anomaly detection...")
            anomalies_df, analyzed_features = detect_anomalies(df, contamination=self.contamination)
            anomalies = anomalies_df[anomalies_df['is_anomaly']]
            results['anomalies'] = []
            results['anomaly_count'] = len(anomalies)
            
            # Analyze context for recent anomalies and store
            if len(anomalies) > 0:
                # Get baseline stats for context analysis
                baseline_stats = calculate_baseline_stats(df, analyzed_features)
                
                for _, anomaly_row in anomalies.tail(10).iterrows():  # Store last 10 anomalies
                    # Determine primary anomalous metric
                    max_deviation_metric = None
                    max_deviation = 0
                    
                    for feature in analyzed_features:
                        deviation_col = f'{feature}_deviation'
                        if deviation_col in anomaly_row:
                            if abs(anomaly_row[deviation_col]) > max_deviation:
                                max_deviation = abs(anomaly_row[deviation_col])
                                max_deviation_metric = feature
                    
                    if max_deviation_metric:
                        anomaly_date = str(anomaly_row['date'].date()) if pd.notna(anomaly_row.get('date')) else str(date.today())
                        
                        await supabase_service.store_anomaly(user_id, {
                            "date": anomaly_date,
                            "primary_metric": max_deviation_metric,
                            "metric_value": float(anomaly_row[max_deviation_metric]),
                            "baseline_value": float(baseline_stats[max_deviation_metric]['mean']),
                            "z_score": float(anomaly_row[f'{max_deviation_metric}_deviation']),
                            "anomaly_score": float(anomaly_row['anomaly_score']),
                            "severity": "high" if abs(anomaly_row[f'{max_deviation_metric}_deviation']) > 2.5 else "moderate"
                        })
                        
                        results['anomalies'].append({
                            "date": anomaly_date,
                            "metric": max_deviation_metric,
                            "value": float(anomaly_row[max_deviation_metric]),
                            "deviation": float(anomaly_row[f'{max_deviation_metric}_deviation'])
                        })
            
            # 4. Trend Analysis
            logger.info("Running trend analysis...")
            _, trends_df = analyze_trends(df)
            results['trends'] = trends_df.to_dict('records') if not trends_df.empty else []
            
            # 5. Pattern Detection
            logger.info("Detecting behavioral patterns...")
            patterns = {}
            
            # Sleep-Sugar Pattern
            if 'sleep_hours' in df.columns and 'dietary_sugar' in df.columns:
                sleep_sugar_pattern = detect_sleep_sugar_pattern(df)
                patterns['sleep_sugar'] = sleep_sugar_pattern
                
                if sleep_sugar_pattern.get('pattern_detected'):
                    await supabase_service.store_pattern(user_id, {
                        "pattern_type": "sleep_sugar",
                        "pattern_name": "Poor Sleep Leads to Sugar Cravings",
                        "predictor_metric": "sleep_hours",
                        "outcome_metric": "dietary_sugar",
                        "lag_days": 1,
                        "p_value": float(sleep_sugar_pattern['p_value']) if sleep_sugar_pattern.get('p_value') else None,
                        "percent_change": float(sleep_sugar_pattern['percent_change']),
                        "threshold_value": float(sleep_sugar_pattern['sleep_threshold']),
                        "confidence_level": "high" if sleep_sugar_pattern['statistically_significant'] else "medium",
                        "narrative": sleep_sugar_pattern['narrative'],
                        "actionable_tip": "Try to prioritize 7-8 hours of sleep to help manage sugar cravings.",
                        "analysis_period_start": str(df['date'].min().date()),
                        "analysis_period_end": str(df['date'].max().date()),
                        "sample_size": sleep_sugar_pattern['total_days']
                    })
            
            # Lagged Correlations
            lagged_corr_df = analyze_lagged_correlations(df)
            patterns['lagged_correlations'] = lagged_corr_df.to_dict('records') if not lagged_corr_df.empty else []
            
            results['patterns'] = patterns
            
            # 6. Calculate and store baselines
            logger.info("Calculating user baselines...")
            baseline_metrics = ['sleep_hours', 'step_count', 'resting_heart_rate', 'hrv_sdnn', 'active_energy_burned']
            baselines = {}
            
            for metric in baseline_metrics:
                if metric in df.columns:
                    baselines[f'{metric}_baseline'] = float(df[metric].mean())
                    baselines[f'{metric}_std'] = float(df[metric].std())
            
            if baselines:
                baselines['calculated_from_days'] = len(df)
                await supabase_service.store_baselines(user_id, baselines)
            
            # 7. Log analysis
            execution_time_ms = int((time.time() - start_time) * 1000)
            results['execution_time_ms'] = execution_time_ms
            
            await supabase_service.log_ml_analysis(
                user_id=user_id,
                analysis_type="full",
                results_summary={
                    "correlations": len(correlations_df),
                    "anomalies": len(anomalies),
                    "trends": len(trends_df),
                    "patterns_detected": sum(1 for p in patterns.values() if isinstance(p, dict) and p.get('pattern_detected'))
                },
                days_analyzed=len(df),
                execution_time_ms=execution_time_ms
            )
            
            logger.info(f"✅ Full analysis complete in {execution_time_ms}ms")
            
            # Convert all numpy types to native Python types for JSON serialization
            return convert_numpy_types(results)
            
        except Exception as e:
            logger.error(f"Error in full analysis: {e}", exc_info=True)
            raise
    
    async def analyze_correlations_only(
        self,
        user_id: str,
        days: int = 90
    ) -> Dict:
        """Run only correlation analysis."""
        logger.info(f"Running correlation analysis for user {user_id}")
        
        try:
            df = await supabase_service.get_health_data(user_id, days=days)
            
            if df.empty or len(df) < self.min_data_points:
                return {"error": "Insufficient data"}
            
            correlations_df, _ = analyze_correlations(df)
            
            results = {
                "user_id": user_id,
                "days_analyzed": len(df),
                "correlations": correlations_df.to_dict('records') if not correlations_df.empty else []
            }
            
            return convert_numpy_types(results)
            
        except Exception as e:
            logger.error(f"Error in correlation analysis: {e}")
            raise
    
    async def detect_anomalies_only(
        self,
        user_id: str,
        days: int = 90
    ) -> Dict:
        """Run only anomaly detection."""
        logger.info(f"Running anomaly detection for user {user_id}")
        
        try:
            df = await supabase_service.get_health_data(user_id, days=days)
            
            if df.empty or len(df) < self.min_data_points:
                return {"error": "Insufficient data"}
            
            anomalies_df, analyzed_features = detect_anomalies(df, contamination=self.contamination)
            anomalies = anomalies_df[anomalies_df['is_anomaly']]
            
            # Build detailed anomaly records similar to full analysis
            anomaly_records = []
            if len(anomalies) > 0:
                baseline_stats = calculate_baseline_stats(df, analyzed_features)
                
                for _, anomaly_row in anomalies.iterrows():
                    # Determine primary anomalous metric
                    max_deviation_metric = None
                    max_deviation = 0
                    
                    for feature in analyzed_features:
                        deviation_col = f'{feature}_deviation'
                        if deviation_col in anomaly_row:
                            if abs(anomaly_row[deviation_col]) > max_deviation:
                                max_deviation = abs(anomaly_row[deviation_col])
                                max_deviation_metric = feature
                    
                    if max_deviation_metric:
                        anomaly_date = anomaly_row.get('date')
                        anomaly_records.append({
                            "date": anomaly_date,
                            "metric": max_deviation_metric,
                            "value": float(anomaly_row[max_deviation_metric]),
                            "deviation": float(anomaly_row[f'{max_deviation_metric}_deviation']),
                            "anomaly_score": float(anomaly_row['anomaly_score'])
                        })
            
            results = {
                "user_id": user_id,
                "days_analyzed": len(df),
                "anomaly_count": len(anomaly_records),
                "anomalies": anomaly_records
            }
            
            return convert_numpy_types(results)
            
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            raise
    
    async def analyze_trends_only(
        self,
        user_id: str,
        days: int = 90
    ) -> Dict:
        """Run only trend analysis."""
        logger.info(f"Running trend analysis for user {user_id}")
        
        try:
            df = await supabase_service.get_health_data(user_id, days=days)
            
            if df.empty or len(df) < self.min_data_points:
                return {"error": "Insufficient data"}
            
            _, trends_df = analyze_trends(df)
            
            results = {
                "user_id": user_id,
                "days_analyzed": len(df),
                "trends": trends_df.to_dict('records') if not trends_df.empty else []
            }
            
            return convert_numpy_types(results)
            
        except Exception as e:
            logger.error(f"Error in trend analysis: {e}")
            raise
    
    async def get_health_summary(
        self,
        user_id: str,
        days: int = 7
    ) -> Dict:
        """
        Get health summary for recent days (for daily insights).
        
        Args:
            user_id: User UUID
            days: Number of recent days to summarize
        
        Returns:
            Dictionary with health summary
        """
        try:
            df = await supabase_service.get_health_data(user_id, days=days)
            
            if df.empty:
                return {"error": "No data available"}
            
            # Calculate averages
            summary = {
                "days": len(df),
                "date_range": {
                    "start": str(df['date'].min().date()),
                    "end": str(df['date'].max().date())
                }
            }
            
            metrics = ['sleep_hours', 'step_count', 'resting_heart_rate', 'hrv_sdnn', 
                      'active_energy_burned', 'exercise_time_minutes']
            
            for metric in metrics:
                if metric in df.columns:
                    summary[f'{metric}_avg'] = round(float(df[metric].mean()), 1)
                    summary[f'{metric}_latest'] = round(float(df[metric].iloc[-1]), 1)
            
            return convert_numpy_types(summary)
            
        except Exception as e:
            logger.error(f"Error getting health summary: {e}")
            raise


# Singleton instance
ml_service = MLAnalysisService()

