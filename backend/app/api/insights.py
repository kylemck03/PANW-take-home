"""
Insights API endpoints - for AI-generated health insights.
"""

from fastapi import APIRouter, HTTPException, status, Query
from app.services.openai_service import openai_service
from app.services.ml_service import ml_service
from app.services.supabase_service import supabase_service
from typing import Optional
from datetime import date
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{user_id}/daily")
async def get_daily_insights(user_id: str, user_name: Optional[str] = None):
    """
    Generate daily health insights using GPT-4.
    
    Analyzes yesterday's health data and provides actionable insights.
    
    Args:
        user_id: User UUID
        user_name: Optional user name for personalization
    
    Returns:
        AI-generated daily insights
    """
    try:
        logger.info(f"Generating daily insights for user {user_id}")
        
        # Get recent health summary (last 7 days for context)
        health_summary = await ml_service.get_health_summary(user_id, days=7)
        
        if "error" in health_summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=health_summary["error"]
            )
        
        # Generate AI insights
        insights_text = await openai_service.generate_daily_insights(
            health_summary=health_summary,
            user_name=user_name or "there"
        )
        
        # Store insight in database
        insight = await supabase_service.create_insight(user_id, {
            "insight_type": "daily",
            "title": "Your Daily Health Snapshot",
            "narrative": insights_text,
            "summary": insights_text[:200] + "..." if len(insights_text) > 200 else insights_text,
            "severity": "info",
            "priority": 8,
            "related_date": str(date.today())
        })
        
        return {
            "user_id": user_id,
            "type": "daily",
            "date": str(date.today()),
            "insights": insights_text,
            "insight_id": insight['id'] if insight else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating daily insights: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating insights: {str(e)}"
        )


@router.get("/{user_id}/weekly")
async def get_weekly_digest(user_id: str, user_name: Optional[str] = None):
    """
    Generate comprehensive weekly health digest.
    
    Analyzes the past week including trends, correlations, and anomalies.
    
    Args:
        user_id: User UUID
        user_name: Optional user name for personalization
    
    Returns:
        AI-generated weekly digest
    """
    try:
        logger.info(f"Generating weekly digest for user {user_id}")
        
        # Get weekly summary
        health_summary = await ml_service.get_health_summary(user_id, days=7)
        
        if "error" in health_summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=health_summary["error"]
            )
        
        # Get analysis results (run if needed)
        analysis_results = await ml_service.run_full_analysis(user_id, days=30)
        
        if "error" in analysis_results:
            correlations = []
            anomalies = []
            trends = []
        else:
            correlations = analysis_results.get('correlations', [])[:5]
            anomalies = analysis_results.get('anomalies', [])
            trends = analysis_results.get('trends', [])[:5]
        
        # Generate AI digest
        digest_text = await openai_service.generate_weekly_digest(
            health_summary=health_summary,
            correlations=correlations,
            anomalies=anomalies,
            trends=trends,
            user_name=user_name or "there"
        )
        
        # Store insight in database
        insight = await supabase_service.create_insight(user_id, {
            "insight_type": "weekly",
            "title": "Your Weekly Health Digest",
            "narrative": digest_text,
            "summary": digest_text[:250] + "..." if len(digest_text) > 250 else digest_text,
            "severity": "info",
            "priority": 9,
            "related_date": str(date.today()),
            "recommendations": [
                {"type": "weekly_summary", "data": health_summary}
            ]
        })
        
        return {
            "user_id": user_id,
            "type": "weekly",
            "date": str(date.today()),
            "digest": digest_text,
            "insight_id": insight['id'] if insight else None,
            "summary_data": {
                "correlations_count": len(correlations),
                "anomalies_count": len(anomalies),
                "trends_count": len(trends)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating weekly digest: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating weekly digest: {str(e)}"
        )


@router.get("/{user_id}/feed")
async def get_insights_feed(
    user_id: str,
    insight_type: Optional[str] = Query(None, description="Filter by insight type"),
    unread_only: bool = Query(False, description="Only show unread insights"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of insights")
):
    """
    Get insights feed for user.
    
    Returns all insights sorted by priority and date.
    
    Args:
        user_id: User UUID
        insight_type: Optional filter by type (daily, weekly, anomaly, pattern)
        unread_only: Only return unread insights
        limit: Maximum number of insights to return
    
    Returns:
        List of insights
    """
    try:
        insights = await supabase_service.get_insights(
            user_id=user_id,
            insight_type=insight_type,
            unread_only=unread_only,
            limit=limit
        )
        
        # Calculate counts
        total_count = len(insights)
        unread_count = sum(1 for i in insights if not i.get('is_read', False))
        
        return {
            "user_id": user_id,
            "total_count": total_count,
            "unread_count": unread_count,
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Error fetching insights feed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching insights: {str(e)}"
        )


@router.get("/{user_id}/decisions")
async def get_actionable_decisions(user_id: str, user_name: Optional[str] = None):
    """
    Generate specific, decision-focused insights to help users make informed health decisions.
    
    Provides actionable recommendations with clear decision points, expected outcomes,
    and decision frameworks based on their health data.
    
    Args:
        user_id: User UUID
        user_name: Optional user name for personalization
    
    Returns:
        AI-generated decision-focused insights
    """
    try:
        logger.info(f"Generating actionable decisions for user {user_id}")
        
        # Get recent health summary
        health_summary = await ml_service.get_health_summary(user_id, days=7)
        
        if "error" in health_summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=health_summary["error"]
            )
        
        # Get full analysis results for trends, patterns, correlations, and anomalies
        analysis_results = await ml_service.run_full_analysis(user_id, days=30)
        
        if "error" in analysis_results:
            trends = []
            patterns = {}
            correlations = []
            anomalies = []
        else:
            trends = analysis_results.get('trends', [])
            patterns = analysis_results.get('patterns', {})
            correlations = analysis_results.get('correlations', [])[:5]
            anomalies = analysis_results.get('anomalies', [])
        
        # Generate AI decision-focused insights
        decisions_text = await openai_service.generate_actionable_decisions(
            health_summary=health_summary,
            trends=trends,
            patterns=patterns,
            correlations=correlations,
            anomalies=anomalies,
            user_name=user_name or "there"
        )
        
        # Store insight in database
        insight = await supabase_service.create_insight(user_id, {
            "insight_type": "decision",
            "title": "Your Health Decision Guide",
            "narrative": decisions_text,
            "summary": decisions_text[:200] + "..." if len(decisions_text) > 200 else decisions_text,
            "severity": "info",
            "priority": 9,
            "related_date": str(date.today())
        })
        
        return {
            "decisions": decisions_text
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating actionable decisions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating decisions: {str(e)}"
        )


@router.get("/{user_id}/tomorrow")
async def get_tomorrow_prediction(user_id: str, user_name: Optional[str] = None):
    """
    Generate predictive insights about what to expect tomorrow.
    
    Analyzes recent health data, trends, patterns, and correlations to predict
    what the user should expect and prepare for tomorrow.
    
    Args:
        user_id: User UUID
        user_name: Optional user name for personalization
    
    Returns:
        AI-generated prediction for tomorrow with actionable insights
    """
    try:
        logger.info(f"Generating tomorrow prediction for user {user_id}")
        
        # Get recent health summary (last 7 days)
        health_summary = await ml_service.get_health_summary(user_id, days=7)
        
        if "error" in health_summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=health_summary["error"]
            )
        
        # Get analysis results to extract trends, patterns, and correlations
        analysis_results = await ml_service.run_full_analysis(user_id, days=30)
        
        if "error" in analysis_results:
            # If full analysis fails, try to get at least trends
            trends = []
            patterns = {}
            correlations = []
        else:
            trends = analysis_results.get('trends', [])
            patterns = analysis_results.get('patterns', {})
            correlations = analysis_results.get('correlations', [])[:5]  # Top 5 for context
        
        # Generate AI prediction
        prediction_text = await openai_service.generate_tomorrow_prediction(
            health_summary=health_summary,
            trends=trends,
            patterns=patterns,
            correlations=correlations,
            user_name=user_name or "there"
        )
        
        # Store insight in database
        insight = await supabase_service.create_insight(user_id, {
            "insight_type": "prediction",
            "title": "What to Expect Tomorrow",
            "narrative": prediction_text,
            "summary": prediction_text[:200] + "..." if len(prediction_text) > 200 else prediction_text,
            "severity": "info",
            "priority": 7,
            "related_date": str(date.today())
        })
        
        return {
            "user_id": user_id,
            "type": "tomorrow_prediction",
            "date": str(date.today()),
            "prediction": prediction_text,
            "insight_id": insight['id'] if insight else None,
            "based_on": {
                "days_analyzed": health_summary.get('days', 7),
                "trends_count": len(trends),
                "patterns_detected": sum(1 for p in patterns.values() if isinstance(p, dict) and p.get('pattern_detected')),
                "correlations_count": len(correlations)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating tomorrow prediction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating prediction: {str(e)}"
        )


@router.patch("/{user_id}/mark-read/{insight_id}", status_code=status.HTTP_200_OK)
async def mark_insight_as_read(user_id: str, insight_id: str):
    """
    Mark an insight as read.
    
    Args:
        user_id: User UUID
        insight_id: Insight UUID
    
    Returns:
        Updated insight
    """
    try:
        result = await supabase_service.mark_insight_as_read(insight_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Insight not found"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking insight as read: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating insight: {str(e)}"
        )

