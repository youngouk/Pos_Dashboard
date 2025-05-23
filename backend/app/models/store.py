from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime


class StoreBase(BaseModel):
    """매장 기본 정보 모델"""
    name: str = Field(..., description="매장 이름")
    location: str = Field(..., description="매장 위치")
    area_type: str = Field(..., description="상권 유형 (주거지역, 상업지역, 오피스, 복합 등)")
    size: float = Field(..., description="매장 크기 (제곱미터)")
    opening_date: date = Field(..., description="매장 오픈일")


class Store(StoreBase):
    """매장 전체 정보 모델"""
    id: int = Field(..., description="매장 ID")
    status: str = Field("active", description="매장 상태 (active, inactive)")
    store_type: str = Field(..., description="매장 유형 (직영, 가맹)")
    average_daily_sales: Optional[float] = Field(None, description="일평균 매출")
    average_daily_customers: Optional[int] = Field(None, description="일평균 고객 수")
    last_updated: datetime = Field(..., description="정보 최종 업데이트 시간")


class StoreCreate(StoreBase):
    """매장 생성 모델"""
    store_type: str = Field(..., description="매장 유형 (직영, 가맹)")


class StoreUpdate(BaseModel):
    """매장 정보 업데이트 모델"""
    name: Optional[str] = None
    location: Optional[str] = None
    area_type: Optional[str] = None
    size: Optional[float] = None
    status: Optional[str] = None
    store_type: Optional[str] = None


class StoreListResponse(BaseModel):
    """매장 목록 응답 모델"""
    name: str = Field(..., description="매장 이름")
    
    def __eq__(self, other):
        if isinstance(other, StoreListResponse):
            return self.name == other.name
        return False
        
    def __hash__(self):
        return hash(self.name)


class StoreSummary(BaseModel):
    """매장 요약 정보 모델"""
    total_sales: float = Field(0.0, description="총 매출")
    transaction_count: int = Field(0, description="거래 건수")
    average_transaction: float = Field(0.0, description="평균 거래액")


class StoreDetailResponse(BaseModel):
    """매장 상세 정보 응답 모델"""
    name: str = Field(..., description="매장 이름")
    sales_summary: Optional[StoreSummary] = Field(None, description="매출 요약 정보")
    customer_summary: Optional[Dict[str, Any]] = Field(None, description="고객 요약 정보")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="주요 성과 지표") 