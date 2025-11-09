"""
ML Models and Analysis Functions
Ported from Jupyter notebook (main.ipynb)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from scipy import stats
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def analyze_correlations(
    df: pd.DataFrame,
    significance_threshold: float = 0.3,
    p_value_threshold: float = 0.05
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Compute correlations between health metrics.
    
    Parameters:
    - df: DataFrame with health metrics
    - significance_threshold: Minimum |r| value to consider significant
    - p_value_threshold: Maximum p-value to consider statistically significant
    
    Returns:
    - DataFrame with significant correlations
    - Full correlation matrix
    """
    logger.info("Starting correlation analysis")
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Compute correlation matrix
    corr_matrix = df[numeric_cols].corr()
    
    # Find significant correlations
    significant_correlations = []
    
    for i in range(len(numeric_cols)):
        for j in range(i+1, len(numeric_cols)):
            metric_a = numeric_cols[i]
            metric_b = numeric_cols[j]
            
            # Get correlation coefficient
            r_value = corr_matrix.loc[metric_a, metric_b]
            
            # Calculate p-value - drop rows where EITHER column has NaN to ensure same length
            subset = df[[metric_a, metric_b]].dropna()
            if len(subset) < 2:
                # Need at least 2 data points for correlation
                continue
            
            try:
                _, p_value = stats.pearsonr(subset[metric_a], subset[metric_b])
            except ValueError as e:
                logger.warning(f"Error calculating correlation for {metric_a} vs {metric_b}: {e}")
                continue
            
            # Check if significant
            if abs(r_value) >= significance_threshold and p_value < p_value_threshold:
                significant_correlations.append({
                    'metric_a': metric_a,
                    'metric_b': metric_b,
                    'correlation': r_value,
                    'p_value': p_value,
                    'strength': 'Strong' if abs(r_value) >= 0.7 else 'Moderate' if abs(r_value) >= 0.5 else 'Weak',
                    'direction': 'Positive' if r_value > 0 else 'Negative'
                })
    
    # Convert to DataFrame and sort by absolute correlation
    correlations_df = pd.DataFrame(significant_correlations)
    if not correlations_df.empty:
        correlations_df = correlations_df.sort_values('correlation', key=abs, ascending=False)
    
    logger.info(f"Found {len(correlations_df)} significant correlations")
    return correlations_df, corr_matrix


def detect_anomalies(
    df: pd.DataFrame,
    features_to_analyze: Optional[List[str]] = None,
    contamination: float = 0.1
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Detect anomalies in health data using Isolation Forest.
    
    Parameters:
    - df: DataFrame with health metrics
    - features_to_analyze: List of features to analyze (default: key health metrics)
    - contamination: Expected proportion of anomalies (default: 0.1 = 10%)
    
    Returns:
    - DataFrame with anomaly flags and scores
    - List of analyzed features
    """
    logger.info("Starting anomaly detection")
    
    if features_to_analyze is None:
        features_to_analyze = [
            'sleep_hours', 'step_count', 'resting_heart_rate', 
            'hrv_sdnn', 'active_energy_burned'
        ]
    
    # Filter to only features that exist in df
    features_to_analyze = [f for f in features_to_analyze if f in df.columns]
    
    if not features_to_analyze:
        logger.warning("No valid features for anomaly detection")
        df['is_anomaly'] = False
        df['anomaly_score'] = 0.0
        return df, []
    
    # Prepare data
    X = df[features_to_analyze].copy()
    
    # Handle missing values
    X = X.fillna(X.mean())
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    iso_forest = IsolationForest(contamination=contamination, random_state=42)
    predictions = iso_forest.fit_predict(X_scaled)
    anomaly_scores = iso_forest.score_samples(X_scaled)
    
    # Add results to dataframe
    results_df = df.copy()
    results_df['is_anomaly'] = predictions == -1
    results_df['anomaly_score'] = anomaly_scores
    
    # Calculate deviation from baseline for each metric
    for feature in features_to_analyze:
        baseline_mean = df[feature].mean()
        baseline_std = df[feature].std()
        if baseline_std > 0:
            results_df[f'{feature}_deviation'] = ((df[feature] - baseline_mean) / baseline_std).round(2)
        else:
            results_df[f'{feature}_deviation'] = 0.0
    
    anomaly_count = results_df['is_anomaly'].sum()
    logger.info(f"Detected {anomaly_count} anomalous days ({anomaly_count/len(df)*100:.1f}% of data)")
    
    return results_df, features_to_analyze


def analyze_trends(
    df: pd.DataFrame,
    metrics: Optional[List[str]] = None,
    window_size: int = 7
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Analyze trends in health metrics using rolling averages.
    
    Parameters:
    - df: DataFrame with health metrics
    - metrics: List of metrics to analyze
    - window_size: Window size for rolling average (default: 7 days)
    
    Returns:
    - DataFrame with trend data (rolling averages)
    - DataFrame with trend summary
    """
    logger.info("Starting trend analysis")
    
    if metrics is None:
        metrics = ['sleep_hours', 'step_count', 'resting_heart_rate', 
                   'hrv_sdnn', 'active_energy_burned', 'vo2_max']
    
    # Filter to only metrics that exist in df
    metrics = [m for m in metrics if m in df.columns]
    
    trends_data = df.copy()
    trend_summary = []
    
    for metric in metrics:
        # Skip if metric has all NaN values
        if df[metric].isna().all():
            continue
        
        # Calculate rolling average
        trends_data[f'{metric}_rolling_avg'] = trends_data[metric].rolling(
            window=window_size, 
            min_periods=1
        ).mean()
        
        # Calculate trend direction (last 30 days vs first 30 days)
        if len(df) >= 60:
            first_30_mean = df[metric].iloc[:30].mean()
            last_30_mean = df[metric].iloc[-30:].mean()
        else:
            # Use available data
            half = len(df) // 2
            first_30_mean = df[metric].iloc[:half].mean()
            last_30_mean = df[metric].iloc[half:].mean()
        
        if pd.isna(first_30_mean) or pd.isna(last_30_mean) or first_30_mean == 0:
            percent_change = 0
        else:
            percent_change = ((last_30_mean - first_30_mean) / first_30_mean) * 100
        
        # Determine trend direction
        if abs(percent_change) < 2:
            trend_direction = 'Stable'
        elif percent_change > 0:
            trend_direction = 'Increasing'
        else:
            trend_direction = 'Decreasing'
        
        trend_summary.append({
            'metric': metric,
            'current_avg': df[metric].mean(),
            'first_30d_avg': first_30_mean,
            'last_30d_avg': last_30_mean,
            'percent_change': percent_change,
            'trend_direction': trend_direction,
            'std_dev': df[metric].std(),
            'min': df[metric].min(),
            'max': df[metric].max()
        })
    
    trend_summary_df = pd.DataFrame(trend_summary)
    logger.info(f"Analyzed trends for {len(trend_summary_df)} metrics")
    
    return trends_data, trend_summary_df


def analyze_lagged_correlations(
    df: pd.DataFrame,
    lag_days: int = 1,
    significance_threshold: float = 0.3
) -> pd.DataFrame:
    """
    Analyze time-lagged correlations (e.g., how yesterday's sleep affects today's behavior).
    
    Parameters:
    - df: DataFrame with health metrics
    - lag_days: Number of days to lag (default: 1 for next-day effects)
    - significance_threshold: Minimum |r| to consider significant
    
    Returns:
    - DataFrame with lagged correlations
    """
    logger.info(f"Analyzing lagged correlations (lag={lag_days} days)")
    
    lagged_correlations = []
    
    # Metrics that might affect behavior (predictors)
    predictor_metrics = ['sleep_hours', 'step_count', 'resting_heart_rate', 
                         'hrv_sdnn', 'active_energy_burned', 'exercise_time_minutes']
    
    # Metrics that might be affected (outcomes)
    outcome_metrics = ['dietary_sugar', 'dietary_energy_consumed', 'step_count', 
                       'exercise_time_minutes', 'resting_heart_rate', 'heart_rate_avg', 'walking_speed']
    
    # Filter to existing columns
    predictor_metrics = [m for m in predictor_metrics if m in df.columns]
    outcome_metrics = [m for m in outcome_metrics if m in df.columns]
    
    for predictor in predictor_metrics:
        for outcome in outcome_metrics:
            if predictor == outcome:  # Skip same metric
                continue
            
            # Create lagged version (shift predictor back by lag_days)
            df_lagged = df[[predictor, outcome]].copy()
            df_lagged[f'{predictor}_lag{lag_days}'] = df_lagged[predictor].shift(lag_days)
            
            # Drop NaN values from lagging
            df_lagged = df_lagged.dropna()
            
            if len(df_lagged) < 10:  # Need minimum data points
                continue
            
            # Calculate correlation between lagged predictor and current outcome
            try:
                r_value, p_value = stats.pearsonr(
                    df_lagged[f'{predictor}_lag{lag_days}'], 
                    df_lagged[outcome]
                )
                
                if abs(r_value) >= significance_threshold and p_value < 0.05:
                    lagged_correlations.append({
                        'predictor': predictor,
                        'outcome': outcome,
                        'lag_days': lag_days,
                        'correlation': r_value,
                        'p_value': p_value,
                        'strength': 'Strong' if abs(r_value) >= 0.5 else 'Moderate',
                        'direction': 'Positive' if r_value > 0 else 'Negative',
                        'interpretation': f"{'Lower' if r_value < 0 else 'Higher'} {predictor.replace('_', ' ')} → {'lower' if r_value < 0 else 'higher'} {outcome.replace('_', ' ')} next day"
                    })
            except Exception as e:
                logger.warning(f"Error calculating lagged correlation for {predictor} -> {outcome}: {e}")
                continue
    
    lagged_df = pd.DataFrame(lagged_correlations)
    if not lagged_df.empty:
        lagged_df = lagged_df.sort_values('correlation', key=abs, ascending=False)
    
    logger.info(f"Found {len(lagged_df)} significant lagged correlations")
    return lagged_df


def detect_sleep_sugar_pattern(
    df: pd.DataFrame,
    sleep_threshold: float = 6.0
) -> Dict:
    """
    Detect the pattern: Poor sleep → increased sugar cravings next day.
    
    Parameters:
    - df: DataFrame with health metrics
    - sleep_threshold: Hours of sleep below which is considered "poor" (default: 6)
    
    Returns:
    - Dictionary with pattern analysis
    """
    logger.info("Detecting sleep-sugar pattern")
    
    if 'sleep_hours' not in df.columns or 'dietary_sugar' not in df.columns:
        return {'pattern_detected': False, 'error': 'Required columns not found'}
    
    # Create a copy with lagged sleep
    df_analysis = df[['date', 'sleep_hours', 'dietary_sugar']].copy()
    df_analysis['sleep_yesterday'] = df_analysis['sleep_hours'].shift(1)
    df_analysis = df_analysis.dropna()
    
    if len(df_analysis) < 10:
        return {'pattern_detected': False, 'error': 'Insufficient data'}
    
    # Categorize sleep quality
    df_analysis['poor_sleep_yesterday'] = df_analysis['sleep_yesterday'] < sleep_threshold
    df_analysis['good_sleep_yesterday'] = df_analysis['sleep_yesterday'] >= sleep_threshold
    
    # Calculate average sugar intake after poor vs good sleep
    sugar_after_poor_sleep = df_analysis[df_analysis['poor_sleep_yesterday']]['dietary_sugar'].mean()
    sugar_after_good_sleep = df_analysis[df_analysis['good_sleep_yesterday']]['dietary_sugar'].mean()
    
    # Calculate percentage increase
    if sugar_after_good_sleep > 0:
        percent_increase = ((sugar_after_poor_sleep - sugar_after_good_sleep) / sugar_after_good_sleep) * 100
    else:
        percent_increase = 0
    
    # Count occurrences
    poor_sleep_days = int(df_analysis['poor_sleep_yesterday'].sum())
    total_days = len(df_analysis)
    
    # Statistical test
    poor_sleep_sugar = df_analysis[df_analysis['poor_sleep_yesterday']]['dietary_sugar']
    good_sleep_sugar = df_analysis[df_analysis['good_sleep_yesterday']]['dietary_sugar']
    
    if len(poor_sleep_sugar) > 0 and len(good_sleep_sugar) > 0:
        try:
            t_stat, p_value = stats.ttest_ind(poor_sleep_sugar, good_sleep_sugar)
            statistically_significant = p_value < 0.05
        except:
            t_stat, p_value = None, None
            statistically_significant = False
    else:
        t_stat, p_value = None, None
        statistically_significant = False
    
    pattern_detected = abs(percent_increase) > 10 and statistically_significant
    
    pattern_results = {
        'pattern_detected': pattern_detected,
        'pattern_type': 'sleep_sugar',
        'sleep_threshold': sleep_threshold,
        'poor_sleep_days': poor_sleep_days,
        'total_days': total_days,
        'sugar_after_poor_sleep': round(sugar_after_poor_sleep, 1) if not pd.isna(sugar_after_poor_sleep) else None,
        'sugar_after_good_sleep': round(sugar_after_good_sleep, 1) if not pd.isna(sugar_after_good_sleep) else None,
        'percent_change': round(percent_increase, 1),
        'p_value': round(p_value, 4) if p_value else None,
        'statistically_significant': statistically_significant,
        'narrative': f"When you sleep less than {sleep_threshold} hours, your sugar intake changes by {percent_increase:+.0f}% the next day."
    }
    
    logger.info(f"Sleep-sugar pattern: {pattern_detected} (p={p_value})")
    return pattern_results


def calculate_baseline_stats(df: pd.DataFrame, metrics: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Calculate baseline statistics for metrics (mean and std).
    Used for z-score calculations in anomaly context analysis.
    
    Parameters:
    - df: DataFrame with health metrics
    - metrics: List of metrics to calculate baselines for
    
    Returns:
    - Dictionary with baseline stats {metric: {'mean': float, 'std': float}}
    """
    baseline_stats = {}
    
    for metric in metrics:
        if metric in df.columns:
            baseline_stats[metric] = {
                'mean': float(df[metric].mean()),
                'std': float(df[metric].std())
            }
    
    return baseline_stats


def analyze_anomaly_context(
    df: pd.DataFrame,
    target_variable: str,
    z_threshold: float = 2.0
) -> Tuple[List[Dict], Dict]:
    """
    When an anomaly occurs in a target variable, identify what other variables
    were unusual to explain WHY the anomaly happened.
    
    Parameters:
    - df: DataFrame with health metrics
    - target_variable: The variable to detect anomalies in (e.g., 'sleep_hours')
    - z_threshold: Z-score threshold for considering a value anomalous (default: 2.0)
    
    Returns:
    - List of anomalies with context
    - Baseline statistics
    """
    logger.info(f"Analyzing anomaly context for {target_variable}")
    
    # Calculate z-scores for all numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Calculate baseline statistics
    baseline_stats = calculate_baseline_stats(df, numeric_cols)
    
    # Calculate z-scores
    z_scores = pd.DataFrame()
    for col in numeric_cols:
        mean = baseline_stats[col]['mean']
        std = baseline_stats[col]['std']
        if std > 0:
            z_scores[col] = (df[col] - mean) / std
        else:
            z_scores[col] = 0.0
    
    # Identify anomalies in target variable
    target_anomalies = abs(z_scores[target_variable]) > z_threshold
    
    # For each anomaly, find what other variables were also anomalous
    anomaly_contexts = []
    
    for idx, is_anomaly in enumerate(target_anomalies):
        if not is_anomaly:
            continue
        
        date = df.loc[idx, 'date'] if 'date' in df.columns else idx
        target_value = df.loc[idx, target_variable]
        target_z = z_scores.loc[idx, target_variable]
        
        # Find all other variables that were also anomalous on this day
        related_anomalies = []
        for col in numeric_cols:
            if col == target_variable:
                continue
            
            z_score = z_scores.loc[idx, col]
            if abs(z_score) > 1.5:  # Lower threshold for related variables
                related_anomalies.append({
                    'variable': col,
                    'value': float(df.loc[idx, col]),
                    'z_score': float(z_score),
                    'deviation': f"{z_score:+.1f}σ",
                    'percent_from_normal': float(((df.loc[idx, col] - baseline_stats[col]['mean']) / baseline_stats[col]['mean'] * 100)) if baseline_stats[col]['mean'] != 0 else 0.0
                })
        
        # Sort by absolute z-score
        related_anomalies.sort(key=lambda x: abs(x['z_score']), reverse=True)
        
        anomaly_contexts.append({
            'date': str(date),
            'target_variable': target_variable,
            'target_value': float(target_value),
            'target_z_score': float(target_z),
            'target_deviation': f"{target_z:+.1f}σ",
            'related_anomalies': related_anomalies[:5],  # Top 5 related variables
            'num_related': len(related_anomalies)
        })
    
    logger.info(f"Found {len(anomaly_contexts)} anomalies with context")
    return anomaly_contexts, baseline_stats

