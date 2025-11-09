"""
Health Data API endpoints - for syncing and retrieving health data.
"""

from fastapi import APIRouter, HTTPException, status
from app.models.schemas import HealthDataSync, HealthDataResponse
from app.services.supabase_service import supabase_service
from typing import Optional, List
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{user_id}/sync", status_code=status.HTTP_201_CREATED)
async def sync_health_data(user_id: str, data: HealthDataSync):
    """
    Sync health data for a specific date.
    
    This endpoint allows the mobile app to sync today's HealthKit data.
    If data for this date already exists, it will be updated.
    
    Args:
        user_id: User UUID
        data: Health data with date and metrics
    
    Returns:
        Created/updated health data record
    """
    try:
        logger.info(f"Syncing health data for user {user_id}, date {data.date}")
        
        # metrics is already a dict
        result = await supabase_service.upsert_health_data(
            user_id=user_id,
            data_date=str(data.date),
            metrics={**data.metrics, "source": data.source}
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to sync health data"
            )
        
        return {
            "user_id": user_id,
            "date": str(data.date),
            "success": True,
            "message": "Health data synced successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing health data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing health data: {str(e)}"
        )


@router.post("/{user_id}/batch-sync", status_code=status.HTTP_201_CREATED)
async def batch_sync_health_data(user_id: str, records: List[HealthDataSync]):
    """
    Batch sync multiple days of health data.
    
    Useful for initial sync or syncing multiple days at once.
    
    Args:
        user_id: User UUID
        records: List of health data records
    
    Returns:
        Summary of synced records
    """
    try:
        logger.info(f"Batch syncing {len(records)} records for user {user_id}")
        
        # Convert records to format expected by service
        formatted_records = []
        for record in records:
            formatted_records.append({
                "date": str(record.date),
                "metrics": {**record.metrics, "source": record.source}
            })
        
        results = await supabase_service.batch_upsert_health_data(user_id, formatted_records)
        
        return {
            "user_id": user_id,
            "synced_count": len(results),
            "date_range": {
                "start": str(min(r.date for r in records)),
                "end": str(max(r.date for r in records))
            }
        }
        
    except Exception as e:
        logger.error(f"Error batch syncing health data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error batch syncing health data: {str(e)}"
        )


@router.get("/{user_id}")
async def get_health_data(
    user_id: str,
    days: Optional[int] = 90,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """
    Retrieve health data for a user.
    
    Args:
        user_id: User UUID
        days: Number of days to retrieve (default: 90)
        start_date: Optional start date filter
        end_date: Optional end date filter
    
    Returns:
        List of health data records
    """
    try:
        logger.info(f"Fetching health data for user {user_id}")
        
        df = await supabase_service.get_health_data(
            user_id=user_id,
            days=days,
            start_date=start_date,
            end_date=end_date
        )
        
        if df.empty:
            return {
                "user_id": user_id,
                "count": 0,
                "data": []
            }
        
        # Convert DataFrame to list of dicts
        records = df.to_dict('records')
        
        # Convert dates to strings
        for record in records:
            if 'date' in record:
                record['date'] = str(record['date'].date())
        
        return {
            "user_id": user_id,
            "count": len(records),
            "date_range": {
                "start": records[0]['date'] if records else None,
                "end": records[-1]['date'] if records else None
            },
            "data": records
        }
        
    except Exception as e:
        logger.error(f"Error fetching health data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching health data: {str(e)}"
        )


@router.delete("/{user_id}/date/{data_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_health_data(user_id: str, data_date: date):
    """
    Delete health data for a specific date.
    
    Args:
        user_id: User UUID
        data_date: Date to delete
    """
    try:
        logger.info(f"Deleting health data for user {user_id}, date {data_date}")
        
        # Note: You'll need to implement this in supabase_service if needed
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Delete functionality not yet implemented"
        )
        
    except Exception as e:
        logger.error(f"Error deleting health data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting health data: {str(e)}"
        )

