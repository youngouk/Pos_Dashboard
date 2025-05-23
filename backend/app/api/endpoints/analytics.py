## analytics.py

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.models.analytics import (
    AnomalyResponse,
    CorrelationResponse,
    PatternResponse,
    AnalyticsFilterParams
)
from app.services.analytics_service import analytics_service
from app.utils.date_utils import get_recent_periods

router = APIRouter()

@router.get("/anomalies", response_model=AnomalyResponse)
async def detect_anomalies(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(60, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    metric: str = Query("total_sales", description="분석할 지표"),
    method: str = Query("zscore", description="이상치 감지 방법"),
    threshold: float = Query(3.0, description="이상치 감지 임계값")
):
    """
    매출 데이터의 이상치를 감지합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **metric**: 분석할 지표 (total_sales, transactions, avg_transaction)
    - **method**: 이상치 감지 방법 (zscore, iqr)
    - **threshold**: 이상치 감지 임계값
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await analytics_service.detect_sales_anomalies(
        start_date, 
        end_date, 
        store_name, 
        metric, 
        method, 
        threshold
    )

@router.get("/correlations", response_model=CorrelationResponse)
async def analyze_correlations(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(90, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    variables: Optional[List[str]] = Query(None, description="분석할 변수 리스트"),
    method: str = Query("pearson", description="상관계수 계산 방법")
):
    """
    변수 간 상관관계를 분석합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **variables**: 분석할 변수 리스트 (지정하지 않으면 기본 변수 사용)
    - **method**: 상관계수 계산 방법 (pearson, spearman)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await analytics_service.analyze_correlations(
        start_date, 
        end_date, 
        store_name, 
        variables, 
        method
    )

@router.get("/patterns", response_model=PatternResponse)
async def analyze_patterns(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(30, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    pattern_type: str = Query("hourly", description="패턴 유형")
):
    """
    매출 데이터의 시간대별/요일별/월별 패턴을 분석합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **pattern_type**: 패턴 유형 (hourly, daily, weekly, monthly, product)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await analytics_service.analyze_patterns(
        start_date, 
        end_date, 
        store_name, 
        pattern_type
    )

@router.post("/filter", response_model=dict)
async def filter_analytics_data(filter_params: AnalyticsFilterParams):
    """
    필터 기준에 따른 분석 데이터를 조회합니다.
    
    Request Body:
    - **start_date**: 조회 시작 날짜
    - **end_date**: 조회 종료 날짜
    - **store_name**: 매장 이름 필터 (옵션)
    - **metric**: 지표 필터 (옵션)
    - **pattern_type**: 패턴 유형 (옵션)
    """
    # 이상치 감지
    anomalies = await analytics_service.detect_sales_anomalies(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name,
        filter_params.metric or "total_sales"
    )
    
    # 상관관계 분석
    correlations = await analytics_service.analyze_correlations(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name
    )
    
    # 패턴 분석
    patterns = await analytics_service.analyze_patterns(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name,
        filter_params.pattern_type or "hourly"
    )
    
    # 응답 데이터 구성
    return {
        "anomalies": anomalies,
        "correlations": correlations,
        "patterns": patterns
    }
