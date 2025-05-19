## sales_service.py

from datetime import date, datetime
from typing import List, Dict, Any, Optional
import pandas as pd

from app.core.database import get_table, Tables
from app.utils.date_utils import get_date_range
from app.models.sales import (
    DailySalesResponse, 
    HourlySalesResponse,
    ProductSalesResponse,
    PaymentTypeSalesResponse,
    HourlyProductSalesResponse
)

# 매출 데이터 서비스
class SalesService:
    """매출 데이터 처리 서비스"""
    
    @staticmethod
    async def get_daily_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[DailySalesResponse]:
        """
        일별 매출 데이터를 조회합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            
        Returns:
            일별 매출 데이터 리스트
        """
        import logging
        from datetime import timedelta
        logger = logging.getLogger("sales_service")
        logger.setLevel(logging.INFO)
        
        # 현재 로깅 레벨 가져오기
        logging_level = logger.getEffectiveLevel()
        
        # 로깅 - 요청 파라미터
        logger.info(f"일별 매출 조회 요청: start_date={start_date}, end_date={end_date}, store_name={store_name}")
        
        try:
            # 4일 단위로 데이터를 조회
            chunk_size = 1  # 4일 단위로 데이터 조회
            all_data = {}   # 날짜별 데이터를 저장할 딕셔너리
            
            # 시작일부터 종료일까지 4일 단위로 처리
            current_date = start_date
            while current_date <= end_date:
                # 현재 청크의 종료일 계산 (4일 후 또는 end_date 중 작은 값)
                chunk_end = min(current_date + timedelta(days=chunk_size-1), end_date)
                logger.info(f"청크 조회: {current_date} ~ {chunk_end}")
                
                # 현재 청크의 날짜 범위
                date_range = get_date_range(current_date, chunk_end)
                
                try:
                    # 청크 단위로 데이터 조회
                    date_start_str = current_date.isoformat()
                    date_end_str = chunk_end.isoformat()
                    
                    query = get_table(Tables.DAILY_SALES_SUMMARY)\
                           .select("*")\
                           .gte("date", date_start_str)\
                           .lte("date", date_end_str)
                    
                    # 매장 필터 추가
                    if store_name:
                        query = query.in_("store_name", store_name)
                    
                    # 데이터 조회
                    response = query.execute()
                    chunk_data = response.data
                    logger.info(f"청크 데이터 개수: {len(chunk_data)}")
                    
                    # 날짜별로 데이터 정리
                    if chunk_data:
                        # 날짜별로 그룹화
                        for record in chunk_data:
                            record_date = record.get('date')
                            if record_date:
                                # 날짜 문자열을 date 객체로 변환
                                if isinstance(record_date, str):
                                    record_date = pd.to_datetime(record_date).date()
                                
                                # 해당 날짜의 데이터 목록에 추가
                                if record_date not in all_data:
                                    all_data[record_date] = []
                                all_data[record_date].append(record)
                
                except Exception as e:
                    logger.error(f"청크 데이터 조회 중 오류 발생: {str(e)}")
                    logger.exception(e)
                    # 오류 발생 시 해당 구간은 건너뛰고 계속 진행
                
                # 다음 청크의 시작일 설정
                current_date = chunk_end + timedelta(days=1)
            
            # 모든 날짜 범위를 생성
            all_dates = get_date_range(start_date, end_date)
            result = []
            
            # 고유한 매장 목록 추출 (필터링 선택 또는 모든 데이터에서)
            unique_stores = set()
            for date_data in all_data.values():
                for record in date_data:
                    if 'store_name' in record and record['store_name']:
                        unique_stores.add(record['store_name'])
            
            logger.info(f"발견된 매장 목록: {unique_stores}")
            
            # 매장별, 날짜별로 데이터 집계
            if store_name and len(store_name) == 1:
                # 단일 매장 선택 시 해당 매장 데이터만 처리
                selected_store = store_name[0]
                logger.info(f"단일 매장 선택: {selected_store}")
                
                for single_date in all_dates:
                    date_data = all_data.get(single_date, [])
                    
                    # 해당 날짜의 선택 매장 데이터 필터링
                    store_date_data = [item for item in date_data if item.get('store_name') == selected_store]
                    
                    if store_date_data:
                        # 선택 매장 데이터가 있는 경우
                        total_sales = sum([item.get('total_sales', 0) or 0 for item in store_date_data])
                        actual_sales = sum([item.get('actual_sales', 0) or 0 for item in store_date_data])
                        total_discount = sum([item.get('total_discount', 0) or 0 for item in store_date_data])
                        transaction_count = len(store_date_data)
                        
                        # 평균 거래 금액 계산
                        avg_transaction_value = actual_sales / transaction_count if transaction_count > 0 else 0
                        
                        # 결과 추가
                        result.append(DailySalesResponse(
                            date=single_date,
                            store_name=selected_store,
                            total_sales=int(total_sales),
                            actual_sales=int(actual_sales),
                            total_discount=int(total_discount),
                            transaction_count=int(transaction_count),
                            avg_transaction_value=float(avg_transaction_value)
                        ))
                    else:
                        # 해당 날짜에 선택 매장 데이터가 없는 경우 0으로 채움
                        result.append(DailySalesResponse(
                            date=single_date,
                            store_name=selected_store,
                            total_sales=0,
                            actual_sales=0,
                            total_discount=0,
                            transaction_count=0,
                            avg_transaction_value=0
                        ))
            else:
                # 여러 매장 선택 또는 모든 매장 - 개별 매장별로 데이터 처리
                for store in unique_stores:
                    for single_date in all_dates:
                        date_data = all_data.get(single_date, [])
                        
                        # 해당 날짜의 현재 매장 데이터 필터링
                        store_date_data = [item for item in date_data if item.get('store_name') == store]
                        
                        if store_date_data:
                            # 현재 매장 데이터가 있는 경우
                            total_sales = sum([item.get('total_sales', 0) or 0 for item in store_date_data])
                            actual_sales = sum([item.get('actual_sales', 0) or 0 for item in store_date_data])
                            total_discount = sum([item.get('total_discount', 0) or 0 for item in store_date_data])
                            transaction_count = len(store_date_data)
                            
                            # 평균 거래 금액 계산
                            avg_transaction_value = actual_sales / transaction_count if transaction_count > 0 else 0
                            
                            # 결과 추가
                            result.append(DailySalesResponse(
                                date=single_date,
                                store_name=store,
                                total_sales=int(total_sales),
                                actual_sales=int(actual_sales),
                                total_discount=int(total_discount),
                                transaction_count=int(transaction_count),
                                avg_transaction_value=float(avg_transaction_value)
                            ))
                        else:
                            # 해당 날짜에 현재 매장 데이터가 없는 경우 0으로 채움
                            result.append(DailySalesResponse(
                                date=single_date,
                                store_name=store,
                                total_sales=0,
                                actual_sales=0,
                                total_discount=0,
                                transaction_count=0,
                                avg_transaction_value=0
                            ))
                
                # 전체 합계 데이터 추가
                for single_date in all_dates:
                    date_data = all_data.get(single_date, [])
                    
                    if date_data:
                        # 모든 매장 데이터를 합산
                        total_sales = sum([item.get('total_sales', 0) or 0 for item in date_data])
                        actual_sales = sum([item.get('actual_sales', 0) or 0 for item in date_data])
                        total_discount = sum([item.get('total_discount', 0) or 0 for item in date_data])
                        transaction_count = len(date_data)
                        
                        # 평균 거래 금액 계산
                        avg_transaction_value = actual_sales / transaction_count if transaction_count > 0 else 0
                        
                        # 전체 합계 결과 추가
                        result.append(DailySalesResponse(
                            date=single_date,
                            store_name="전체",
                            total_sales=int(total_sales),
                            actual_sales=int(actual_sales),
                            total_discount=int(total_discount),
                            transaction_count=int(transaction_count),
                            avg_transaction_value=float(avg_transaction_value)
                        ))
                    else:
                        # 해당 날짜에 데이터가 없는 경우 0으로 채움
                        result.append(DailySalesResponse(
                            date=single_date,
                            store_name="전체",
                            total_sales=0,
                            actual_sales=0,
                            total_discount=0,
                            transaction_count=0,
                            avg_transaction_value=0
                        ))
            
            # 날짜순, 매장명순 정렬
            result.sort(key=lambda x: (x.date, x.store_name))
            logger.info(f"최종 반환 데이터 개수: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"일별 매출 조회 중 오류 발생: {str(e)}")
            logger.exception(e)
            
            # 오류 발생 시 빈 날짜 범위 생성
            date_range = get_date_range(start_date, end_date)
            
            # 선택된 매장이 있는 경우 해당 매장만 반환
            if store_name and len(store_name) == 1:
                return [
                    DailySalesResponse(
                        date=d,
                        store_name=store_name[0],
                        total_sales=0,
                        actual_sales=0,
                        total_discount=0,
                        transaction_count=0,
                        avg_transaction_value=0
                    ) for d in date_range
                ]
            else:
                # 기본적으로 '전체' 매장으로 빈 데이터 반환
                return [
                    DailySalesResponse(
                        date=d,
                        store_name="전체",
                        total_sales=0,
                        actual_sales=0,
                        total_discount=0,
                        transaction_count=0,
                        avg_transaction_value=0
                    ) for d in date_range
                ]

    @staticmethod
    async def get_hourly_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[HourlySalesResponse]:
        """
        시간대별 매출 데이터를 조회합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            
        Returns:
            시간대별 매출 데이터 리스트
        """
        import logging
        from datetime import timedelta
        logger = logging.getLogger("sales_service")
        logger.setLevel(logging.INFO)
        
        # 현재 로깅 레벨 가져오기
        logging_level = logger.getEffectiveLevel()
        
        # 로깅 - 요청 파라미터
        logger.info(f"시간대별 매출 조회 요청: start_date={start_date}, end_date={end_date}, store_name={store_name}")
        
        # 페이지네이션 구현 - 7일 단위로 데이터 조회
        all_data = []
        current_start = start_date
        page_size = 1  # 7일 단위로 데이터 조회
        
        while current_start <= end_date:
            # 현재 청크의 종료일 계산
            current_end = min(current_start + timedelta(days=page_size-1), end_date)
            logger.info(f"청크 조회: {current_start} ~ {current_end}")
            
            # 상세 영수증 데이터에서 결제 시간 정보 조회
            query = get_table(Tables.RECEIPT_SALES_DETAIL)\
                    .select("payment_time", "total_sales", "actual_sales", "receipt_number", "store_name")\
                    .gte("date", current_start.isoformat())\
                    .lte("date", current_end.isoformat())
            
            # 매장 필터 추가
            if store_name:
                query = query.in_("store_name", store_name)
            
            # SQL 쿼리 로깅 (디버깅용)
            if logging_level == logging.DEBUG:
                logger.debug(f"Supabase 쿼리: {query}")
            
            # 데이터 조회
            try:
                response = query.execute()
                chunk_data = response.data
                logger.info(f"청크 데이터 개수: {len(chunk_data)}")
                
                # 데이터가 있으면 결과에 추가
                if chunk_data:
                    all_data.extend(chunk_data)
                
            except Exception as e:
                logger.error(f"청크 데이터 조회 중 오류 발생: {str(e)}")
                logger.exception(e)
                # 오류 발생 시 해당 구간은 건너뛰고 계속 진행 (롤백 대신)
            
            # 다음 청크의 시작일 설정
            current_start = current_end + timedelta(days=1)
            
        logger.info(f"전체 조회된 데이터 개수: {len(all_data)}")
        
        if not all_data:
            # 데이터가 없는 경우 24시간 모든 시간대 0값으로 반환
            # 특정 매장만 선택된 경우 해당 매장만 반환
            if store_name and len(store_name) == 1:
                return [
                    HourlySalesResponse(
                        hour=h,
                        store_name=store_name[0],
                        total_sales=0,
                        transaction_count=0,
                        avg_transaction_value=0
                    ) for h in range(24)
                ]
            else:
                # 모든 매장 또는 여러 매장 요청 시 기본값으로 '전체' 반환
                return [
                    HourlySalesResponse(
                        hour=h,
                        store_name="전체",
                        total_sales=0,
                        transaction_count=0,
                        avg_transaction_value=0
                    ) for h in range(24)
                ]
        
        df = pd.DataFrame(all_data)
        
        # 시간대 추출
        df['payment_time'] = pd.to_datetime(df['payment_time'])
        df['hour'] = df['payment_time'].dt.hour
        
        # 동일 영수증 중복 제거 (영수증 번호별 집계)
        receipt_df = df.drop_duplicates(subset=['receipt_number', 'store_name'])
        
        # 시간대별 집계
        # 먼저 매장별로 나누기
        if 'store_name' in df.columns:
            # 매장별, 시간대별 집계
            hourly_sales = df.groupby(['hour', 'store_name']).agg({
                'total_sales': 'sum',
                'receipt_number': 'count'
            }).reset_index()
        else:
            # 시간대별로만 집계 (매장 구분 없음)
            hourly_sales = df.groupby('hour').agg({
                'total_sales': 'sum',
                'receipt_number': 'count'
            }).reset_index()
            # 매장명 컬럼 추가
            hourly_sales['store_name'] = '전체'
        
        # 평균 거래 금액 계산
        hourly_sales['avg_transaction_value'] = hourly_sales.apply(
            lambda row: row['total_sales'] / row['receipt_number'] if row['receipt_number'] > 0 else 0,
            axis=1
        )
        
        # 결과 변환
        result = []
        for _, row in hourly_sales.iterrows():
            result.append(HourlySalesResponse(
                hour=int(row['hour']),
                store_name=row['store_name'] if 'store_name' in row else '전체',
                total_sales=int(row['total_sales']),
                transaction_count=int(row['receipt_number']),
                avg_transaction_value=float(row['avg_transaction_value'])
            ))
        
        # 누락된 시간대 채우기
        # 모든 매장과 시간대 조합 만들기
        complete_result = []
        
        # 사용 가능한 매장 목록 추출
        stores = set()
        for item in result:
            stores.add(item.store_name)
            
        logger.info(f"시간대별 매출 데이터 - 매장 목록: {stores}")
        
        # 각 매장별로 모든 시간대 채우기
        for store in stores:
            # 해당 매장의 시간대 데이터 추출
            store_items = {item.hour: item for item in result if item.store_name == store}
            
            # 모든 시간대 확인 및 누락 채우기
            for h in range(24):
                if h in store_items:
                    complete_result.append(store_items[h])
                else:
                    # 누락된 시간대는 0값으로 채움
                    complete_result.append(HourlySalesResponse(
                        hour=h,
                        store_name=store,
                        total_sales=0,
                        transaction_count=0,
                        avg_transaction_value=0
                    ))
        
        # 시간대순, 매장명순 정렬
        complete_result.sort(key=lambda x: (x.hour, x.store_name))
        
        # 특정 매장만 필터링 (요청 시)
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            complete_result = [item for item in complete_result if item.store_name == selected_store]
            
        return complete_result

    @staticmethod
    async def get_product_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[ProductSalesResponse]:
        """
        제품별 매출 데이터를 조회합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            limit: 상위 제품 수 제한
            
        Returns:
            제품별 매출 데이터 리스트
        """
        import logging
        from datetime import timedelta
        logger = logging.getLogger("sales_service")
        logger.setLevel(logging.INFO)
        
        # 현재 로깅 레벨 가져오기
        logging_level = logger.getEffectiveLevel()
        
        # 로깅 - 요청 파라미터
        logger.info(f"제품별 매출 조회 요청: start_date={start_date}, end_date={end_date}, store_name={store_name}, limit={limit}")
        
        # 페이지네이션 구현 - 7일 단위로 데이터 조회
        all_data = []
        current_start = start_date
        page_size = 7  # 7일 단위로 데이터 조회
        
        while current_start <= end_date:
            # 현재 청크의 종료일 계산
            current_end = min(current_start + timedelta(days=page_size-1), end_date)
            logger.info(f"청크 조회: {current_start} ~ {current_end}")
            
            # 상세 영수증 데이터에서 제품별 매출 정보 조회
            query = get_table(Tables.RECEIPT_SALES_DETAIL)\
                    .select("product_name", "product_code", "quantity", "total_sales", "discount_amount", "actual_sales", "store_name")\
                    .gte("date", current_start.isoformat())\
                    .lte("date", current_end.isoformat())
            
            # 매장 필터 추가
            if store_name:
                query = query.in_("store_name", store_name)
            
            # SQL 쿼리 로깅 (디버깅용)
            if logging_level == logging.DEBUG:
                logger.debug(f"Supabase 쿼리: {query}")
            
            # 데이터 조회
            try:
                response = query.execute()
                chunk_data = response.data
                logger.info(f"청크 데이터 개수: {len(chunk_data)}")
                
                # 데이터가 있으면 결과에 추가
                if chunk_data:
                    all_data.extend(chunk_data)
                
            except Exception as e:
                logger.error(f"청크 데이터 조회 중 오류 발생: {str(e)}")
                logger.exception(e)
                # 오류 발생 시 해당 구간은 건너뛰고 계속 진행 (롤백 대신)
            
            # 다음 청크의 시작일 설정
            current_start = current_end + timedelta(days=1)
            
        logger.info(f"전체 조회된 데이터 개수: {len(all_data)}")
        
        if not all_data:
            return []
        
        df = pd.DataFrame(all_data)
        
        # null 값 처리
        df['quantity'] = df['quantity'].fillna(0)
        df['total_sales'] = df['total_sales'].fillna(0)
        df['discount_amount'] = df['discount_amount'].fillna(0)
        df['actual_sales'] = df['actual_sales'].fillna(0)
        df['store_name'] = df['store_name'].fillna('전체')
        
        # 매장별 및 제품별 집계 여부 결정
        if store_name and len(store_name) == 1:
            # 단일 매장 선택 시 해당 매장 데이터만 처리
            selected_store = store_name[0]
            df = df[df['store_name'] == selected_store]
            
            # 제품별 집계
            product_sales = df.groupby(['product_name', 'product_code']).agg({
                'quantity': 'sum',
                'total_sales': 'sum',
                'discount_amount': 'sum',
                'actual_sales': 'sum'
            }).reset_index()
            
            # 매장명 컬럼 추가
            product_sales['store_name'] = selected_store
        else:
            # 매장별, 제품별로 집계
            product_sales = df.groupby(['product_name', 'product_code', 'store_name']).agg({
                'quantity': 'sum',
                'total_sales': 'sum',
                'discount_amount': 'sum',
                'actual_sales': 'sum'
            }).reset_index()
        
        # 총 매출 계산 (비율 계산용)
        total_sales = df['total_sales'].sum()
        
        # 매출 비율 계산
        product_sales['sales_percentage'] = product_sales.apply(
            lambda row: row['total_sales'] / total_sales * 100 if total_sales > 0 else 0,
            axis=1
        )
        
        # 매출액 기준 내림차순 정렬 후 상위 n개 추출
        product_sales = product_sales.sort_values('total_sales', ascending=False)
        
        # 매장별로 각각 limit 적용 또는 전체 중 상위 limit 개 선택
        if store_name and len(store_name) == 1:
            # 단일 매장은 상위 limit개 선택
            product_sales = product_sales.head(limit)
        else:
            # 각 매장별로 top 제품 선택 또는 전체 중에서 상위 limit개
            if 'store_name' in product_sales.columns and len(product_sales['store_name'].unique()) > 1:
                # 각 매장별로 가장 많이 팔린 제품 선택
                top_products_by_store = []
                for store, group in product_sales.groupby('store_name'):
                    top_products_by_store.append(group.head(min(limit // 2, len(group))))
                product_sales = pd.concat(top_products_by_store)
                
                # 전체 상위 제품 몇 개 더 추가
                all_top_products = product_sales.sort_values('total_sales', ascending=False).head(limit)
                product_sales = pd.concat([product_sales, all_top_products]).drop_duplicates()
            else:
                # 단일 매장 또는 매장 구분 없는 경우
                product_sales = product_sales.head(limit)
        
        # 결과 변환
        result = []
        for _, row in product_sales.iterrows():
            result.append(ProductSalesResponse(
                product_name=str(row['product_name']),
                product_code=str(row['product_code']) if pd.notna(row['product_code']) else None,
                store_name=row['store_name'] if 'store_name' in row else '전체',
                quantity=int(row['quantity']),
                total_sales=int(row['total_sales']),
                total_discount=int(row['discount_amount']),
                actual_sales=int(row['actual_sales']),
                sales_percentage=float(row['sales_percentage'])
            ))
                
        return result

    @staticmethod
    async def get_payment_type_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[PaymentTypeSalesResponse]:
        """
        결제 유형별 매출 데이터를 조회합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            
        Returns:
            결제 유형별 매출 데이터 리스트
        """
        import logging
        from datetime import timedelta
        logger = logging.getLogger("sales_service")
        logger.setLevel(logging.INFO)
        
        # 현재 로깅 레벨 가져오기
        logging_level = logger.getEffectiveLevel()
        
        # 로깅 - 요청 파라미터
        logger.info(f"결제 유형별 매출 조회 요청: start_date={start_date}, end_date={end_date}, store_name={store_name}")
        
        # 페이지네이션 구현 - 7일 단위로 데이터 조회
        all_data = []
        current_start = start_date
        page_size = 7  # 7일 단위로 데이터 조회
        
        while current_start <= end_date:
            # 현재 청크의 종료일 계산
            current_end = min(current_start + timedelta(days=page_size-1), end_date)
            logger.info(f"청크 조회: {current_start} ~ {current_end}")
            
            # 일별 매출 요약 데이터에서 결제 유형별 정보 조회
            query = get_table(Tables.DAILY_SALES_SUMMARY)\
                    .select("payment_type", "total_sales", "receipt_number")\
                    .gte("date", current_start.isoformat())\
                    .lte("date", current_end.isoformat())
            
            # 매장 필터 추가
            if store_name:
                query = query.in_("store_name", store_name)
            
            # SQL 쿼리 로깅 (디버깅용)
            if logging_level == logging.DEBUG:
                logger.debug(f"Supabase 쿼리: {query}")
            
            # 데이터 조회
            try:
                response = query.execute()
                chunk_data = response.data
                logger.info(f"청크 데이터 개수: {len(chunk_data)}")
                
                # 데이터가 있으면 결과에 추가
                if chunk_data:
                    all_data.extend(chunk_data)
                
            except Exception as e:
                logger.error(f"청크 데이터 조회 중 오류 발생: {str(e)}")
                logger.exception(e)
                # 오류 발생 시 해당 구간은 건너뛰고 계속 진행 (롤백 대신)
            
            # 다음 청크의 시작일 설정
            current_start = current_end + timedelta(days=1)
            
        logger.info(f"전체 조회된 데이터 개수: {len(all_data)}")
        
        if not all_data:
            return []
        
        df = pd.DataFrame(all_data)
        
        # null 값 처리
        df['payment_type'] = df['payment_type'].fillna('Unknown')
        df['total_sales'] = df['total_sales'].fillna(0)
        
        # 결제 유형별 집계
        payment_sales = df.groupby('payment_type').agg({
            'total_sales': 'sum',
            'receipt_number': 'count'
        }).reset_index()
        
        # 총 매출 계산 (비율 계산용)
        total_sales = payment_sales['total_sales'].sum()
        
        # 매출 비율 계산
        payment_sales['percentage'] = payment_sales['total_sales'] / total_sales * 100 if total_sales > 0 else 0
        
        # 매출액 기준 내림차순 정렬
        payment_sales = payment_sales.sort_values('total_sales', ascending=False)
        
        # 결과 변환
        result = []
        for _, row in payment_sales.iterrows():
            result.append(PaymentTypeSalesResponse(
                payment_type=str(row['payment_type']),
                transaction_count=int(row['receipt_number']),
                total_sales=int(row['total_sales']),
                percentage=float(row['percentage'])
            ))
                
        return result

    @staticmethod
    async def get_hourly_product_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[HourlyProductSalesResponse]:
        """
        시간대별로 제품별 판매 수량을 조회합니다.

        Returns:
            시간대별 제품별 판매 수량 리스트
        """
        import logging
        from datetime import timedelta
        logger = logging.getLogger("sales_service")
        logger.setLevel(logging.INFO)

        # 페이지네이션 구현 - 7일 단위로 데이터 조회
        all_data = []
        current_start = start_date
        page_size = 7

        while current_start <= end_date:
            current_end = min(current_start + timedelta(days=page_size-1), end_date)
            query = get_table(Tables.RECEIPT_SALES_DETAIL) \
                .select("payment_time", "product_name", "quantity", "store_name") \
                .gte("date", current_start.isoformat()) \
                .lte("date", current_end.isoformat())
            if store_name:
                query = query.in_("store_name", store_name)
            try:
                response = query.execute()
                chunk_data = response.data
                if chunk_data:
                    all_data.extend(chunk_data)
            except Exception as e:
                logger.error(f"시간대별 제품별 조회 중 오류: {e}")
            current_start = current_end + timedelta(days=1)

        if not all_data:
            return []

        df = pd.DataFrame(all_data)
        df['payment_time'] = pd.to_datetime(df['payment_time'])
        df['hour'] = df['payment_time'].dt.hour

        # 시간대별 제품별 수량 집계
        grouped = df.groupby(['hour', 'product_name']).agg({
            'quantity': 'sum'
        }).reset_index()

        # 결과 변환
        result = []
        for _, row in grouped.iterrows():
            result.append(HourlyProductSalesResponse(
                hour=int(row['hour']),
                product_name=str(row['product_name']),
                quantity=int(row['quantity'])
            ))
        return result

# 서비스 인스턴스 생성 (의존성 주입용)
sales_service = SalesService()
