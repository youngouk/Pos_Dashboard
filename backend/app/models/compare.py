## compare.py

from pydantic import BaseModel, ConfigDict, Field
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import date

# 비교 대상 유형 정의
class BenchmarkType(str, Enum):
    """
    비교 대상 유형을 정의하는 Enum 클래스
    """
    ALL = "all"              # 전체 매장 평균
    TOP_25 = "top_25"        # 상위 25% 매장
    BOTTOM_25 = "bottom_25"  # 하위 25% 매장
    SIMILAR = "similar"      # 유사 상권 매장

# 필터 파라미터 모델
class CompareFilterParams(BaseModel):
    """
    매장 비교 필터링을 위한 파라미터 모델
    """
    start_date: date
    end_date: date
    store_name: str
    benchmark_type: Optional[BenchmarkType] = BenchmarkType.ALL
    metrics: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)

# 매장 지표 모델
class StoreMetrics(BaseModel):
    """
    매장별 성과 지표 모델
    """
    store_name: str
    total_sales: float
    transaction_count: int
    avg_transaction: float
    discount_rate: float
    avg_daily_sales: float
    
    model_config = ConfigDict(from_attributes=True)

# 비교 지표 모델
class ComparisonMetric(BaseModel):
    """
    비교 지표 결과 모델
    """
    metric_name: str
    display_name: str
    store_value: float
    benchmark_value: float
    difference: float
    percent_difference: float
    is_positive: bool
    
    model_config = ConfigDict(from_attributes=True)

# 지표 비교 모델
class MetricComparison(BaseModel):
    """
    단일 지표에 대한 매장 비교 결과 모델
    """
    metric_name: str
    metric_display_name: str
    store_value: float
    benchmark_value: float
    difference: float
    difference_percent: float
    is_positive: bool  # 차이가 긍정적인지 여부 (높을수록 좋은 지표냐에 따라 다름)
    
    model_config = ConfigDict(from_attributes=True)

# 매장 비교 응답 모델
class StoreComparisonResponse(BaseModel):
    """
    매장 비교 분석 응답 모델
    """
    store_name: str
    period: Optional[str] = None  # 분석 기간 (예: "2023-01-01 ~ 2023-01-31")
    benchmark_type: BenchmarkType
    metrics: List[ComparisonMetric]
    insights: Optional[List[str]] = []
    detailed_metrics: Optional[Dict[str, List[Dict[str, Any]]]] = None  # 추가 상세 비교 데이터 (필요시)
    
    model_config = ConfigDict(from_attributes=True)

# 상위 매장 항목 모델
class TopPerformer(BaseModel):
    """
    상위 성과 매장 항목 모델
    """
    store_name: str
    metric_value: float
    rank: int
    
    model_config = ConfigDict(from_attributes=True)

# 상위 매장 응답 모델
class TopPerformerResponse(BaseModel):
    """
    상위 성과 매장 응답 모델
    """
    metric_name: str
    metric_display_name: str
    period: str  # 분석 기간
    performers: List[TopPerformer]
    
    model_config = ConfigDict(from_attributes=True) 