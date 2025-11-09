"""
Supabase service for all database operations.
"""

from supabase import create_client, Client
from app.config import settings
from typing import List, Dict, Optional
import pandas as pd
from datetime import datetime, timedelta, date
import logging

logger = logging.getLogger(__name__)


class SupabaseService:
    
    def __init__(self):
        """Initialize Supabase client."""
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
        logger.info("Supabase client initialized")
    
    async def get_health_data(
        self, 
        user_id: str, 
        days: int = 90,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> pd.DataFrame:
        """
        Fetch user's health data for ML analysis.
        
        Args:
            user_id: User UUID
            days: Number of days to fetch (default: 90)
            start_date: Optional start date
            end_date: Optional end date
        
        Returns:
            DataFrame with health data
        """
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=days)).date()
            if not end_date:
                end_date = datetime.now().date()
            
            logger.info(f"Fetching health data for user")
            
            response = self.client.table("health_data") \
                .select("*") \
                .eq("user_id", user_id) \
                .gte("date", str(start_date)) \
                .lte("date", str(end_date)) \
                .order("date", desc=False) \
                .execute()
            
            if not response.data:
                logger.warning("No health data found for user")
                return pd.DataFrame()
            
            df = pd.DataFrame(response.data)
            
            # Convert date column to datetime
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
            
            logger.info(f"Retrieved {len(df)} days of health data")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching health data: {e}")
            raise
    
    async def upsert_health_data(
        self, 
        user_id: str, 
        data_date: str, 
        metrics: Dict
    ) -> Dict:
        """
        Insert or update health data for a specific date.
        
        Args:
            user_id: User UUID
            data_date: Date string (YYYY-MM-DD)
            metrics: Dictionary of health metrics
        
        Returns:
            Created/updated record
        """
        try:
            data = {
                "user_id": user_id,
                "date": data_date,
                **metrics
            }
            
            # Check if record exists first
            existing = self.client.table("health_data") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("date", data_date) \
                .execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                # Note: updated_at column doesn't exist in schema, so we only update metrics
                response = self.client.table("health_data") \
                    .update({**metrics}) \
                    .eq("user_id", user_id) \
                    .eq("date", data_date) \
                    .execute()
                logger.info("Updated health data for user")
            else:
                # Insert new record
                response = self.client.table("health_data") \
                    .insert(data) \
                    .execute()
                logger.info("Inserted health data for user")
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error upserting health data: {e}")
            raise
    
    async def batch_upsert_health_data(
        self,
        user_id: str,
        records: List[Dict]
    ) -> List[Dict]:
        """
        Batch upsert multiple health data records.
        
        Args:
            user_id: User UUID
            records: List of dictionaries with date and metrics
        
        Returns:
            List of created/updated records
        """
        try:
            results = []
            for record in records:
                data = {
                    "user_id": user_id,
                    "date": record['date'],
                    **record.get('metrics', {})
                }
                
                # Check if record exists
                existing = self.client.table("health_data") \
                    .select("*") \
                    .eq("user_id", user_id) \
                    .eq("date", record['date']) \
                    .execute()
                
                if existing.data and len(existing.data) > 0:
                    # Update existing
                    # Note: updated_at column doesn't exist in schema, so we only update metrics
                    response = self.client.table("health_data") \
                        .update(record.get('metrics', {})) \
                        .eq("user_id", user_id) \
                        .eq("date", record['date']) \
                        .execute()
                else:
                    # Insert new
                    response = self.client.table("health_data") \
                        .insert(data) \
                        .execute()
                
                if response.data:
                    results.extend(response.data)
            
            logger.info(f"Batch upserted {len(results)} health records")
            return results
            
        except Exception as e:
            logger.error(f"Error batch upserting health data: {e}")
            raise
    
    async def store_anomaly(self, user_id: str, anomaly_data: Dict) -> Dict:
        """Store detected anomaly."""
        try:
            data = {
                "user_id": user_id,
                **anomaly_data,
                "created_at": datetime.now().isoformat()
            }
            
            response = self.client.table("anomalies").insert(data).execute()
            logger.info("Stored anomaly for user")
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error storing anomaly: {e}")
            raise
    
    async def store_correlation(self, user_id: str, correlation_data: Dict) -> Dict:
        """Store detected correlation."""
        try:
            data = {
                "user_id": user_id,
                **correlation_data,
                "detected_at": datetime.now().isoformat()
            }
            
            # Check if this correlation already exists
            existing = self.client.table("correlations") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("metric_a", correlation_data['metric_a']) \
                .eq("metric_b", correlation_data['metric_b']) \
                .eq("is_active", True) \
                .execute()
            
            if existing.data:
                # Update existing
                response = self.client.table("correlations") \
                    .update({
                        **correlation_data,
                        "last_verified_at": datetime.now().isoformat()
                    }) \
                    .eq("id", existing.data[0]['id']) \
                    .execute()
            else:
                # Insert new
                response = self.client.table("correlations").insert(data).execute()
            
            logger.info(f"Stored correlation: {correlation_data['metric_a']} <-> {correlation_data['metric_b']}")
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error storing correlation: {e}")
            raise
    
    async def store_pattern(self, user_id: str, pattern_data: Dict) -> Dict:
        """Store detected behavioral pattern."""
        try:
            data = {
                "user_id": user_id,
                **pattern_data,
                "detected_at": datetime.now().isoformat(),
                "is_active": True
            }
            
            # Check if this pattern already exists
            existing = self.client.table("patterns") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("pattern_type", pattern_data['pattern_type']) \
                .eq("is_active", True) \
                .execute()
            
            if existing.data:
                # Update existing pattern
                response = self.client.table("patterns") \
                    .update({
                        **pattern_data,
                        "last_verified_at": datetime.now().isoformat(),
                        "verification_count": existing.data[0].get('verification_count', 1) + 1
                    }) \
                    .eq("id", existing.data[0]['id']) \
                    .execute()
            else:
                # Insert new pattern
                response = self.client.table("patterns").insert(data).execute()
            
            logger.info(f"Stored pattern: {pattern_data['pattern_type']}")
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error storing pattern: {e}")
            raise
    
    async def create_insight(self, user_id: str, insight_data: Dict) -> Dict:
        """Create AI-generated insight."""
        try:
            data = {
                "user_id": user_id,
                **insight_data,
                "created_at": datetime.now().isoformat(),
                "is_read": False,
                "is_dismissed": False
            }
            
            response = self.client.table("insights").insert(data).execute()
            logger.info(f"Created insight: {insight_data.get('title')}")
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error creating insight: {e}")
            raise
    
    async def get_insights(
        self, 
        user_id: str, 
        insight_type: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """
        Fetch user's insights.
        
        Args:
            user_id: User UUID
            insight_type: Filter by type (optional)
            unread_only: Only return unread insights
            limit: Maximum number of insights to return
        
        Returns:
            List of insights
        """
        try:
            query = self.client.table("insights") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("is_dismissed", False)
            
            if insight_type:
                query = query.eq("insight_type", insight_type)
            
            if unread_only:
                query = query.eq("is_read", False)
            
            response = query.order("priority", desc=True) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            logger.info(f"Retrieved {len(response.data)} insights")
            return response.data
            
        except Exception as e:
            logger.error(f"Error fetching insights: {e}")
            raise
    
    async def mark_insight_as_read(self, insight_id: str) -> Dict:
        """Mark insight as read."""
        try:
            response = self.client.table("insights") \
                .update({"is_read": True}) \
                .eq("id", insight_id) \
                .execute()
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error marking insight as read: {e}")
            raise
    
    async def get_user_baselines(self, user_id: str) -> Optional[Dict]:
        """Get user's latest baselines."""
        try:
            response = self.client.table("user_baselines") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("calculation_date", desc=True) \
                .limit(1) \
                .execute()
            
            if response.data:
                logger.info("Retrieved baselines for user")
                return response.data[0]
            
            logger.warning("No baselines found for user")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching baselines: {e}")
            raise
    
    async def store_baselines(self, user_id: str, baselines: Dict) -> Dict:
        """Store calculated baselines."""
        try:
            data = {
                "user_id": user_id,
                **baselines,
                "calculation_date": datetime.now().date().isoformat(),
                "created_at": datetime.now().isoformat()
            }
            
            response = self.client.table("user_baselines").insert(data).execute()
            logger.info("Stored baselines for user")
            
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error storing baselines: {e}")
            raise
    
    async def log_ml_analysis(
        self,
        user_id: str,
        analysis_type: str,
        results_summary: Dict,
        days_analyzed: int,
        execution_time_ms: int
    ) -> Dict:
        """Log ML analysis run for audit trail."""
        try:
            data = {
                "user_id": user_id,
                "analysis_type": analysis_type,
                "analysis_date": datetime.now().date().isoformat(),
                "days_analyzed": days_analyzed,
                "results_summary": results_summary,
                "execution_time_ms": execution_time_ms,
                "data_points_analyzed": days_analyzed,
                "status": "completed",
                "created_at": datetime.now().isoformat()
            }
            
            response = self.client.table("ml_analyses").insert(data).execute()
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error logging ML analysis: {e}")
            raise


# Singleton instance
supabase_service = SupabaseService()

