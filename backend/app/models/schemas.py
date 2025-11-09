"""
Pydantic schemas for request/response validation.
Simplified to avoid recursion errors.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import date as DateType, datetime
from enum import Enum


class HealthDataSync(BaseModel):
    """Request body for syncing health data."""
    model_config = ConfigDict()
    
    date: DateType = Field(..., description="Date of the health data")
    metrics: Dict[str, Any] = Field(..., description="Health metrics as dictionary")
    source: str = Field(default="healthkit", description="Data source")


class AnalysisType(str, Enum):
    """Type of ML analysis."""
    FULL = "full"
    CORRELATION = "correlation"
    ANOMALY = "anomaly"
    TREND = "trend"
    PATTERN = "pattern"


class AnalysisRequest(BaseModel):
    """Request for ML analysis."""
    model_config = ConfigDict(from_attributes=True)
    
    days: int = Field(90, ge=7, le=365, description="Number of days to analyze")
    analysis_type: AnalysisType = Field(AnalysisType.FULL, description="Type of analysis")


class InsightType(str, Enum):
    """Type of insight."""
    DAILY = "daily"
    WEEKLY = "weekly"
    ANOMALY = "anomaly"
    PATTERN = "pattern"
    PREDICTION = "prediction"


class ErrorResponse(BaseModel):
    """Error response."""
    model_config = ConfigDict(from_attributes=True)
    
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# Simplified response models to avoid recursion
class HealthDataResponse(BaseModel):
    """Response for health data operations."""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: str
    date: str
    success: bool = True
    message: Optional[str] = None


# For backward compatibility
HealthMetrics = Dict[str, Any]
