## analytics.py

from datetime import date, datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# 이상치 데이터 포인트 모델
class AnomalyPoint(BaseModel):
    """이상치 데이터 포인트 모델"""
    date: date
    value: float
    expected_value: float
    z_score: float
    is_anomaly: bool = False

# 이상치 감지 응답 모델
class AnomalyResponse(BaseModel):
    """이상치 감지 응답 모델"""
    metric: str
    data: List[AnomalyPoint]
    anomaly_count: int
    method: str = "z_score"
    threshold: float = 3.0

# 상관관계 데이터 포인트 모델
class CorrelationPoint(BaseModel):
    """상관관계 데이터 포인트 모델"""
    variable1: str
    variable2: str
    correlation: float
    p_value: Optional[float] = None
    significance: bool = False

# 상관관계 응답 모델
class CorrelationResponse(BaseModel):
    """상관관계 분석 응답 모델"""
    method: str = "pearson"
    data: List[CorrelationPoint]
    matrix: Dict[str, Dict[str, float]]
    insights: List[str] = []

# 패턴 데이터 포인트 모델
class PatternPoint(BaseModel):
    """패턴 데이터 포인트 모델"""
    x: Union[str, int, date]  # x축 값 (시간, 카테고리 등)
    y: float  # y축 값 (매출, 고객 수 등)
    group: Optional[str] = None  # 그룹화 필드 (제품, 매장 등)

# 패턴 분석 응답 모델
class PatternResponse(BaseModel):
    """패턴 분석 응답 모델"""
    pattern_type: str  # 패턴 유형 (시간대별, 요일별, 제품별 등)
    data: List[PatternPoint]
    insights: List[str] = []

# 분석 필터 파라미터 모델
class AnalyticsFilterParams(BaseModel):
    """분석 데이터 필터링 파라미터 모델"""
    start_date: date
    end_date: date
    store_name: Optional[List[str]] = None
    metric: Optional[str] = None
    pattern_type: Optional[str] = None
    variables: Optional[List[str]] = None
    threshold: Optional[float] = None
