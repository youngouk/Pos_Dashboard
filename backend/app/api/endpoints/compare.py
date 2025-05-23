## compare.py

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta
from enum import Enum

from app.models.compare import (
    StoreComparisonResponse,
    TopPerformerResponse,
    BenchmarkType,
    CompareFilterParams
)
from app.services.compare_service import compare_service
from app.utils.date_utils import get_recent_periods

router = APIRouter()

@router.get("/store", response_model=StoreComparisonResponse)
async def compare_store(
    store_name: str = Query(..., description="비교 기준 매장 이름"),
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    benchmark_type: BenchmarkType = Query(BenchmarkType.ALL, description="비교 대상 유형"),
    metrics: Optional[List[str]] = Query(None, description="비교 지표 리스트")
):
    """
    특정 매장과 다른 매장들을 비교 분석합니다.
    
    - **store_name**: 비교 기준 매장 이름
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **benchmark_type**: 비교 대상 유형 (ALL=전체, TOP_25=상위25%, BOTTOM_25=하위25%, SIMILAR=유사매장)
    - **metrics**: 비교 지표 리스트 (지정하지 않으면 기본 지표 사용)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await compare_service.get_store_comparison(
        start_date, 
        end_date, 
        store_name, 
        benchmark_type, 
        metrics
    )

@router.get("/top_performers", response_model=TopPerformerResponse)
async def get_top_performers(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    metric: str = Query("total_sales", description="정렬 기준 지표"),
    limit: int = Query(5, description="조회할 상위 매장 수")
):
    """
    특정 지표 기준 상위 매장을 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **metric**: 정렬 기준 지표 (total_sales, avg_transaction, discount_rate 등)
    - **limit**: 조회할 상위 매장 수 (기본값: 5)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await compare_service.get_top_performers(
        start_date, 
        end_date, 
        metric, 
        limit
    )

@router.post("/filter", response_model=dict)
async def filter_comparison_data(filter_params: CompareFilterParams):
    """
    필터 기준에 따른 비교 분석 데이터를 조회합니다.
    
    Request Body:
    - **start_date**: 조회 시작 날짜
    - **end_date**: 조회 종료 날짜
    - **store_name**: 비교 기준 매장 이름
    - **benchmark_type**: 비교 대상 유형 (옵션)
    - **metrics**: 비교 지표 리스트 (옵션)
    """
    # 매장 비교 분석
    comparison = await compare_service.get_store_comparison(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name,
        filter_params.benchmark_type or BenchmarkType.ALL,
        filter_params.metrics
    )
    
    # 상위 매장 조회
    top_performers = await compare_service.get_top_performers(
        filter_params.start_date,
        filter_params.end_date,
        "total_sales",
        5
    )
    
    # 응답 데이터 구성
    return {
        "comparison": comparison,
        "top_performers": top_performers
    }

@router.get("/factors")
async def get_compare_factors(
    store_name: str = Query(..., description="비교 기준 매장 이름"),
    factor_type: str = Query(..., description="조회할 성과 요인 타입 (예: performance)")
):
    """
    매장 비교 성과 요인 API (현재 미구현으로 빈 배열 반환)
    """
    return {"factors": []}
