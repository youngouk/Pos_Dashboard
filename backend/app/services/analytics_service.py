## analytics_service.py

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Union, Tuple
import pandas as pd
import numpy as np

from app.core.database import get_table, Tables
from app.utils.date_utils import get_date_range
from app.utils.data_processing import (
    detect_anomalies_zscore,
    detect_anomalies_iqr,
    calculate_correlation,
    process_time_series
)
from app.models.analytics import (
    AnomalyPoint,
    AnomalyResponse,
    CorrelationPoint,
    CorrelationResponse,
    PatternPoint,
    PatternResponse
)

# 분석 서비스
class AnalyticsService:
    """고급 데이터 분석 서비스"""
    
    @staticmethod
    async def detect_sales_anomalies(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        metric: str = "total_sales",
        method: str = "zscore",
        threshold: float = 3.0
    ) -> AnomalyResponse:
        """
        매출 이상치를 감지합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            metric: 분석할 지표 (total_sales, transactions, avg_transaction 등)
            method: 이상치 감지 방법 (zscore, iqr)
            threshold: 이상치 감지 임계값
            
        Returns:
            이상치 감지 결과
        """
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("date", "total_sales", "actual_sales", "receipt_number")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return AnomalyResponse(metric=metric, data=[], anomaly_count=0, method=method, threshold=threshold)
        
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 날짜별 집계
        if metric == "total_sales" or metric == "actual_sales":
            # 이미 일별 데이터가 있으므로 단순 합계만 계산
            daily_data = df.groupby('date')[metric].sum().reset_index()
            value_field = metric
        elif metric == "transactions":
            # 영수증 번호 기준 거래 건수 집계
            daily_data = df.groupby('date')['receipt_number'].nunique().reset_index()
            daily_data.rename(columns={'receipt_number': 'transactions'}, inplace=True)
            value_field = 'transactions'
        elif metric == "avg_transaction":
            # 평균 거래 금액 계산
            daily_agg = df.groupby('date').agg({
                'total_sales': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            daily_agg['avg_transaction'] = daily_agg['total_sales'] / daily_agg['receipt_number'].replace(0, np.nan)
            daily_data = daily_agg[['date', 'avg_transaction']].copy()
            value_field = 'avg_transaction'
        else:
            # 기본값은 total_sales
            daily_data = df.groupby('date')['total_sales'].sum().reset_index()
            value_field = 'total_sales'
        
        # 이상치 감지 메소드 선택 및 적용
        daily_list = daily_data.to_dict('records')
        
        if method.lower() == 'iqr':
            anomaly_data = detect_anomalies_iqr(daily_list, value_field, threshold)
        else:  # 기본값은 zscore
            anomaly_data = detect_anomalies_zscore(daily_list, value_field, 'date', threshold)
        
        # 이상치 데이터 포인트 변환
        anomaly_points = []
        for point in anomaly_data:
            anomaly_points.append(AnomalyPoint(
                date=point['date'],
                value=float(point[value_field]),
                expected_value=float(point['expected_value']),
                z_score=float(point.get('z_score', 0.0)),
                is_anomaly=bool(point['is_anomaly'])
            ))
        
        # 이상치 개수 계산
        anomaly_count = sum(1 for point in anomaly_points if point.is_anomaly)
        
        # 결과 반환
        return AnomalyResponse(
            metric=metric,
            data=anomaly_points,
            anomaly_count=anomaly_count,
            method=method,
            threshold=threshold
        )
        
    @staticmethod
    async def analyze_correlations(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        variables: List[str] = None,
        method: str = "pearson"
    ) -> CorrelationResponse:
        """
        변수 간 상관관계를 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            variables: 분석할 변수 리스트 (기본값: 매출, 거래건수, 할인금액)
            method: 상관계수 계산 방법 (pearson, spearman)
            
        Returns:
            상관관계 분석 결과
        """
        # 기본 분석 변수 설정
        if not variables:
            variables = ["total_sales", "transaction_count", "discount_amount"]
            
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("date", "total_sales", "actual_sales", "total_discount", "receipt_number")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return CorrelationResponse(
                method=method,
                data=[],
                matrix={},
                insights=["데이터가 충분하지 않아 상관관계 분석을 할 수 없습니다."]
            )
        
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 추가 계산 필드 및 필드명 매핑
        df['transaction_count'] = df.groupby('date')['receipt_number'].transform('nunique')
        df['discount_amount'] = df['total_discount']
        df['avg_transaction'] = df['total_sales'] / df['transaction_count'].replace(0, np.nan)
        
        # 분석 변수 매핑 (API 변수명 -> DB 필드명)
        variable_map = {
            "total_sales": "total_sales",
            "actual_sales": "actual_sales",
            "discount_amount": "discount_amount",
            "transaction_count": "transaction_count",
            "avg_transaction": "avg_transaction"
        }
        
        # 필드명 정규화
        normalized_variables = [variable_map.get(v, v) for v in variables if variable_map.get(v, v) in df.columns]
        
        # 사용 가능한 변수가 없는 경우 기본 변수로 대체
        if not normalized_variables:
            normalized_variables = ["total_sales", "transaction_count"]
            if "discount_amount" in df.columns:
                normalized_variables.append("discount_amount")
        
        # 날짜별 집계
        agg_dict = {var: 'sum' for var in normalized_variables if var != 'avg_transaction'}
        if 'avg_transaction' in normalized_variables:
            # 평균 거래 금액은 날짜별 총 매출 / 거래 건수로 계산
            agg_dict['total_sales'] = 'sum'
            agg_dict['transaction_count'] = 'mean'  # 이미 nunique가 적용된 필드
            
        daily_data = df.groupby('date').agg(agg_dict).reset_index()
        
        # 평균 거래 금액 계산 (집계 후)
        if 'avg_transaction' in normalized_variables and 'avg_transaction' not in daily_data.columns:
            daily_data['avg_transaction'] = daily_data['total_sales'] / daily_data['transaction_count'].replace(0, np.nan)
        
        # 상관계수 계산을 위한 데이터 준비
        corr_data = daily_data[normalized_variables].copy()
        
        # 결측치 처리
        corr_data = corr_data.fillna(0)
        
        # 상관계수 행렬 계산
        if method.lower() == 'spearman':
            corr_matrix = corr_data.corr(method='spearman')
        else:  # 기본값은 pearson
            corr_matrix = corr_data.corr(method='pearson')
        
        # 상관계수 행렬을 딕셔너리로 변환
        matrix_dict = {}
        for var1 in normalized_variables:
            matrix_dict[var1] = {}
            for var2 in normalized_variables:
                matrix_dict[var1][var2] = float(corr_matrix.loc[var1, var2])
        
        # 변수 쌍별 상관계수 및 p-value 계산
        corr_points = []
        for i, var1 in enumerate(normalized_variables):
            for j, var2 in enumerate(normalized_variables):
                if i < j:  # 중복 피하기
                    corr, p_value = calculate_correlation(
                        corr_data[var1].values,
                        corr_data[var2].values,
                        method
                    )
                    
                    significance = p_value < 0.05  # 통계적 유의성 기준
                    
                    corr_points.append(CorrelationPoint(
                        variable1=var1,
                        variable2=var2,
                        correlation=float(corr),
                        p_value=float(p_value),
                        significance=significance
                    ))
        
        # 상관관계 통찰 도출
        insights = AnalyticsService._generate_correlation_insights(corr_points)
        
        # 결과 반환
        return CorrelationResponse(
            method=method,
            data=sorted(corr_points, key=lambda x: abs(x.correlation), reverse=True),
            matrix=matrix_dict,
            insights=insights
        )
    
    @staticmethod
    def _generate_correlation_insights(corr_points: List[CorrelationPoint]) -> List[str]:
        """
        상관관계 데이터에서 통찰을 도출합니다.
        
        Args:
            corr_points: 상관관계 포인트 리스트
            
        Returns:
            통찰 문장 리스트
        """
        insights = []
        
        # 유의한 상관관계만 필터링
        significant_corrs = [p for p in corr_points if p.significance]
        
        # 강한 상관관계 탐지 (절대값 0.7 이상)
        strong_corrs = [p for p in significant_corrs if abs(p.correlation) >= 0.7]
        
        # 중간 상관관계 탐지 (절대값 0.4~0.7)
        medium_corrs = [p for p in significant_corrs if 0.4 <= abs(p.correlation) < 0.7]
        
        # 통찰 추가
        for corr in strong_corrs:
            direction = "양의" if corr.correlation > 0 else "음의"
            insights.append(
                f"{corr.variable1}와(과) {corr.variable2} 사이에 강한 {direction} 상관관계가 있습니다 "
                f"(상관계수: {corr.correlation:.2f})"
            )
            
        for corr in medium_corrs:
            direction = "양의" if corr.correlation > 0 else "음의"
            insights.append(
                f"{corr.variable1}와(과) {corr.variable2} 사이에 중간 정도의 {direction} 상관관계가 있습니다 "
                f"(상관계수: {corr.correlation:.2f})"
            )
            
        # 데이터가 부족한 경우
        if not significant_corrs:
            insights.append("통계적으로 유의한 상관관계를 찾을 수 없습니다. 더 많은, 또는 더 다양한 데이터가 필요할 수 있습니다.")
            
        # 상관관계가 없는 변수들
        if len(significant_corrs) < len(corr_points):
            insights.append("일부 변수 간에는 유의미한 상관관계가 발견되지 않았습니다.")
            
        return insights

    @staticmethod
    async def analyze_patterns(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        pattern_type: str = "hourly"
    ) -> PatternResponse:
        """
        데이터 패턴을 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            pattern_type: 패턴 유형 (hourly, daily, weekly, monthly, product)
            
        Returns:
            패턴 분석 결과
        """
        # 패턴 유형에 따른 분석 방법 선택
        if pattern_type == "hourly":
            return await AnalyticsService._analyze_hourly_pattern(start_date, end_date, store_name)
        elif pattern_type == "daily":
            return await AnalyticsService._analyze_daily_pattern(start_date, end_date, store_name)
        elif pattern_type == "weekly":
            return await AnalyticsService._analyze_weekly_pattern(start_date, end_date, store_name)
        elif pattern_type == "monthly":
            return await AnalyticsService._analyze_monthly_pattern(start_date, end_date, store_name)
        elif pattern_type == "product":
            return await AnalyticsService._analyze_product_pattern(start_date, end_date, store_name)
        else:
            # 기본값은 시간대별 패턴
            return await AnalyticsService._analyze_hourly_pattern(start_date, end_date, store_name)
            
    @staticmethod
    async def _analyze_hourly_pattern(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> PatternResponse:
        """
        시간대별 패턴을 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터
            
        Returns:
            시간대별 패턴 분석 결과
        """
        # 상세 영수증 데이터에서 시간대별 정보 조회
        query = get_table(Tables.RECEIPT_SALES_DETAIL)\
                .select("payment_time", "total_sales", "receipt_number", "product_name")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return PatternResponse(
                pattern_type="hourly",
                data=[],
                insights=["데이터가 충분하지 않아 시간대별 패턴 분석을 할 수 없습니다."]
            )
            
        df = pd.DataFrame(data)
        
        # 결제 시간 파싱 및 시간 추출
        df['payment_time'] = pd.to_datetime(df['payment_time'])
        df['hour'] = df['payment_time'].dt.hour
        
        # 영수증 번호로 중복 제거 (동일 영수증의 여러 품목 제거)
        unique_receipts = df.drop_duplicates(subset=['receipt_number'])
        
        # 시간대별 집계
        hourly_data = unique_receipts.groupby('hour').agg({
            'total_sales': 'sum',
            'receipt_number': 'count'
        }).reset_index()
        
        # 결과 변환
        pattern_points = []
        for _, row in hourly_data.iterrows():
            pattern_points.append(PatternPoint(
                x=int(row['hour']),
                y=float(row['total_sales'])
            ))
            
        # 모든 시간대 채우기
        all_hours = {h: 0 for h in range(24)}
        for point in pattern_points:
            all_hours[point.x] = point.y
            
        # 완전한 패턴 포인트 생성
        complete_points = [PatternPoint(x=h, y=v) for h, v in sorted(all_hours.items())]
            
        # 패턴 통찰 도출
        insights = AnalyticsService._generate_hourly_pattern_insights(hourly_data)
        
        # 결과 반환
        return PatternResponse(
            pattern_type="hourly",
            data=complete_points,
            insights=insights
        )

    @staticmethod
    def _generate_hourly_pattern_insights(hourly_data: pd.DataFrame) -> List[str]:
        """
        시간대별 패턴에서 통찰을 도출합니다.
        
        Args:
            hourly_data: 시간대별 데이터
            
        Returns:
            통찰 문장 리스트
        """
        insights = []
        
        # 데이터가 충분한지 확인
        if hourly_data.empty or len(hourly_data) < 3:
            return ["시간대별 패턴 분석을 위한 데이터가 충분하지 않습니다."]
        
        try:
            # 피크 시간 탐지
            peak_hour = hourly_data.loc[hourly_data['total_sales'].idxmax()]
            peak_hour_val = int(peak_hour['hour'])
            
            # 저점 시간 탐지 (영업 시간 중)
            business_hours = hourly_data[(hourly_data['hour'] >= 7) & (hourly_data['hour'] <= 22)]
            if not business_hours.empty:
                low_hour = business_hours.loc[business_hours['total_sales'].idxmin()]
                low_hour_val = int(low_hour['hour'])
            else:
                low_hour_val = None
            
            # 아침/점심/저녁 시간대 분류
            morning_sales = hourly_data[(hourly_data['hour'] >= 6) & (hourly_data['hour'] < 11)]['total_sales'].sum()
            lunch_sales = hourly_data[(hourly_data['hour'] >= 11) & (hourly_data['hour'] < 15)]['total_sales'].sum()
            dinner_sales = hourly_data[(hourly_data['hour'] >= 17) & (hourly_data['hour'] < 21)]['total_sales'].sum()
            late_sales = hourly_data[(hourly_data['hour'] >= 21) | (hourly_data['hour'] < 6)]['total_sales'].sum()
            
            total_sales = hourly_data['total_sales'].sum()
            
            # 통찰 추가
            if peak_hour_val is not None:
                am_pm = "오전" if peak_hour_val < 12 else "오후"
                display_hour = peak_hour_val if peak_hour_val <= 12 else peak_hour_val - 12
                insights.append(f"매출이 가장 높은 시간대는 {am_pm} {display_hour}시입니다.")
                
            if low_hour_val is not None:
                am_pm = "오전" if low_hour_val < 12 else "오후"
                display_hour = low_hour_val if low_hour_val <= 12 else low_hour_val - 12
                insights.append(f"영업 시간 중 매출이 가장 낮은 시간대는 {am_pm} {display_hour}시입니다.")
            
            # 시간대별 비중 통찰
            if total_sales > 0:
                morning_pct = (morning_sales / total_sales) * 100
                lunch_pct = (lunch_sales / total_sales) * 100
                dinner_pct = (dinner_sales / total_sales) * 100
                late_pct = (late_sales / total_sales) * 100
                
                time_insights = []
                if lunch_pct > 40:
                    time_insights.append(f"점심 시간대({lunch_pct:.1f}%)가 매출의 큰 비중을 차지합니다.")
                if dinner_pct > 40:
                    time_insights.append(f"저녁 시간대({dinner_pct:.1f}%)가 매출의 큰 비중을 차지합니다.")
                if morning_pct > 25:
                    time_insights.append(f"아침 시간대({morning_pct:.1f}%)의 매출 비중이 높습니다.")
                if late_pct > 15:
                    time_insights.append(f"야간 시간대({late_pct:.1f}%)의 매출 비중이 상당합니다.")
                    
                if time_insights:
                    insights.extend(time_insights)
                else:
                    insights.append("시간대별 매출 분포가 비교적 고르게 분포되어 있습니다.")
                    
        except Exception as e:
            insights.append(f"시간대별 패턴 분석 중 오류가 발생했습니다: {str(e)}")
            
        return insights
        
    @staticmethod
    async def _analyze_daily_pattern(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> PatternResponse:
        """
        요일별 패턴을 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터
            
        Returns:
            요일별 패턴 분석 결과
        """
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("date", "total_sales", "receipt_number")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
        
        # 매장 필터 추가
        if store_name:
            query = query.in_("store_name", store_name)
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return PatternResponse(
                pattern_type="daily",
                data=[],
                insights=["데이터가 충분하지 않아 요일별 패턴 분석을 할 수 없습니다."]
            )
            
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 요일 추출
        df['date'] = pd.to_datetime(df['date'])
        df['weekday'] = df['date'].dt.weekday  # 0=월요일, 6=일요일
        
        # 요일별 집계
        daily_data = df.groupby('weekday').agg({
            'total_sales': 'sum',
            'receipt_number': 'nunique'
        }).reset_index()
        
        # 결과 변환
        pattern_points = []
        weekday_names = ['월', '화', '수', '목', '금', '토', '일']
        
        for _, row in daily_data.iterrows():
            weekday_idx = int(row['weekday'])
            pattern_points.append(PatternPoint(
                x=weekday_names[weekday_idx],
                y=float(row['total_sales'])
            ))
            
        # 모든 요일 채우기
        all_weekdays = {day: 0 for day in weekday_names}
        for point in pattern_points:
            all_weekdays[point.x] = point.y
            
        # 요일 순서대로 완전한 패턴 포인트 생성
        complete_points = [PatternPoint(x=day, y=all_weekdays[day]) for day in weekday_names]
            
        # 패턴 통찰 도출
        weekday_map = {i: name for i, name in enumerate(weekday_names)}
        daily_data['weekday_name'] = daily_data['weekday'].map(weekday_map)
        insights = AnalyticsService._generate_daily_pattern_insights(daily_data)
        
        # 결과 반환
        return PatternResponse(
            pattern_type="daily",
            data=complete_points,
            insights=insights
        )

    @staticmethod
    def _generate_daily_pattern_insights(daily_data: pd.DataFrame) -> List[str]:
        """
        요일별 패턴에서 통찰을 도출합니다.
        
        Args:
            daily_data: 요일별 데이터
            
        Returns:
            통찰 문장 리스트
        """
        insights = []
        
        # 데이터가 충분한지 확인
        if daily_data.empty or len(daily_data) < 3:
            return ["요일별 패턴 분석을 위한 데이터가 충분하지 않습니다."]
        
        try:
            # 피크 요일 탐지
            peak_day = daily_data.loc[daily_data['total_sales'].idxmax()]
            peak_day_name = peak_day['weekday_name']
            
            # 저점 요일 탐지
            low_day = daily_data.loc[daily_data['total_sales'].idxmin()]
            low_day_name = low_day['weekday_name']
            
            # 주중 vs 주말 비교
            weekday_data = daily_data[daily_data['weekday'] < 5]  # 월-금
            weekend_data = daily_data[daily_data['weekday'] >= 5]  # 토-일
            
            weekday_sales = weekday_data['total_sales'].sum()
            weekend_sales = weekend_data['total_sales'].sum()
            
            # 요일별 평균 계산
            weekday_avg = weekday_sales / max(len(weekday_data), 1)
            weekend_avg = weekend_sales / max(len(weekend_data), 1)
            
            # 통찰 추가
            insights.append(f"매출이 가장 높은 요일은 {peak_day_name}요일입니다.")
            insights.append(f"매출이 가장 낮은 요일은 {low_day_name}요일입니다.")
            
            # 주중/주말 비교 통찰
            if weekend_avg > weekday_avg * 1.3:  # 주말 매출이 주중보다 30% 이상 높음
                insights.append(f"주말 평균 매출({weekend_avg:.0f})이 주중 평균 매출({weekday_avg:.0f})보다 높습니다.")
            elif weekday_avg > weekend_avg * 1.3:  # 주중 매출이 주말보다 30% 이상 높음
                insights.append(f"주중 평균 매출({weekday_avg:.0f})이 주말 평균 매출({weekend_avg:.0f})보다 높습니다.")
            else:
                insights.append("주중과 주말의 평균 매출은 비슷한 수준입니다.")
                
            # 변동성 분석
            std_dev = daily_data['total_sales'].std()
            mean_sales = daily_data['total_sales'].mean()
            cv = (std_dev / mean_sales) * 100 if mean_sales > 0 else 0
            
            if cv > 30:
                insights.append("요일별 매출 변동성이 높아 요일에 따른 수요 차이가 큽니다.")
            elif cv < 15:
                insights.append("요일별 매출 변동성이 낮아 수요가 안정적입니다.")
                
        except Exception as e:
            insights.append(f"요일별 패턴 분석 중 오류가 발생했습니다: {str(e)}")
            
        return insights

# 서비스 인스턴스 생성 (의존성 주입용)
analytics_service = AnalyticsService()
