from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from app.core.database import get_table, Tables
from app.utils.date_utils import get_date_range
from app.models.compare import (
    StoreComparisonResponse,
    StoreMetrics,
    ComparisonMetric,
    TopPerformerResponse,
    TopPerformer,
    BenchmarkType
)

# 매장 비교 분석 서비스
class CompareService:
    """매장 비교 분석 서비스"""
    
    @staticmethod
    async def get_store_comparison(
        start_date: date,
        end_date: date,
        store_name: str,  # 비교 기준 매장
        benchmark_type: BenchmarkType,  # 비교 대상 유형 (ALL, TOP_25, BOTTOM_25, SIMILAR)
        metrics: Optional[List[str]] = None  # 비교 지표
    ) -> StoreComparisonResponse:
        """
        특정 매장과 다른 매장들을 비교 분석합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            store_name: 비교 기준 매장 이름
            benchmark_type: 비교 대상 유형 (전체 평균, 상위 25%, 하위 25%, 유사 매장)
            metrics: 비교 지표 리스트 (기본값: 매출, 객단가, 할인률)
            
        Returns:
            매장 비교 분석 결과
        """
        # 기본 비교 지표 설정
        if not metrics:
            metrics = ["total_sales", "avg_transaction", "discount_rate", "transaction_count"]
            
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("*")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return StoreComparisonResponse(
                store_name=store_name,
                benchmark_type=benchmark_type,
                metrics=[],
                insights=["비교 분석에 필요한 데이터가 충분하지 않습니다."]
            )
        
        df = pd.DataFrame(data)
        
        # 필요한 필드 확인 및 타입 변환
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 매장별 지표 계산
        store_metrics = await CompareService._calculate_store_metrics(df)
        
        # 타겟 매장 존재 여부 확인
        if store_name not in {sm.store_name for sm in store_metrics}:
            return StoreComparisonResponse(
                store_name=store_name,
                benchmark_type=benchmark_type,
                metrics=[],
                insights=[f"요청한 매장 '{store_name}'의 데이터를 찾을 수 없습니다."]
            )
        
        # 벤치마크 대상 선정
        benchmark_stores = await CompareService._select_benchmark_stores(
            store_metrics,
            store_name,
            benchmark_type
        )
        
        # 지표별 비교 결과 계산
        comparison_metrics = []
        for metric_name in metrics:
            comparison = await CompareService._compare_metric(
                store_metrics,
                benchmark_stores,
                store_name,
                metric_name
            )
            comparison_metrics.append(comparison)
        
        # 통찰 도출
        insights = await CompareService._generate_comparison_insights(
            store_metrics,
            benchmark_stores,
            store_name,
            comparison_metrics
        )
        
        # 결과 반환
        return StoreComparisonResponse(
            store_name=store_name,
            benchmark_type=benchmark_type,
            metrics=comparison_metrics,
            insights=insights
        )
    
    @staticmethod
    async def _calculate_store_metrics(df: pd.DataFrame) -> List[StoreMetrics]:
        """
        데이터프레임에서 매장별 성과 지표를 계산합니다.
        
        Args:
            df: 매출 데이터 데이터프레임
            
        Returns:
            매장별 지표 리스트
        """
        # 필수 필드 존재 여부 확인
        required_fields = ['store_name', 'date', 'total_sales', 'receipt_number']
        for field in required_fields:
            if field not in df.columns:
                return []
                
        # 추가 지표 계산을 위한 필드
        if 'total_discount' not in df.columns:
            df['total_discount'] = 0
        
        # 매장별 집계
        store_agg = df.groupby('store_name').agg({
            'total_sales': 'sum',
            'total_discount': 'sum',
            'receipt_number': 'nunique',
            'date': 'nunique'  # 데이터가 있는 날짜 수
        }).reset_index()
        
        # 추가 지표 계산
        store_agg['avg_transaction'] = store_agg['total_sales'] / store_agg['receipt_number'].replace(0, np.nan)
        store_agg['discount_rate'] = (store_agg['total_discount'] / (store_agg['total_sales'] + store_agg['total_discount']) * 100)\
                                    .where((store_agg['total_sales'] + store_agg['total_discount']) > 0, 0)
        store_agg['avg_daily_sales'] = store_agg['total_sales'] / store_agg['date'].replace(0, np.nan)
        
        # 결과 변환
        result = []
        for _, row in store_agg.iterrows():
            result.append(StoreMetrics(
                store_name=str(row['store_name']),
                total_sales=float(row['total_sales']),
                transaction_count=int(row['receipt_number']),
                avg_transaction=float(row['avg_transaction']) if not pd.isna(row['avg_transaction']) else 0.0,
                discount_rate=float(row['discount_rate']),
                avg_daily_sales=float(row['avg_daily_sales']) if not pd.isna(row['avg_daily_sales']) else 0.0
            ))
            
        return result
    
    @staticmethod
    async def _select_benchmark_stores(
        store_metrics: List[StoreMetrics],
        target_store: str,
        benchmark_type: BenchmarkType
    ) -> List[str]:
        """
        비교 대상 매장을 선정합니다.
        
        Args:
            store_metrics: 매장별 지표 리스트
            target_store: 비교 기준 매장
            benchmark_type: 비교 대상 유형
            
        Returns:
            비교 대상 매장 이름 리스트
        """
        # 타겟 매장 제외
        other_stores = [sm for sm in store_metrics if sm.store_name != target_store]
        
        if not other_stores:
            return []
            
        if benchmark_type == BenchmarkType.ALL:
            # 모든 매장 반환
            return [sm.store_name for sm in other_stores]
            
        elif benchmark_type == BenchmarkType.TOP_25:
            # 매출 기준 상위 25% 매장 선정
            sorted_stores = sorted(other_stores, key=lambda x: x.total_sales, reverse=True)
            top_count = max(1, int(len(sorted_stores) * 0.25))
            return [sm.store_name for sm in sorted_stores[:top_count]]
            
        elif benchmark_type == BenchmarkType.BOTTOM_25:
            # 매출 기준 하위 25% 매장 선정
            sorted_stores = sorted(other_stores, key=lambda x: x.total_sales)
            bottom_count = max(1, int(len(sorted_stores) * 0.25))
            return [sm.store_name for sm in sorted_stores[:bottom_count]]
            
        elif benchmark_type == BenchmarkType.SIMILAR:
            # 유사 매장 선정 (객단가, 할인율 기준)
            target_metrics = next((sm for sm in store_metrics if sm.store_name == target_store), None)
            
            if not target_metrics:
                return []
                
            # 각 매장과 타겟 매장의 유사도 계산
            store_similarity = []
            for store in other_stores:
                # 객단가와 할인율 기준 유사도 (0에 가까울수록 유사)
                avg_tx_diff = abs(store.avg_transaction - target_metrics.avg_transaction) / max(target_metrics.avg_transaction, 1)
                discount_diff = abs(store.discount_rate - target_metrics.discount_rate) / max(target_metrics.discount_rate, 1)
                
                # 가중치를 적용한 유사도 점수 (낮을수록 유사)
                similarity_score = (avg_tx_diff * 0.7) + (discount_diff * 0.3)
                store_similarity.append((store.store_name, similarity_score))
            
            # 유사도 기준 정렬 및 상위 30% 추출
            sorted_similarity = sorted(store_similarity, key=lambda x: x[1])
            similar_count = max(1, int(len(sorted_similarity) * 0.3))
            return [store_name for store_name, _ in sorted_similarity[:similar_count]]
        
        # 기본값은 전체 매장
        return [sm.store_name for sm in other_stores]
    
    @staticmethod
    async def _compare_metric(
        store_metrics: List[StoreMetrics],
        benchmark_stores: List[str],
        target_store: str,
        metric_name: str
    ) -> ComparisonMetric:
        """
        특정 지표에 대해 대상 매장과 벤치마크 매장들을 비교합니다.
        
        Args:
            store_metrics: 매장별 지표 리스트
            benchmark_stores: 비교 대상 매장 이름 리스트
            target_store: 비교 기준 매장
            metric_name: 비교할 지표 이름
            
        Returns:
            비교 지표 결과
        """
        # 타겟 매장 지표 찾기
        target_metrics = next((sm for sm in store_metrics if sm.store_name == target_store), None)
        
        if not target_metrics or not benchmark_stores:
            return ComparisonMetric(
                metric_name=metric_name,
                display_name=metric_name.replace('_', ' ').title(),
                store_value=0.0,
                benchmark_value=0.0,
                difference=0.0,
                percent_difference=0.0,
                is_positive=False
            )
            
        # 타겟 매장 지표값 가져오기
        target_value = getattr(target_metrics, metric_name, 0.0)
        
        # 벤치마크 매장들의 지표값 평균 계산
        benchmark_values = []
        for store_name in benchmark_stores:
            store_metric = next((sm for sm in store_metrics if sm.store_name == store_name), None)
            if store_metric:
                benchmark_values.append(getattr(store_metric, metric_name, 0.0))
                
        benchmark_avg = sum(benchmark_values) / len(benchmark_values) if benchmark_values else 0.0
        
        # 차이 및 퍼센트 차이 계산
        difference = target_value - benchmark_avg
        difference_percent = (difference / benchmark_avg * 100) if benchmark_avg != 0 else 0.0
        
        # 결과 반환
        return ComparisonMetric(
            metric_name=metric_name,
            display_name=metric_name.replace('_', ' ').title(),  # 표시용 이름 추가
            store_value=float(target_value),
            benchmark_value=float(benchmark_avg),
            difference=float(difference),
            percent_difference=float(difference_percent),  # difference_percent -> percent_difference
            is_positive=difference > 0 if metric_name != "discount_rate" else difference < 0  # 긍정적 지표 여부 추가
        )
    
    @staticmethod
    async def _generate_comparison_insights(
        store_metrics: List[StoreMetrics],
        benchmark_stores: List[str],
        target_store: str,
        comparisons: List[ComparisonMetric]
    ) -> List[str]:
        """
        비교 분석 결과에서 통찰을 도출합니다.
        
        Args:
            store_metrics: 매장별 지표 리스트
            benchmark_stores: 비교 대상 매장 이름 리스트
            target_store: 비교 기준 매장
            comparisons: 비교 지표 결과 리스트
            
        Returns:
            통찰 문장 리스트
        """
        insights = []
        
        # 데이터가 없는 경우
        if not comparisons or not benchmark_stores:
            return ["비교 분석을 위한 충분한 데이터가 없습니다."]
            
        try:
            # 각 지표별 통찰 도출
            for comp in comparisons:
                # 유의미한 차이가 있는 경우에만 통찰 추가 (차이가 10% 이상)
                if abs(comp.percent_difference) >= 10:
                    # 비교 방향 결정
                    direction = "높음" if comp.difference > 0 else "낮음"
                    
                    # 지표별 친화적 이름 매핑
                    metric_names = {
                        "total_sales": "총 매출",
                        "transaction_count": "거래 건수",
                        "avg_transaction": "객단가",
                        "discount_rate": "할인율",
                        "avg_daily_sales": "일 평균 매출"
                    }
                    
                    # 더 나은/나쁜 상태 구분
                    # 할인율을 제외한 지표는 값이 높을수록 좋음
                    is_positive = comp.difference > 0
                    if comp.metric_name == "discount_rate":
                        is_positive = comp.difference < 0
                        
                    state = "양호" if is_positive else "개선 필요"
                    
                    friendly_name = metric_names.get(comp.metric_name, comp.metric_name)
                    insights.append(
                        f"{friendly_name}이(가) 비교 대상보다 {abs(comp.percent_difference):.1f}% {direction} ({state})"
                    )
            
            # 통합적 통찰 추가
            positive_metrics = [c for c in comparisons if 
                               (c.difference > 0 and c.metric_name != "discount_rate") or 
                               (c.difference < 0 and c.metric_name == "discount_rate")]
            
            negative_metrics = [c for c in comparisons if 
                                (c.difference < 0 and c.metric_name != "discount_rate") or 
                                (c.difference > 0 and c.metric_name == "discount_rate")]
            
            if len(positive_metrics) > len(negative_metrics):
                insights.append("전반적으로 비교 대상 매장보다 성과가 양호합니다.")
            elif len(negative_metrics) > len(positive_metrics):
                insights.append("전반적으로 비교 대상 매장보다 성과 개선이 필요합니다.")
            else:
                insights.append("비교 대상 매장과 성과가 비슷한 수준입니다.")
                
        except Exception as e:
            insights.append(f"통찰 도출 중 오류가 발생했습니다: {str(e)}")
            
        return insights
        
    @staticmethod
    async def get_top_performers(
        start_date: date,
        end_date: date,
        metric: str = "total_sales",
        limit: int = 5
    ) -> TopPerformerResponse:
        """
        특정 지표 기준 상위 매장을 조회합니다.
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            metric: 정렬 기준 지표
            limit: 조회할 상위 매장 수
            
        Returns:
            상위 매장 조회 결과
        """
        # 요약 테이블을 통한 매출 데이터 조회
        query = get_table(Tables.DAILY_SALES_SUMMARY)\
                .select("*")\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())
            
        response = query.execute()
        data = response.data
        
        if not data:
            # 데이터가 없는 경우 빈 응답 반환
            return TopPerformerResponse(
                metric_name=metric,
                metric_display_name=metric.replace('_', ' ').title(),
                period=f"{start_date.isoformat()} ~ {end_date.isoformat()}",
                performers=[]
            )
        
        df = pd.DataFrame(data)
        
        # 필요한 필드 확인 및 타입 변환
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # 매장별 지표 계산
        store_metrics = await CompareService._calculate_store_metrics(df)
        
        # 메트릭 기준 정렬 방향 결정 (할인율은 낮을수록 좋음, 나머지는 높을수록 좋음)
        reverse = metric != "discount_rate"
        
        # 지표별 정렬
        sorted_stores = sorted(
            store_metrics, 
            key=lambda x: getattr(x, metric, 0), 
            reverse=reverse
        )
        
        # 상위 N개 매장 반환
        top_stores = sorted_stores[:limit]
        
        # 지표 표시 이름
        metric_display_names = {
            "total_sales": "총 매출",
            "transaction_count": "거래 건수",
            "avg_transaction": "객단가",
            "discount_rate": "할인율",
            "avg_daily_sales": "일 평균 매출"
        }
        
        # 순위 할당
        performers = []
        for i, store in enumerate(top_stores):
            metric_value = float(getattr(store, metric, 0))
            performers.append(TopPerformer(
                store_name=store.store_name,
                metric_value=metric_value,
                rank=i + 1
            ))
            
        # 조회 기간 형식화
        period_str = f"{start_date.isoformat()} ~ {end_date.isoformat()}"
        
        # 명시적으로 app.models.compare에서 TopPerformerResponse 임포트
        from app.models.compare import TopPerformerResponse
        
        return TopPerformerResponse(
            metric_name=metric,
            metric_display_name=metric_display_names.get(metric, metric.replace('_', ' ').title()),
            period=period_str,
            performers=performers
        )

# 서비스 인스턴스 생성 (의존성 주입용)
compare_service = CompareService() 