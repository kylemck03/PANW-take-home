"""
Analytics API endpoints - for running ML analyses.
"""

from fastapi import APIRouter, HTTPException, status, Query
from app.services.ml_service import ml_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{user_id}/analyze")
async def run_full_analysis(
    user_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze")
):
    """
    Run complete ML analysis pipeline for a user.
    
    This endpoint runs:
    - Correlation analysis
    - Anomaly detection
    - Trend analysis
    - Pattern detection (sleep-sugar, etc.)
    
    Results are stored in the database and returned.
    
    Args:
        user_id: User UUID
        days: Number of days to analyze (7-365, default: 90)
    
    Returns:
        Complete analysis results
    """
    try:
        logger.info(f"Starting full analysis for user {user_id} ({days} days)")
        
        results = await ml_service.run_full_analysis(user_id, days=days)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in full analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running analysis: {str(e)}"
        )


@router.get("/{user_id}/correlations")
async def get_correlations(
    user_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze")
):
    """
    Get correlation analysis results.
    
    Analyzes relationships between health metrics using Pearson correlation.
    
    Args:
        user_id: User UUID
        days: Number of days to analyze
    
    Returns:
        List of significant correlations
    """
    try:
        results = await ml_service.analyze_correlations_only(user_id, days=days)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in correlation analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing correlations: {str(e)}"
        )


@router.get("/{user_id}/anomalies")
async def get_anomalies(
    user_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze")
):
    """
    Detect anomalies in health data.
    
    Uses Isolation Forest algorithm to detect unusual patterns.
    
    Args:
        user_id: User UUID
        days: Number of days to analyze
    
    Returns:
        List of detected anomalies
    """
    try:
        results = await ml_service.detect_anomalies_only(user_id, days=days)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in anomaly detection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting anomalies: {str(e)}"
        )


@router.get("/{user_id}/anomalies/explained")
async def get_anomalies_explained(
    user_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze"),
    user_name: Optional[str] = Query(None, description="User name for personalization")
):
    """
    Get detailed AI-generated explanation of all detected anomalies.
    
    Analyzes all anomalies together to identify patterns, provide context,
    and offer actionable insights.
    
    Args:
        user_id: User UUID
        days: Number of days to analyze
        user_name: Optional user name for personalization
    
    Returns:
        Comprehensive anomaly analysis with AI-generated explanations
    """
    try:
        from app.services.openai_service import openai_service
        
        # Get anomalies
        anomaly_results = await ml_service.detect_anomalies_only(user_id, days=days)
        
        if "error" in anomaly_results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=anomaly_results["error"]
            )
        
        anomalies = anomaly_results.get('anomalies', [])
        
        # Get health summary for context
        health_summary = await ml_service.get_health_summary(user_id, days=7)
        
        # Get trends for context
        trend_results = await ml_service.analyze_trends_only(user_id, days=days)
        trends = trend_results.get('trends', []) if 'error' not in trend_results else []
        
        # Convert anomaly dates to strings for JSON serialization
        def convert_date(date_val):
            """Convert date to string, handling pandas Timestamp objects."""
            if date_val is None:
                return ''
            if hasattr(date_val, 'strftime'):  # pandas Timestamp or datetime
                return date_val.strftime('%Y-%m-%d')
            elif isinstance(date_val, str):
                return date_val
            else:
                return str(date_val)
        
        # Convert dates in anomalies list
        converted_anomalies = []
        for anomaly in anomalies:
            converted_anomaly = anomaly.copy()
            if 'date' in converted_anomaly:
                converted_anomaly['date'] = convert_date(converted_anomaly['date'])
            converted_anomalies.append(converted_anomaly)
        
        # Generate comprehensive AI explanation
        explanation = await openai_service.explain_all_anomalies(
            anomalies=converted_anomalies,
            health_summary=health_summary if 'error' not in health_summary else {},
            trends=trends,
            user_name=user_name or "there"
        )
        
        # Return only the LLM-generated explanation
        return {
            "explanation": explanation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating anomaly explanation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating anomaly explanation: {str(e)}"
        )


@router.get("/{user_id}/trends")
async def get_trends(
    user_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze")
):
    """
    Analyze health trends over time.
    
    Calculates rolling averages and trend directions for key metrics.
    
    Args:
        user_id: User UUID
        days: Number of days to analyze
    
    Returns:
        Trend analysis results
    """
    try:
        results = await ml_service.analyze_trends_only(user_id, days=days)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in trend analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing trends: {str(e)}"
        )


@router.get("/{user_id}/summary")
async def get_health_summary(
    user_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of recent days to summarize")
):
    """
    Get health summary for recent days.
    
    Useful for generating daily insights.
    
    Args:
        user_id: User UUID
        days: Number of recent days (default: 7)
    
    Returns:
        Health summary with averages
    """
    try:
        results = await ml_service.get_health_summary(user_id, days=days)
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting health summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting health summary: {str(e)}"
        )


@router.get("/{user_id}/baselines")
async def get_user_baselines(user_id: str):
    """
    Get user's personalized baselines.
    
    Baselines are calculated from rolling 90-day averages and used for
    anomaly detection.
    
    Args:
        user_id: User UUID
    
    Returns:
        User's baselines or 404 if not calculated yet
    """
    try:
        from app.services.supabase_service import supabase_service
        
        baselines = await supabase_service.get_user_baselines(user_id)
        
        if not baselines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Baselines not yet calculated. Run a full analysis first."
            )
        
        return baselines
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching baselines: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching baselines: {str(e)}"
        )

