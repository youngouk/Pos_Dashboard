## kpi.py

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.models.kpi import (
    KPISummary,
    KPITrend,
    ProductKPI,
    CategoryKPI,
    KPIFilterParams
)
from app.services.kpi_service import kpi_service
from app.utils.date_utils import get_recent_periods

router = APIRouter()

@router.get("/summary", response_model=KPISummary)
async def get_kpi_summary(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    주요 KPI 지표 요약을 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await kpi_service.get_kpi_summary(start_date, end_date, store_name)

@router.get("/trends", response_model=KPITrend)
async def get_kpi_trends(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    metric: str = Query("total_sales", description="조회할 지표")
):
    """
    일별 KPI 트렌드를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **metric**: 조회할 지표 (total_sales, transactions, avg_transaction 등)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await kpi_service.get_kpi_trends(start_date, end_date, store_name, metric)

@router.get("/products", response_model=List[ProductKPI])
async def get_product_kpi(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    top_n: int = Query(10, description="상위 제품 수")
):
    """
    제품별 KPI를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **top_n**: 상위 제품 수 (기본값: 10)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await kpi_service.get_product_kpi(start_date, end_date, store_name, top_n)

@router.get("/categories", response_model=List[CategoryKPI])
async def get_category_kpi(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    카테고리별 KPI를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await kpi_service.get_category_kpi(start_date, end_date, store_name)

@router.post("/filter", response_model=dict)
async def filter_kpi_data(filter_params: KPIFilterParams):
    """
    필터 기준에 따른 KPI 데이터를 조회합니다.
    
    Request Body:
    - **start_date**: 조회 시작 날짜
    - **end_date**: 조회 종료 날짜
    - **store_name**: 매장 이름 필터 (옵션)
    - **metric**: 지표 필터 (옵션)
    - **top_n**: 상위 항목 수 (옵션)
    """
    # KPI 요약 조회
    summary = await kpi_service.get_kpi_summary(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name
    )
    
    # 지표 트렌드 조회
    metric = filter_params.metric or "total_sales"
    trends = await kpi_service.get_kpi_trends(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name,
        metric
    )
    
    # 제품별 KPI 조회
    top_n = filter_params.top_n or 10
    product_kpi = await kpi_service.get_product_kpi(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name,
        top_n
    )
    
    # 카테고리별 KPI 조회
    category_kpi = await kpi_service.get_category_kpi(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name
    )
    
    # 응답 데이터 구성
    return {
        "summary": summary,
        "trends": trends,
        "product_kpi": product_kpi,
        "category_kpi": category_kpi
    }
