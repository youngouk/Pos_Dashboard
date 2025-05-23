## kpi_service.py

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from app.core.database import get_table, Tables
from app.utils.date_utils import get_date_range
from app.models.kpi import (
    KPISummary,
    KPITrend,
    KPITrendPoint,
    ProductKPI,
    CategoryKPI
)

# KPI 계산 서비스
class KPIService:
    """KPI 계산 서비스"""
    
    @staticmethod
    async def get_kpi_summary(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> KPISummary:
        """
        주요 KPI 지표 요약을 계산합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            
        Returns:
            KPI 요약 객체
        """
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("*")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        summary_data = response.data
        
        # 기본값 초기화
        summary = KPISummary()
        
        if not summary_data:
            return summary
            
        df = pd.DataFrame(summary_data)
        
        # 날짜 수 계산
        date_range = get_date_range(start_date, end_date)
        days_count = len(date_range)
        
        # 총 매출 계산
        total_sales = df['total_sales'].sum()
        
        # 할인 금액 및 비율 계산
        total_discount = df['total_discount'].sum() if 'total_discount' in df.columns else 0
        
        # 거래 건수 (유니크 영수증 번호 기준)
        total_transactions = df['receipt_number'].nunique()
        
        # 실 고객 수 추정 (영수증 번호 기준, 더 정확한 측정법이 있다면 대체 가능)
        total_customers = total_transactions
        
        # 객단가 (매출 / 거래 건수)
        avg_transaction_value = total_sales / total_transactions if total_transactions > 0 else 0
        
        # 일 평균 매출
        avg_daily_sales = total_sales / days_count if days_count > 0 else 0
        
        # 할인율
        discount_rate = (total_discount / (total_sales + total_discount)) * 100 if (total_sales + total_discount) > 0 else 0
        
        # KPI 요약 객체 구성
        # 매장 이름 처리 - 단일 매장인 경우 해당 매장명 사용
        selected_store = "전체"
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
        
        summary = KPISummary(
            store_name=selected_store,
            total_sales=int(total_sales),
            average_daily_sales=float(avg_daily_sales),
            total_transactions=int(total_transactions),
            average_transaction_value=float(avg_transaction_value),
            total_customers=int(total_customers),
            total_discount_amount=int(total_discount),
            discount_rate=float(discount_rate)
        )
        
        return summary
    
    @staticmethod
    async def get_kpi_trends(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        metric: str = "total_sales"
    ) -> KPITrend:
        """
        일별 KPI 트렌드를 계산합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            metric: 추세를 확인할 지표 (total_sales, transactions, avg_transaction 등)
            
        Returns:
            KPI 트렌드 객체
        """
        # 지표에 따른 데이터 소스 및 집계 방법 결정
        data_source = Tables.DAILY_SALES_SUMMARY
        
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(data_source)\
                .select("date", "total_sales", "actual_sales", "total_discount", "receipt_number", "store_name")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        trend_data = response.data
        
        if not trend_data:
            # 데이터가 없는 경우 모든 날짜에 0값 채우기
            date_range = get_date_range(start_date, end_date)
            
            # 매장명 처리 - 단일 매장인 경우 해당 매장명 사용
            selected_store = "전체"
            if store_name and len(store_name) == 1:
                selected_store = store_name[0]
                
            trend_points = [KPITrendPoint(date=d, store_name=selected_store, value=0.0) for d in date_range]
            return KPITrend(metric=metric, data=trend_points, trend_info={"trend": "flat"})
            
        df = pd.DataFrame(trend_data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 매장명 처리
        if 'store_name' not in df.columns:
            df['store_name'] = '전체'
            
        # 단일 매장 선택 시
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            
            # 날짜별 집계
            daily_data = df.groupby('date').agg({
                'total_sales': 'sum',
                'actual_sales': 'sum',
                'total_discount': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            
            # 매장명 컬럼 추가
            daily_data['store_name'] = selected_store
        else:
            # 전체 매장 또는 여러 매장의 경우 매장별로 집계
            # 각 매장별 데이터 및 전체 합계 데이터 생성
            
            # 1. 매장별 집계
            store_daily_data = df.groupby(['date', 'store_name']).agg({
                'total_sales': 'sum',
                'actual_sales': 'sum',
                'total_discount': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            
            # 2. 전체 집계 (모든 매장 합계)
            total_daily_data = df.groupby('date').agg({
                'total_sales': 'sum',
                'actual_sales': 'sum',
                'total_discount': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            
            # 매장명 컬럼 추가
            total_daily_data['store_name'] = '전체'
            
            # 두 데이터 프레임 합치기
            daily_data = pd.concat([store_daily_data, total_daily_data])
        
        # 추가 계산 필드 추가
        daily_data['avg_transaction'] = daily_data.apply(
            lambda row: row['total_sales'] / row['receipt_number'] if row['receipt_number'] > 0 else 0,
            axis=1
        )
        
        # 지표에 따른 값 필드 결정
        value_field = {
            "total_sales": "total_sales",
            "actual_sales": "actual_sales",
            "total_discount": "total_discount",
            "transactions": "receipt_number",
            "avg_transaction": "avg_transaction"
        }.get(metric, "total_sales")
        
        # 각 매장별로 처리
        trend_points = []
        unique_stores = daily_data['store_name'].unique()
        all_dates = get_date_range(start_date, end_date)
        
        for store in unique_stores:
            # 해당 매장 데이터 필터링
            store_data = daily_data[daily_data['store_name'] == store]
            
            # 날짜별 값 추출
            result_data = store_data[['date', value_field]].values.tolist()
            
            # 결과 데이터 사전 구성
            result_dict = {d.strftime("%Y-%m-%d"): 0 for d in all_dates}
            
            # 실제 데이터로 사전 업데이트
            for day_data in result_data:
                day, value = day_data
                day_str = day.strftime("%Y-%m-%d") if isinstance(day, date) else day
                result_dict[day_str] = float(value)
                
            # 트렌드 포인트 생성
            for day_str, value in sorted(result_dict.items()):
                day = datetime.strptime(day_str, "%Y-%m-%d").date()
                trend_points.append(KPITrendPoint(date=day, store_name=store, value=value))
        
        # 단일 매장 필터링
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            trend_points = [point for point in trend_points if point.store_name == selected_store]
            
        # 트렌드 정보 계산 (간단한 추세 분석) - 전체 데이터 기준
        trend_info = KPIService._calculate_trend_info(trend_points)
            
        return KPITrend(metric=metric, data=trend_points, trend_info=trend_info)
    
    @staticmethod
    def _calculate_trend_info(trend_points: List[KPITrendPoint]) -> Dict[str, Any]:
        """
        트렌드 데이터 분석 정보를 계산합니다.
        
        Args:
            trend_points: 트렌드 포인트 리스트
            
        Returns:
            트렌드 분석 정보
        """
        if not trend_points:
            return {"trend": "unknown"}
            
        values = [point.value for point in trend_points]
        
        # 기본 통계
        mean_value = np.mean(values)
        std_value = np.std(values)
        min_value = np.min(values)
        max_value = np.max(values)
        
        # 성장률 계산
        first_value = values[0] if values[0] != 0 else 0.01  # 0으로 나누기 방지
        last_value = values[-1]
        growth_rate = ((last_value - first_value) / first_value) * 100 if first_value != 0 else 0
        
        # 선형 추세 계산 (기울기)
        days = list(range(len(values)))
        if len(days) > 1:
            # 선형 회귀 계수 계산
            slope, intercept = np.polyfit(days, values, 1)
        else:
            slope, intercept = 0, values[0] if values else 0
        
        # 추세 유형 결정
        if abs(slope) < mean_value * 0.01:
            trend = "flat"  # 평탄 추세
        elif slope > 0:
            if slope > mean_value * 0.1:
                trend = "strong_up"  # 강한 상승 추세
            else:
                trend = "up"  # 완만한 상승 추세
        else:
            if abs(slope) > mean_value * 0.1:
                trend = "strong_down"  # 강한 하락 추세
            else:
                trend = "down"  # 완만한 하락 추세
                
        return {
            "trend": trend,
            "growth_rate": float(growth_rate),
            "slope": float(slope),
            "mean": float(mean_value),
            "std": float(std_value),
            "min": float(min_value),
            "max": float(max_value)
        }
    
    @staticmethod
    async def get_product_kpi(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        top_n: int = 10
    ) -> List[ProductKPI]:
        """
        제품별 KPI를 계산합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            top_n: 상위 제품 수
            
        Returns:
            제품별 KPI 리스트
        """
        # 상세 영수증 데이터에서 제품별 정보 조회
        query = get_table(Tables.RECEIPT_SALES_DETAIL)\
                .select("product_name", "product_code", "quantity", "total_sales", "discount_amount", "actual_sales", "price", "store_name")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        product_data = response.data
        
        if not product_data:
            return []
            
        df = pd.DataFrame(product_data)
        
        # null 값 처리
        numeric_cols = ['quantity', 'total_sales', 'discount_amount', 'actual_sales', 'price']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = df[col].fillna(0)
                
        # 매장명 처리
        if 'store_name' not in df.columns:
            df['store_name'] = '전체'
        else:
            df['store_name'] = df['store_name'].fillna('전체')
            
        # 매장별 집계 여부 결정
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            
            # 제품별 집계 - 선택된 매장만
            product_kpi = df.groupby(['product_name', 'product_code']).agg({
                'quantity': 'sum',
                'total_sales': 'sum',
                'discount_amount': 'sum',
                'actual_sales': 'sum',
                'price': 'mean'  # 평균 단가
            }).reset_index()
            
            # 매장명 추가
            product_kpi['store_name'] = selected_store
        else:
            # 매장별, 제품별 집계
            product_kpi = df.groupby(['product_name', 'product_code', 'store_name']).agg({
                'quantity': 'sum',
                'total_sales': 'sum',
                'discount_amount': 'sum',
                'actual_sales': 'sum',
                'price': 'mean'  # 평균 단가
            }).reset_index()
            
            # 전체 합계도 추가
            total_kpi = df.groupby(['product_name', 'product_code']).agg({
                'quantity': 'sum',
                'total_sales': 'sum',
                'discount_amount': 'sum',
                'actual_sales': 'sum',
                'price': 'mean'  # 평균 단가
            }).reset_index()
            
            # 매장명 추가
            total_kpi['store_name'] = '전체'
            
            # 두 데이터 프레임 합치기
            product_kpi = pd.concat([product_kpi, total_kpi])
        
        # 비율 계산 및 필드 추가
        # 각 매장별로 비율 계산
        result = []
        for store_name, store_group in product_kpi.groupby('store_name'):
            # 해당 매장의 총 매출
            store_total_sales = store_group['total_sales'].sum()
            
            # 매출 비율 계산
            store_group = store_group.copy()  # 경고 방지를 위한 데이터 복사
            store_group['sales_percentage'] = (store_group['total_sales'] / store_total_sales * 100) if store_total_sales > 0 else 0
            store_group['discount_rate'] = (store_group['discount_amount'] / (store_group['total_sales'] + store_group['discount_amount']) * 100)\
                                          .where((store_group['total_sales'] + store_group['discount_amount']) > 0, 0)
            
            # 매출액 기준 내림차순 정렬 후 상위 N개 추출
            store_group = store_group.sort_values('total_sales', ascending=False).head(top_n)
            
            # 결과 변환
            for _, row in store_group.iterrows():
                result.append(ProductKPI(
                    product_name=str(row['product_name']),
                    product_code=str(row['product_code']) if pd.notna(row['product_code']) else None,
                    store_name=store_name,
                    quantity=int(row['quantity']),
                    total_sales=int(row['total_sales']),
                    sales_percentage=float(row['sales_percentage']),
                    average_price=float(row['price']),
                    discount_amount=int(row['discount_amount']),
                    discount_rate=float(row['discount_rate'])
                ))
        
        # 단일 매장만 반환
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            result = [item for item in result if item.store_name == selected_store]
                
        return result
        
    @staticmethod
    async def get_category_kpi(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[CategoryKPI]:
        """
        카테고리별 KPI를 계산합니다. 상품명에서 카테고리를 추출합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            
        Returns:
            카테고리별 KPI 리스트
        """
        # 상세 영수증 데이터에서 제품별 정보 조회
        query = get_table(Tables.RECEIPT_SALES_DETAIL)\
                .select("product_name", "product_code", "total_sales", "price", "store_name")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        product_data = response.data
        
        if not product_data:
            return []
            
        df = pd.DataFrame(product_data)
        
        # 매장명 처리
        if 'store_name' not in df.columns:
            df['store_name'] = '전체'
        else:
            df['store_name'] = df['store_name'].fillna('전체')
            
        # 상품명에서 카테고리 추출 (첫 단어 기준)
        def extract_category(product_name):
            if pd.isna(product_name):
                return "기타"
            # 첫 공백이나 숫자 전까지를 카테고리로 간주
            # 실제로는 더 정교한 카테고리 매핑이 필요할 수 있음
            parts = product_name.split()
            return parts[0] if parts else "기타"
            
        df['category'] = df['product_name'].apply(extract_category)
        
        # 매장별 카테고리 집계 여부 결정
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            df = df[df['store_name'] == selected_store]
            
            # 카테고리별 집계
            category_kpi = df.groupby('category').agg({
                'product_name': 'nunique',  # 제품 종류 수
                'total_sales': 'sum',
                'price': 'mean'
            }).reset_index()
            
            # 매장명 컬럼 추가
            category_kpi['store_name'] = selected_store
        else:
            # 매장별, 카테고리별 집계
            category_kpi = df.groupby(['category', 'store_name']).agg({
                'product_name': 'nunique',  # 제품 종류 수
                'total_sales': 'sum',
                'price': 'mean'
            }).reset_index()
            
            # 전체 합계 데이터 생성
            total_kpi = df.groupby('category').agg({
                'product_name': 'nunique',
                'total_sales': 'sum',
                'price': 'mean'
            }).reset_index()
            
            # 매장명 추가
            total_kpi['store_name'] = '전체'
            
            # 두 데이터프레임 합치기
            category_kpi = pd.concat([category_kpi, total_kpi])
        
        # 비율 계산 및 정렬
        result = []
        
        # 매장별로 비율 계산
        for store_name, store_group in category_kpi.groupby('store_name'):
            # 해당 매장의 총 매출
            store_total_sales = store_group['total_sales'].sum()
            
            # 매출 비율 계산
            store_group = store_group.copy()  # 경고 방지를 위한 데이터 복사
            store_group['sales_percentage'] = (store_group['total_sales'] / store_total_sales * 100) if store_total_sales > 0 else 0
            
            # 매출액 기준 내림차순 정렬
            store_group = store_group.sort_values('total_sales', ascending=False)
            
            # 결과 변환
            for _, row in store_group.iterrows():
                result.append(CategoryKPI(
                    category=str(row['category']),
                    store_name=store_name,
                    product_count=int(row['product_name']),
                    total_sales=int(row['total_sales']),
                    sales_percentage=float(row['sales_percentage']),
                    average_price=float(row['price'])
                ))
        
        # 단일 매장만 반환
        if store_name and len(store_name) == 1:
            selected_store = store_name[0]
            result = [item for item in result if item.store_name == selected_store]
                
        return result

# 서비스 인스턴스 생성 (의존성 주입용)
kpi_service = KPIService()
