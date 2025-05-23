## sales.py

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.models.sales import (
    DailySalesResponse, 
    HourlySalesResponse,
    ProductSalesResponse,
    PaymentTypeSalesResponse,
    SalesFilterParams,
    HourlyProductSalesResponse
)
from app.services.sales_service import sales_service
from app.utils.date_utils import get_recent_periods

router = APIRouter()

@router.get("/daily", response_model=List[DailySalesResponse])
async def get_daily_sales(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    일별 매출 데이터를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    """
    import logging
    logger = logging.getLogger("sales_api")
    logger.setLevel(logging.INFO)
    
    # 요청 파라미터 로깅
    logger.info(f"일별 매출 API 요청: start_date={start_date}, end_date={end_date}, days={days}, store_name={store_name}")
    
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        logger.info(f"종료일 미지정, 기본값 사용: {end_date}")
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
        logger.info(f"시작일 미지정, {days}일 전으로 계산: {start_date}")
    
    try:
        results = await sales_service.get_daily_sales(start_date, end_date, store_name)
        logger.info(f"API 응답 데이터 개수: {len(results)}")
        logger.info(f"API 응답 샘플: {[r.dict() for r in results[:2]] if results else '데이터 없음'}")
        return results
    except Exception as e:
        logger.error(f"API 처리 중 오류 발생: {str(e)}")
        logger.exception(e)
        raise

@router.get("/hourly", response_model=List[HourlySalesResponse])
async def get_hourly_sales(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    시간대별 매출 데이터를 조회합니다.
    
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
    
    return await sales_service.get_hourly_sales(start_date, end_date, store_name)

@router.get("/products", response_model=List[ProductSalesResponse])
async def get_product_sales(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    limit: int = Query(20, description="상위 제품 수 제한")
):
    """
    제품별 매출 데이터를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **limit**: 상위 제품 수 제한 (기본값: 20)
    """
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    return await sales_service.get_product_sales(start_date, end_date, store_name, limit)

@router.get("/payment_types", response_model=List[PaymentTypeSalesResponse])
async def get_payment_type_sales(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    결제 유형별 매출 데이터를 조회합니다.
    
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
    
    return await sales_service.get_payment_type_sales(start_date, end_date, store_name)

@router.get("/comparison", response_model=dict)
async def get_sales_comparison(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터"),
    compare_with: Optional[str] = Query("previous_period", description="비교 기준 (previous_period, previous_year)")
):
    """
    매출 비교 데이터를 조회합니다.
    
    - **start_date**: 조회 시작 날짜 (지정하지 않으면 최근 days일 기준)
    - **end_date**: 조회 종료 날짜 (지정하지 않으면 오늘)
    - **days**: 조회할 최근 일수 (start_date가 지정되지 않은 경우에만 사용)
    - **store_name**: 매장 이름 필터 (여러 매장 지정 가능)
    - **compare_with**: 비교 기준 (previous_period: 이전 기간, previous_year: 전년 동기)
    """
    import logging
    logger = logging.getLogger("sales_api")
    logger.setLevel(logging.INFO)
    
    # 로깅
    logger.info(f"매출 비교 API 요청: start_date={start_date}, end_date={end_date}, days={days}, store_name={store_name}, compare_with={compare_with}")
    
    # 날짜 범위 결정
    if not end_date:
        end_date = date.today()
        
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    
    # 현재 기간 매출 데이터 조회
    current_period_data = await sales_service.get_daily_sales(start_date, end_date, store_name)
    
    # 비교 기간 계산
    period_length = (end_date - start_date).days + 1
    
    if compare_with == "previous_year":
        # 전년 동기 계산
        prev_start_date = date(start_date.year - 1, start_date.month, start_date.day)
        prev_end_date = date(end_date.year - 1, end_date.month, end_date.day)
    else:  # "previous_period"
        # 이전 기간 계산
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=period_length - 1)
    
    # 비교 기간 매출 데이터 조회
    comparison_period_data = await sales_service.get_daily_sales(prev_start_date, prev_end_date, store_name)
    
    # 현재 기간 합계 계산
    current_total_sales = sum(item.total_sales for item in current_period_data)
    current_actual_sales = sum(item.actual_sales for item in current_period_data)
    current_discount = sum(item.total_discount for item in current_period_data)
    current_transactions = sum(item.transaction_count for item in current_period_data)
    
    # 비교 기간 합계 계산
    comparison_total_sales = sum(item.total_sales for item in comparison_period_data)
    comparison_actual_sales = sum(item.actual_sales for item in comparison_period_data)
    comparison_discount = sum(item.total_discount for item in comparison_period_data)
    comparison_transactions = sum(item.transaction_count for item in comparison_period_data)
    
    # 변화율 계산
    sales_change_pct = ((current_actual_sales - comparison_actual_sales) / comparison_actual_sales * 100) if comparison_actual_sales else 0
    transaction_change_pct = ((current_transactions - comparison_transactions) / comparison_transactions * 100) if comparison_transactions else 0
    
    # 결과 반환
    result = {
        "current_period": {
            "start_date": start_date,
            "end_date": end_date,
            "total_sales": current_total_sales,
            "actual_sales": current_actual_sales,
            "total_discount": current_discount,
            "transaction_count": current_transactions,
            "daily_data": current_period_data
        },
        "comparison_period": {
            "start_date": prev_start_date,
            "end_date": prev_end_date,
            "total_sales": comparison_total_sales,
            "actual_sales": comparison_actual_sales,
            "total_discount": comparison_discount,
            "transaction_count": comparison_transactions,
            "daily_data": comparison_period_data
        },
        "changes": {
            "sales_change": current_actual_sales - comparison_actual_sales,
            "sales_change_percentage": round(sales_change_pct, 2),
            "transaction_change": current_transactions - comparison_transactions,
            "transaction_change_percentage": round(transaction_change_pct, 2)
        }
    }
    
    logger.info(f"매출 비교 API 응답: 현재기간 매출={current_actual_sales}, 비교기간 매출={comparison_actual_sales}, 변화율={sales_change_pct}%")
    return result

@router.post("/filter", response_model=dict)
async def filter_sales_data(filter_params: SalesFilterParams):
    """
    필터 기준에 따른 매출 데이터를 조회합니다.
    
    Request Body:
    - **start_date**: 조회 시작 날짜
    - **end_date**: 조회 종료 날짜
    - **store_name**: 매장 이름 필터 (옵션)
    - **payment_type**: 결제 유형 필터 (옵션)
    - **product_code**: 제품 코드 필터 (옵션)
    """
    daily_sales = await sales_service.get_daily_sales(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name
    )
    
    product_sales = await sales_service.get_product_sales(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name, 
        limit=10  # 상위 10개만
    )
    
    payment_type_sales = await sales_service.get_payment_type_sales(
        filter_params.start_date, 
        filter_params.end_date, 
        filter_params.store_name
    )
    
    # 응답 데이터 구성
    return {
        "daily_sales": daily_sales,
        "product_sales": product_sales,
        "payment_type_sales": payment_type_sales
    }

@router.get("/test-connection", response_model=dict)
async def test_database_connection():
    """
    데이터베이스 연결 테스트 및 데이터 확인을 위한 테스트 엔드포인트
    """
    import logging
    from app.core.database import get_table, Tables
    
    logger = logging.getLogger("db_test")
    logger.setLevel(logging.INFO)
    
    results = {}
    
    try:
        # DAILY_SALES_SUMMARY 테이블 연결 테스트
        query = get_table(Tables.DAILY_SALES_SUMMARY).select("*").limit(5)
        response = query.execute()
        daily_data = response.data
        
        results["daily_sales_count"] = len(daily_data)
        results["daily_sales_sample"] = daily_data[:2] if daily_data else []
        
        # RECEIPT_SALES_DETAIL 테이블 연결 테스트
        query = get_table(Tables.RECEIPT_SALES_DETAIL).select("*").limit(5)
        response = query.execute()
        receipt_data = response.data
        
        results["receipt_detail_count"] = len(receipt_data)
        results["receipt_detail_sample"] = receipt_data[:2] if receipt_data else []
        
        # 테이블 스키마 확인
        results["table_schemas"] = {
            "daily_sales": list(daily_data[0].keys()) if daily_data else [],
            "receipt_detail": list(receipt_data[0].keys()) if receipt_data else []
        }
        
        results["status"] = "success"
        results["message"] = "데이터베이스 연결 성공"
        
        return results
    except Exception as e:
        logger.error(f"데이터베이스 연결 테스트 실패: {str(e)}")
        logger.exception(e)
        
        results["status"] = "error"
        results["message"] = f"데이터베이스 연결 오류: {str(e)}"
        results["error_detail"] = str(e)
        
        return results

@router.get("/products/hourly", response_model=List[HourlyProductSalesResponse])
async def get_hourly_product_sales(
    start_date: Optional[date] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[date] = Query(None, description="조회 종료 날짜"),
    days: Optional[int] = Query(7, description="최근 일수 (start_date가 None인 경우)"),
    store_name: Optional[List[str]] = Query(None, description="매장 이름 필터")
):
    """
    시간대별 제품별 판매 수량을 조회합니다.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date, _ = get_recent_periods(end_date=end_date, days=days)
    return await sales_service.get_hourly_product_sales(start_date, end_date, store_name)