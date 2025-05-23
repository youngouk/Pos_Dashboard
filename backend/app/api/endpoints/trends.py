## trends.py

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.models.trends import (
    TimeSeriesResponse,
    ForecastResponse,
    SeasonalityResponse,
    TrendFilterParams
)
from app.services.trends_service import trends_service
from app.utils.date_utils import get_recent_periods

router = APIRouter()

@router.get("/time_series", response_model=TimeSeriesResponse)
async def get_time_series(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(90, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    metric: str = Query("total_sales", description="분석할 지표")
):
    """
    시계열 데이터를 조회하고 트렌드를 분석합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **metric**: 분석할 지표 (total_sales, transactions, avg_transaction 등)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await trends_service.get_time_series(
        start_date, 
        end_date, 
        store_name, 
        metric
    )

@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(90, description="최근 일수 (start_date가 None인 경우)"),
    forecast_days: int = Query(30, description="예측할 미래 일수"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    metric: str = Query("total_sales", description="예측할 지표")
):
    """
    시계열 데이터 예측을 수행합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **forecast_days**: 예측할 미래 일수 (기본값: 30)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **metric**: 예측할 지표 (total_sales, transactions, avg_transaction 등)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await trends_service.get_forecast(
        start_date, 
        end_date, 
        forecast_days,
        store_name, 
        metric
    )

@router.get("/seasonality", response_model=SeasonalityResponse)
async def get_seasonality(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(90, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    period_type: str = Query("weekly", description="주기 유형 (weekly, monthly)"),
    metric: str = Query("total_sales", description="분석할 지표")
):
    """
    데이터의 계절성을 분석합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **period_type**: 주기 유형 (weekly=요일별, monthly=월별)
    - **metric**: 분석할 지표 (total_sales, transactions, avg_transaction 등)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await trends_service.get_seasonality(
        start_date, 
        end_date, 
        store_name, 
        period_type,
        metric
    )

@router.post("/filter", response_model=dict)
async def filter_trends_data(filter_params: TrendFilterParams):
    """
    필터 기준에 따른 트렌드 분석 데이터를 조회합니다.
    
    Request Body:
    - **start_date**: 조회 시작 날짜
    - **end_date**: 조회 종료 날짜
    - **store_name**: 매장 이름 필터 (옵션)
    - **metric**: 지표 필터 (옵션)
    - **forecast_days**: 예측 일수 (옵션)
    """
    # 시계열 데이터 조회
    time_series = await trends_service.get_time_series(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name,
        filter_params.metric or "total_sales"
    )
    
    # 예측 데이터 조회
    forecast_days = filter_params.forecast_days or 30
    forecast = await trends_service.get_forecast(
        filter_params.start_date,
        filter_params.end_date,
        forecast_days,
        filter_params.store_name,
        filter_params.metric or "total_sales"
    )
    
    # 계절성 분석
    weekly_seasonality = await trends_service.get_seasonality(
        filter_params.start_date,
        filter_params.end_date,
        filter_params.store_name,
        "weekly",
        filter_params.metric or "total_sales"
    )
    
    # 응답 데이터 구성
    return {
        "time_series": time_series,
        "forecast": forecast,
        "seasonality": weekly_seasonality
    }
