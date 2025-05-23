## trends_service.py

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.arima.model import ARIMA
import warnings

from app.core.database import get_table, Tables
from app.utils.date_utils import get_date_range
from app.models.trends import (
    TimeSeriesPoint,
    TimeSeriesResponse,
    ForecastPoint,
    ForecastResponse,
    SeasonalityResponse
)

# 트렌드 분석 서비스
class TrendsService:
    """시계열 트렌드 분석 서비스"""
    
    # 메모리 캐시 (계산 비용이 큰 분석 결과 저장)
    _cache = {}
    
    @staticmethod
    async def get_time_series(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        metric: str = "total_sales"
    ) -> TimeSeriesResponse:
        """
        시계열 데이터를 조회하고 트렌드를 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            metric: 분석할 지표 (total_sales, transactions, avg_transaction 등)
            
        Returns:
            시계열 트렌드 응답
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
            return TimeSeriesResponse(
                metric=metric,
                actual_data=[],
                trend_type="unknown",
                trend_info={"error": "데이터가 충분하지 않습니다."}
            )
        
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 지표에 따른 데이터 집계
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
        
        # 모든 날짜에 대한 데이터 생성 (누락된 날짜는 0으로 채움)
        all_dates = pd.DataFrame({
            'date': get_date_range(start_date, end_date)
        })
        
        merged_data = pd.merge(
            all_dates, 
            daily_data, 
            on='date', 
            how='left'
        ).fillna(0)
        
        # 트렌드 분석
        trend_type, trend_info = TrendsService._analyze_trend(merged_data, value_field)
        
        # 결과 변환
        time_series_points = []
        for _, row in merged_data.iterrows():
            time_series_points.append(TimeSeriesPoint(
                date=row['date'],
                value=float(row[value_field])
            ))
        
        # 결과 반환
        return TimeSeriesResponse(
            metric=metric,
            actual_data=time_series_points,
            trend_type=trend_type,
            trend_info=trend_info
        )
    
    @staticmethod
    def _analyze_trend(data: pd.DataFrame, value_field: str) -> Tuple[str, Dict[str, Any]]:
        """
        시계열 데이터의 트렌드를 분석합니다.
        
        Args:
            data: 날짜별 데이터 데이터프레임
            value_field: 값 필드명
            
        Returns:
            (트렌드 유형, 트렌드 정보) 튜플
        """
        if len(data) < 7:
            return "unknown", {"error": "트렌드 분석을 위한 데이터가 충분하지 않습니다."}
        
        try:
            # 트렌드 분석을 위한 시계열 데이터 준비
            time_series = data[value_field].values
            
            # 선형 추세 계산
            x = np.arange(len(time_series))
            slope, intercept = np.polyfit(x, time_series, 1)
            
            # 선형 트렌드 값 계산
            trend_values = intercept + slope * x
            
            # 트렌드 유형 결정
            # 시작과 끝의 값 차이로 전체적인 방향 확인
            start_val = trend_values[0]
            end_val = trend_values[-1]
            
            if abs(end_val - start_val) < 0.1 * np.mean(time_series):
                trend_type = "flat"  # 평탄한 추세
            elif end_val > start_val:
                trend_type = "increasing"  # 증가 추세
            else:
                trend_type = "decreasing"  # 감소 추세
            
            # 계절성 체크 (충분한 데이터가 있는 경우)
            seasonality_info = {}
            if len(time_series) >= 14:  # 최소 2주 이상 데이터가 필요
                try:
                    # 주별 계절성 확인
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore")
                        decomposition = seasonal_decompose(
                            time_series, 
                            model='additive', 
                            period=7  # 7일 주기
                        )
                    seasonal = decomposition.seasonal
                    seasonality_strength = np.std(seasonal) / np.std(time_series - np.mean(time_series))
                    
                    if seasonality_strength > 0.2:
                        trend_type = "seasonal"  # 계절성 추세
                        seasonality_info = {
                            "seasonality_strength": float(seasonality_strength),
                            "period": 7,
                            "period_type": "weekly"
                        }
                except Exception:
                    # 계절성 분석 실패 시 무시
                    pass
            
            # 결과 정보
            trend_info = {
                "slope": float(slope),
                "intercept": float(intercept),
                "start_value": float(start_val),
                "end_value": float(end_val),
                "change_percent": float((end_val - start_val) / start_val * 100) if start_val != 0 else 0.0
            }
            
            # 계절성 정보 추가
            if seasonality_info:
                trend_info["seasonality"] = seasonality_info
            
            return trend_type, trend_info
            
        except Exception as e:
            return "error", {"error": f"트렌드 분석 중 오류가 발생했습니다: {str(e)}"}
    
    @staticmethod
    async def get_forecast(
        start_date: date,
        end_date: date,
        forecast_days: int = 30,
        store_name: Optional[List[str]] = None,
        metric: str = "total_sales"
    ) -> ForecastResponse:
        """
        시계열 데이터 예측을 수행합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            forecast_days: 예측할 미래 일수
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            metric: 예측할 지표
            
        Returns:
            예측 응답
        """
        # 캐시 키 생성
        cache_key = f"forecast_{start_date}_{end_date}_{forecast_days}_{store_name}_{metric}"
        if cache_key in TrendsService._cache:
            return TrendsService._cache[cache_key]
        
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
        
        if not data or len(data) < 14:  # 최소 2주 데이터 필요
            # 데이터가 없는 경우 빈 응답 반환
            return ForecastResponse(
                metric=metric,
                historical_data=[],
                forecast_data=[],
                forecast_info={"error": "예측을 위한 충분한 데이터가 없습니다."}
            )
        
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 지표에 따른 데이터 집계
        if metric == "total_sales" or metric == "actual_sales":
            daily_data = df.groupby('date')[metric].sum().reset_index()
            value_field = metric
        elif metric == "transactions":
            daily_data = df.groupby('date')['receipt_number'].nunique().reset_index()
            daily_data.rename(columns={'receipt_number': 'transactions'}, inplace=True)
            value_field = 'transactions'
        elif metric == "avg_transaction":
            daily_agg = df.groupby('date').agg({
                'total_sales': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            daily_agg['avg_transaction'] = daily_agg['total_sales'] / daily_agg['receipt_number'].replace(0, np.nan)
            daily_data = daily_agg[['date', 'avg_transaction']].copy()
            value_field = 'avg_transaction'
        else:
            daily_data = df.groupby('date')['total_sales'].sum().reset_index()
            value_field = 'total_sales'
        
        # 모든 날짜에 대한 데이터 생성 (누락된 날짜는 0으로 채움)
        all_dates = pd.DataFrame({
            'date': get_date_range(start_date, end_date)
        })
        
        merged_data = pd.merge(
            all_dates, 
            daily_data, 
            on='date', 
            how='left'
        ).fillna(0)
        
        # 시계열 예측 수행
        forecast_result = None
        try:
            # ARIMA 모델 예측 (간단한 시계열 예측)
            time_series = merged_data[value_field].values
            
            # 차분 정도와 자기회귀 차수 추정
            d = 1  # 일반적으로 일별 데이터는 1차 차분
            p = 7  # 일주일 주기 자기회귀
            q = 1  # 이동평균 차수
            
            # ARIMA 모델 학습
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore")
                model = ARIMA(time_series, order=(p, d, q))
                model_fit = model.fit()
            
            # 미래 예측
            forecast_values = model_fit.forecast(steps=forecast_days)
            forecast_index = pd.date_range(start=end_date + timedelta(days=1), periods=forecast_days)
            
            # 신뢰구간 계산 (표준편차의 2배 범위)
            std_dev = np.std(time_series)
            upper_bound = forecast_values + 2 * std_dev
            lower_bound = forecast_values - 2 * std_dev
            lower_bound = np.maximum(lower_bound, 0)  # 음수 값 방지
            
            # 예측 결과 데이터프레임 생성
            forecast_df = pd.DataFrame({
                'date': forecast_index.date,
                'value': forecast_values,
                'upper_bound': upper_bound,
                'lower_bound': lower_bound
            })
            
            forecast_result = forecast_df
            
        except Exception as e:
            # 예측 실패 시 간단한 선형 회귀 이용
            try:
                time_series = merged_data[value_field].values
                x = np.arange(len(time_series))
                slope, intercept = np.polyfit(x, time_series, 1)
                
                # 선형 추세로 예측
                forecast_values = []
                upper_bounds = []
                lower_bounds = []
                forecast_dates = []
                
                for i in range(1, forecast_days + 1):
                    pred_x = len(time_series) + i - 1
                    pred_value = intercept + slope * pred_x
                    
                    # 음수 예측값 방지
                    pred_value = max(0, pred_value)
                    
                    # 오차 범위 계산 (표준편차 활용)
                    std_dev = np.std(time_series)
                    upper = pred_value + 2 * std_dev
                    lower = max(0, pred_value - 2 * std_dev)
                    
                    forecast_date = end_date + timedelta(days=i)
                    
                    forecast_values.append(pred_value)
                    upper_bounds.append(upper)
                    lower_bounds.append(lower)
                    forecast_dates.append(forecast_date)
                
                forecast_df = pd.DataFrame({
                    'date': forecast_dates,
                    'value': forecast_values,
                    'upper_bound': upper_bounds,
                    'lower_bound': lower_bounds
                })
                
                forecast_result = forecast_df
                
            except Exception as inner_e:
                # 모든 예측이 실패한 경우
                return ForecastResponse(
                    metric=metric,
                    historical_data=[TimeSeriesPoint(date=row['date'], value=float(row[value_field])) 
                                    for _, row in merged_data.iterrows()],
                    forecast_data=[],
                    forecast_info={"error": f"예측에 실패했습니다: {str(inner_e)}"}
                )
        
        # 결과 변환
        historical_points = []
        for _, row in merged_data.iterrows():
            historical_points.append(TimeSeriesPoint(
                date=row['date'],
                value=float(row[value_field])
            ))
        
        forecast_points = []
        for _, row in forecast_result.iterrows():
            forecast_points.append(ForecastPoint(
                date=row['date'],
                value=float(row['value']),
                upper_bound=float(row['upper_bound']),
                lower_bound=float(row['lower_bound'])
            ))
        
        # 예측 정보
        forecast_info = {
            "forecast_start": (end_date + timedelta(days=1)).isoformat(),
            "forecast_end": (end_date + timedelta(days=forecast_days)).isoformat(),
            "forecast_days": forecast_days,
            "average_forecast": float(np.mean(forecast_result['value'])),
            "forecast_method": "ARIMA" if "model_fit" in locals() else "LinearRegression"
        }
        
        # 응답 생성
        response = ForecastResponse(
            metric=metric,
            historical_data=historical_points,
            forecast_data=forecast_points,
            forecast_info=forecast_info
        )
        
        # 캐시에 결과 저장
        TrendsService._cache[cache_key] = response
        
        return response
    
    @staticmethod
    async def get_seasonality(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None,
        period_type: str = "weekly",
        metric: str = "total_sales"
    ) -> SeasonalityResponse:
        """
        데이터의 계절성을 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 매장 이름 필터 (None인 경우 모든 매장)
            period_type: 주기 유형 (weekly, monthly)
            metric: 분석할 지표
            
        Returns:
            계절성 분석 응답
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
        
        # 데이터가 부족한 경우
        min_data_points = 14 if period_type == "weekly" else 60  # 주간 2주, 월간 2개월
        if not data or len(data) < min_data_points:
            return SeasonalityResponse(
                period_type=period_type,
                seasonal_components=[],
                strength=0.0,
                insights=["계절성 분석을 위한 충분한 데이터가 없습니다."]
            )
        
        df = pd.DataFrame(data)
        
        # 날짜 파싱 및 정렬
        df['date'] = pd.to_datetime(df['date'])
        
        # 지표에 따른 데이터 집계
        if metric == "total_sales" or metric == "actual_sales":
            daily_data = df.groupby('date')[metric].sum().reset_index()
            value_field = metric
        elif metric == "transactions":
            daily_data = df.groupby('date')['receipt_number'].nunique().reset_index()
            daily_data.rename(columns={'receipt_number': 'transactions'}, inplace=True)
            value_field = 'transactions'
        elif metric == "avg_transaction":
            daily_agg = df.groupby('date').agg({
                'total_sales': 'sum',
                'receipt_number': 'nunique'
            }).reset_index()
            daily_agg['avg_transaction'] = daily_agg['total_sales'] / daily_agg['receipt_number'].replace(0, np.nan)
            daily_data = daily_agg[['date', 'avg_transaction']].copy()
            value_field = 'avg_transaction'
        else:
            daily_data = df.groupby('date')['total_sales'].sum().reset_index()
            value_field = 'total_sales'
        
        # 인덱스를 날짜로 설정
        daily_data = daily_data.set_index('date')
        
        # 요일별 계절성 계산 (주간 패턴)
        if period_type == "weekly":
            # 요일 추출
            daily_data['weekday'] = daily_data.index.weekday  # 0=월요일, 6=일요일
            
            # 요일별 평균 계산
            weekday_avg = daily_data.groupby('weekday')[value_field].mean()
            
            # 요일별 상대적 계절성 계산 (전체 평균 대비)
            overall_avg = weekday_avg.mean()
            weekday_seasonality = weekday_avg / overall_avg - 1  # 편차 비율
            
            # 결과 변환
            seasonal_components = []
            weekday_names = ['월', '화', '수', '목', '금', '토', '일']
            
            for i, value in enumerate(weekday_seasonality):
                seasonal_components.append({
                    "period": weekday_names[i],
                    "value": float(value)
                })
            
            # 계절성 강도 계산
            seasonality_strength = float(weekday_seasonality.std())
            
            # 통찰 도출
            insights = []
            max_day = weekday_seasonality.idxmax()
            min_day = weekday_seasonality.idxmin()
            
            insights.append(f"가장 매출이 높은 요일은 {weekday_names[max_day]}요일로, 평균보다 {weekday_seasonality[max_day]*100:.1f}% 높습니다.")
            insights.append(f"가장 매출이 낮은 요일은 {weekday_names[min_day]}요일로, 평균보다 {-weekday_seasonality[min_day]*100:.1f}% 낮습니다.")
            
            if seasonality_strength > 0.3:
                insights.append("요일별 매출 편차가 매우 큽니다. 요일에 따라 직원 배치와 재고를 조정하는 것이 좋습니다.")
            elif seasonality_strength > 0.15:
                insights.append("요일별 매출 패턴이 뚜렷하게 나타납니다.")
            else:
                insights.append("요일별 매출 편차가 크지 않아 요일에 따른 매출 변동성이 낮습니다.")
        
        # 월별 계절성 계산
        elif period_type == "monthly":
            # 월 추출
            daily_data['month'] = daily_data.index.month
            
            # 월별 평균 계산
            monthly_avg = daily_data.groupby('month')[value_field].mean()
            
            # 월별 상대적 계절성 계산 (전체 평균 대비)
            overall_avg = monthly_avg.mean()
            monthly_seasonality = monthly_avg / overall_avg - 1  # 편차 비율
            
            # 결과 변환
            seasonal_components = []
            month_names = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
            
            for i, value in enumerate(monthly_seasonality, 1):
                if i in monthly_seasonality.index:  # 해당 월 데이터가 있는 경우만
                    seasonal_components.append({
                        "period": month_names[i-1],
                        "value": float(monthly_seasonality[i])
                    })
            
            # 계절성 강도 계산
            seasonality_strength = float(monthly_seasonality.std())
            
            # 통찰 도출
            insights = []
            if len(monthly_seasonality) >= 6:  # 최소 6개월 데이터가 있는 경우
                max_month = monthly_seasonality.idxmax()
                min_month = monthly_seasonality.idxmin()
                
                insights.append(f"가장 매출이 높은 달은 {month_names[max_month-1]}로, 평균보다 {monthly_seasonality[max_month]*100:.1f}% 높습니다.")
                insights.append(f"가장 매출이 낮은 달은 {month_names[min_month-1]}로, 평균보다 {-monthly_seasonality[min_month]*100:.1f}% 낮습니다.")
                
                if seasonality_strength > 0.25:
                    insights.append("월별 매출 편차가 매우 큽니다. 계절성을 고려한 연간 계획이 중요합니다.")
                elif seasonality_strength > 0.1:
                    insights.append("월별 매출 패턴이 뚜렷하게 나타납니다.")
                else:
                    insights.append("월별 매출 편차가 크지 않아 연중 비교적 안정적인 매출을 보입니다.")
            else:
                insights.append("월별 패턴 분석을 위한 충분한 데이터가 없습니다.")
        
        # 기본 기간 (주간)
        else:
            return await TrendsService.get_seasonality(
                start_date, 
                end_date, 
                store_name, 
                "weekly", 
                metric
            )
        
        # 결과 반환
        return SeasonalityResponse(
            period_type=period_type,
            seasonal_components=seasonal_components,
            strength=seasonality_strength,
            insights=insights
        )

# 서비스 인스턴스 생성 (의존성 주입용)
trends_service = TrendsService()
