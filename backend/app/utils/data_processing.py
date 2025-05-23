## data_processing.py

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Union, Optional, Tuple
from datetime import date, datetime, timedelta

def calculate_basic_stats(data: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    데이터 집합의 기본 통계값을 계산합니다.
    
    Args:
        data: 딕셔너리 리스트 형태의 데이터
        
    Returns:
        기본 통계값 딕셔너리
    """
    if not data:
        return {
            "count": 0,
            "sum": 0,
            "mean": 0,
            "median": 0,
            "min": 0,
            "max": 0,
            "std": 0
        }
    
    # 숫자 데이터만 추출
    df = pd.DataFrame(data)
    numeric_df = df.select_dtypes(include=['number'])
    
    # 각 숫자 컬럼별 통계 계산
    stats = {}
    for col in numeric_df.columns:
        col_stats = {
            "count": len(numeric_df[col]),
            "sum": float(numeric_df[col].sum()),
            "mean": float(numeric_df[col].mean()),
            "median": float(numeric_df[col].median()),
            "min": float(numeric_df[col].min()),
            "max": float(numeric_df[col].max()),
            "std": float(numeric_df[col].std())
        }
        stats[col] = col_stats
        
    return stats

def detect_anomalies_zscore(data: List[Dict[str, Any]], 
                           value_field: str, 
                           date_field: str = 'date',
                           threshold: float = 3.0) -> List[Dict[str, Any]]:
    """
    Z-score 방식으로 이상치 데이터를 감지합니다.
    
    Args:
        data: 분석할 데이터
        value_field: 값 필드명
        date_field: 날짜 필드명
        threshold: 이상치 판단 임계값
        
    Returns:
        이상치 정보가 추가된 데이터
    """
    if not data:
        return []
    
    df = pd.DataFrame(data)
    
    # 값 필드 추출
    values = df[value_field].values
    
    # Z-score 계산
    mean = np.mean(values)
    std = np.std(values)
    
    # 0으로 나누기 방지
    if std == 0:
        std = 1
        
    z_scores = [(x - mean) / std for x in values]
    
    # 결과에 Z-score와 이상치 여부 추가
    result = []
    for i, item in enumerate(data):
        result.append({
            **item,
            "expected_value": mean,
            "z_score": z_scores[i],
            "is_anomaly": abs(z_scores[i]) > threshold
        })
    
    return result

def detect_anomalies_iqr(data: List[Dict[str, Any]], 
                        value_field: str,
                        threshold: float = 1.5) -> List[Dict[str, Any]]:
    """
    IQR(Inter-Quartile Range) 방식으로 이상치 데이터를 감지합니다.
    
    Args:
        data: 분석할 데이터
        value_field: 값 필드명
        threshold: IQR 배수 임계값
        
    Returns:
        이상치 정보가 추가된 데이터
    """
    if not data:
        return []
    
    df = pd.DataFrame(data)
    
    # 값 필드 추출
    values = df[value_field].values
    
    # 사분위수 계산
    q1 = np.percentile(values, 25)
    q3 = np.percentile(values, 75)
    iqr = q3 - q1
    
    # 이상치 하한/상한 계산
    lower_bound = q1 - threshold * iqr
    upper_bound = q3 + threshold * iqr
    
    # 결과에 IQR 정보와 이상치 여부 추가
    result = []
    for i, item in enumerate(data):
        value = item[value_field]
        is_anomaly = value < lower_bound or value > upper_bound
        expected_value = (q1 + q3) / 2  # 중앙값 근사치
        
        result.append({
            **item,
            "expected_value": expected_value,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "is_anomaly": is_anomaly
        })
    
    return result

def calculate_correlation(data1: List[float], 
                         data2: List[float], 
                         method: str = 'pearson') -> Tuple[float, float]:
    """
    두 데이터 시리즈 간의 상관계수와 p-value를 계산합니다.
    
    Args:
        data1: 첫 번째 데이터 시리즈
        data2: 두 번째 데이터 시리즈
        method: 상관계수 계산 방법 ('pearson', 'spearman', 'kendall')
        
    Returns:
        (상관계수, p-value) 튜플
    """
    if len(data1) != len(data2):
        raise ValueError("두 데이터의 길이가 같아야 합니다.")
        
    if len(data1) < 2:
        return 0.0, 1.0
    
    # 결측치 제거 (둘 다 nan이 아닌 경우만 추출)
    valid_data = [(x, y) for x, y in zip(data1, data2) if not (np.isnan(x) or np.isnan(y))]
    if not valid_data:
        return 0.0, 1.0
        
    data1_clean = [x for x, _ in valid_data]
    data2_clean = [y for _, y in valid_data]
    
    # scipy 임포트 지연 (필요할 때만 로드)
    from scipy import stats
    
    if method == 'pearson':
        return stats.pearsonr(data1_clean, data2_clean)
    elif method == 'spearman':
        return stats.spearmanr(data1_clean, data2_clean)
    elif method == 'kendall':
        return stats.kendalltau(data1_clean, data2_clean)
    else:
        raise ValueError(f"지원하지 않는 상관계수 계산 방법: {method}")

def process_time_series(data: List[Dict[str, Any]], 
                       date_field: str,
                       value_field: str,
                       freq: str = 'D') -> pd.DataFrame:
    """
    시계열 데이터를 처리하여 판다스 DataFrame으로 변환합니다.
    
    Args:
        data: 시계열 데이터
        date_field: 날짜 필드명
        value_field: 값 필드명
        freq: 시계열 빈도 ('D'=일별, 'W'=주별, 'M'=월별)
        
    Returns:
        시계열 데이터 DataFrame
    """
    if not data:
        return pd.DataFrame(columns=[date_field, value_field])
    
    # 데이터프레임 변환
    df = pd.DataFrame(data)
    
    # 날짜 필드가 문자열인 경우 datetime으로 변환
    if df[date_field].dtype == 'object':
        df[date_field] = pd.to_datetime(df[date_field])
    
    # 시계열 인덱스로 설정
    df = df.set_index(date_field)
    
    # 시간순 정렬
    df = df.sort_index()
    
    # 리샘플링 (필요시)
    if freq:
        # 빈도별 리샘플링
        resampled = df[value_field].resample(freq).mean()
        
        # 결측치 처리 (선형 보간)
        resampled = resampled.interpolate(method='linear')
        
        return resampled.reset_index()
    
    return df.reset_index()

def aggregate_by_category(data: List[Dict[str, Any]],
                         category_field: str,
                         value_field: str) -> List[Dict[str, Any]]:
    """
    카테고리별로 데이터를 집계합니다.
    
    Args:
        data: 집계할 데이터
        category_field: 카테고리 필드명
        value_field: 집계할 값 필드명
        
    Returns:
        카테고리별 집계 결과
    """
    if not data:
        return []
    
    # DataFrame 변환
    df = pd.DataFrame(data)
    
    # 카테고리별 집계
    grouped = df.groupby(category_field)[value_field].agg(['sum', 'mean', 'count'])
    
    # 전체 합계 계산 (비율 계산용)
    total_sum = grouped['sum'].sum()
    
    # 결과 변환
    result = []
    for category, row in grouped.iterrows():
        percentage = (row['sum'] / total_sum * 100) if total_sum else 0
        
        result.append({
            "category": category,
            "total": float(row['sum']),
            "average": float(row['mean']),
            "count": int(row['count']),
            "percentage": float(percentage)
        })
    
    # 합계 기준 내림차순 정렬
    result.sort(key=lambda x: x["total"], reverse=True)
    
    return result
