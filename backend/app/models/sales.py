## sales.py

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# 영수증 상세 데이터 모델
class ReceiptSalesDetail(BaseModel):
    """영수증 상세 판매 데이터 모델"""
    id: int
    date: Optional[date] = None
    pos_number: Optional[str] = None
    receipt_number: Optional[str] = None
    payment_type: Optional[str] = None
    table_name: Optional[str] = None
    first_order: Optional[datetime] = None
    payment_time: Optional[datetime] = None
    product_code: Optional[str] = None
    barcode: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    total_sales: Optional[int] = None
    erp_mapping_code: Optional[str] = None
    note: Optional[str] = None
    discount_amount: Optional[int] = None
    discount_type: Optional[str] = None
    actual_sales: Optional[int] = None
    price: Optional[int] = None
    vat: Optional[int] = None
    created_at: Optional[datetime] = None
    store_name: Optional[str] = None

    class Config:
        """
        Pydantic 모델 설정
        ORM 모드 활성화로 ORM 객체를 직접 모델에 변환할 수 있음
        """
        from_attributes = True

# 일별 매출 요약 데이터 모델
class DailySalesSummary(BaseModel):
    """일별 매출 요약 데이터 모델"""
    id: int
    date: Optional[date] = None
    no: Optional[int] = None
    pos_number: Optional[str] = None
    receipt_number: Optional[str] = None
    payment_time: Optional[datetime] = None
    payment_type: Optional[str] = None
    total_sales: Optional[int] = None
    total_discount: Optional[int] = None
    actual_sales: Optional[int] = None
    price: Optional[int] = None
    vat: Optional[int] = None
    created_at: Optional[datetime] = None
    store_name: Optional[str] = None

    class Config:
        from_attributes = True

# API 응답 모델 - 일별 매출
class DailySalesResponse(BaseModel):
    """일별 매출 API 응답 모델"""
    date: date
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    total_sales: int = 0
    actual_sales: int = 0
    total_discount: int = 0
    transaction_count: int = 0
    avg_transaction_value: float = 0

# API 응답 모델 - 시간대별 매출
class HourlySalesResponse(BaseModel):
    """시간대별 매출 API 응답 모델"""
    hour: int
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    total_sales: int = 0
    transaction_count: int = 0
    avg_transaction_value: float = 0

# API 응답 모델 - 제품별 매출
class ProductSalesResponse(BaseModel):
    """제품별 매출 API 응답 모델"""
    product_name: str
    product_code: Optional[str] = None
    store_name: Optional[str] = "전체"  # 매장명 필드 추가
    quantity: int = 0
    total_sales: int = 0
    total_discount: int = 0
    actual_sales: int = 0
    sales_percentage: float = 0

# API 응답 모델 - 결제유형별 매출
class PaymentTypeSalesResponse(BaseModel):
    """결제유형별 매출 API 응답 모델"""
    payment_type: str
    transaction_count: int = 0
    total_sales: int = 0
    percentage: float = 0

# API 요청 모델 - 매출 데이터 필터
class SalesFilterParams(BaseModel):
    """매출 데이터 필터링 매개변수 모델"""
    start_date: date
    end_date: date
    store_name: Optional[List[str]] = None
    payment_type: Optional[List[str]] = None
    product_code: Optional[List[str]] = None

class HourlyProductSalesResponse(BaseModel):
    """시간대별 제품별 판매 수량 API 응답 모델"""
    hour: int  # 시(hour)
    product_name: str  # 제품명
    quantity: int  # 판매 개수
