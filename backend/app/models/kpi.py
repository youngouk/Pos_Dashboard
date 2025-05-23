## kpi.py

from datetime import date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# KPI 요약 응답 모델
class KPISummary(BaseModel):
    """KPI 요약 데이터 모델 - 핵심 성과 지표"""
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    total_sales: int = 0
    average_daily_sales: float = 0
    total_transactions: int = 0
    average_transaction_value: float = 0
    total_customers: int = 0
    total_discount_amount: int = 0
    discount_rate: float = 0

# KPI 트렌드 포인트 모델
class KPITrendPoint(BaseModel):
    """KPI 트렌드 데이터 포인트 모델"""
    date: date
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    value: float

# KPI 트렌드 응답 모델
class KPITrend(BaseModel):
    """KPI 트렌드 응답 모델"""
    metric: str
    data: List[KPITrendPoint]
    trend_info: Optional[Dict[str, Any]] = None

# 제품 KPI 모델
class ProductKPI(BaseModel):
    """제품별 KPI 모델"""
    product_name: str
    product_code: Optional[str] = None
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    quantity: int = 0
    total_sales: int = 0
    sales_percentage: float = 0
    average_price: float = 0
    discount_amount: int = 0
    discount_rate: float = 0

# 제품 카테고리 KPI 모델
class CategoryKPI(BaseModel):
    """제품 카테고리별 KPI 모델"""
    category: str
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    product_count: int = 0
    total_sales: int = 0
    sales_percentage: float = 0
    average_price: float = 0

# KPI 필터 파라미터 모델
class KPIFilterParams(BaseModel):
    """KPI 데이터 필터링 파라미터 모델"""
    start_date: date
    end_date: date
    store_name: Optional[List[str]] = None
    metric: Optional[str] = None
    top_n: Optional[int] = 10
