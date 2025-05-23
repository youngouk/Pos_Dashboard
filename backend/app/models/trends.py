from datetime import date, datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# 시계열 데이터 포인트 모델
class TimeSeriesPoint(BaseModel):
    """시계열 데이터 포인트 모델"""
    date: date
    value: float
    
# 예측 데이터 포인트 모델
class ForecastPoint(BaseModel):
    """예측 데이터 포인트 모델"""
    date: date
    value: float
    upper_bound: Optional[float] = None
    lower_bound: Optional[float] = None

# 시계열 트렌드 응답 모델
class TimeSeriesResponse(BaseModel):
    """시계열 트렌드 응답 모델"""
    metric: str
    actual_data: List[TimeSeriesPoint]
    trend_type: str = "linear"  # linear, seasonal, cyclical
    trend_info: Optional[Dict[str, Any]] = None

# 예측 응답 모델
class ForecastResponse(BaseModel):
    """예측 응답 모델"""
    metric: str
    historical_data: List[TimeSeriesPoint]
    forecast_data: List[ForecastPoint]
    forecast_info: Optional[Dict[str, Any]] = None
    
# 계절성 분석 응답 모델
class SeasonalityResponse(BaseModel):
    """계절성 분석 응답 모델"""
    period_type: str  # daily, weekly, monthly
    seasonal_components: List[Dict[str, float]]
    strength: float = 0.0
    insights: List[str] = []

# 트렌드 필터 파라미터 모델
class TrendFilterParams(BaseModel):
    """트렌드 데이터 필터링 파라미터 모델"""
    start_date: date
    end_date: date
    store_name: Optional[List[str]] = None
    metric: Optional[str] = None
    forecast_days: Optional[int] = 30 