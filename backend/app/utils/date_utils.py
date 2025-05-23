## date_utils.py

from datetime import datetime, date, timedelta
from typing import List, Tuple, Optional

def get_date_range(start_date: date, end_date: date) -> List[date]:
    """
    두 날짜 사이의 모든 날짜 리스트를 반환합니다.
    
    Args:
        start_date: 시작 날짜
        end_date: 종료 날짜
        
    Returns:
        날짜 객체 리스트
    """
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]

def get_week_range(reference_date: date) -> Tuple[date, date]:
    """
    주어진 날짜가 속한 주의 시작일(월요일)과 종료일(일요일)을 반환합니다.
    
    Args:
        reference_date: 기준 날짜
        
    Returns:
        (주 시작일, 주 종료일) 튜플
    """
    # 주 시작일 (월요일, isoweekday=1)
    start_date = reference_date - timedelta(days=reference_date.isoweekday() - 1)
    # 주 종료일 (일요일, isoweekday=7)
    end_date = start_date + timedelta(days=6)
    return start_date, end_date

def get_month_range(year: int, month: int) -> Tuple[date, date]:
    """
    주어진 연도와 월의 시작일과 종료일을 반환합니다.
    
    Args:
        year: 연도
        month: 월
        
    Returns:
        (월 시작일, 월 종료일) 튜플
    """
    start_date = date(year, month, 1)
    
    # 다음 달의 1일 - 1일 = 현재 달의 마지막 날
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
        
    return start_date, end_date

def get_recent_periods(end_date: date = None, 
                        days: int = 7, 
                        weeks: int = 0,
                        months: int = 0) -> Tuple[date, date]:
    """
    현재 날짜 기준으로 최근 n일, n주, n월 기간의 시작일과 종료일을 반환합니다.
    
    Args:
        end_date: 종료일 (기본값: 오늘)
        days: 일 수
        weeks: 주 수
        months: 월 수
        
    Returns:
        (시작일, 종료일) 튜플
    """
    if end_date is None:
        end_date = date.today()
        
    # 일, 주, 월 중 하나만 지정해야 함
    if sum([bool(days), bool(weeks), bool(months)]) != 1:
        raise ValueError("days, weeks, months 중 하나만 지정해야 합니다.")
    
    if days:
        start_date = end_date - timedelta(days=days-1)
    elif weeks:
        start_date = end_date - timedelta(weeks=weeks)
    elif months:
        # 현재 달의 같은 날에서 n달 전 (대략적인 계산)
        month = end_date.month - months
        year = end_date.year
        
        while month <= 0:
            month += 12
            year -= 1
            
        # 해당 월의 일수를 넘어가는 경우 조정
        try:
            start_date = date(year, month, end_date.day)
        except ValueError:
            # 윤년 또는 월별 일수 차이로 인한 오류 처리
            if month == 2:  # 2월 케이스
                start_date = date(year, month, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28)
            else:
                # 31일까지 있는 달에서 30일까지만 있는 달로 가는 경우 등
                start_date = date(year, month, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    
    return start_date, end_date

def parse_date_string(date_str: str) -> Optional[date]:
    """
    문자열을 date 객체로 변환합니다.
    여러 형식 지원 (YYYY-MM-DD, DD/MM/YYYY 등)
    
    Args:
        date_str: 날짜 문자열
        
    Returns:
        date 객체 또는 변환 실패시 None
    """
    formats = [
        "%Y-%m-%d",  # 2023-01-31
        "%d/%m/%Y",  # 31/01/2023
        "%m/%d/%Y",  # 01/31/2023
        "%Y/%m/%d",  # 2023/01/31
        "%d-%m-%Y",  # 31-01-2023
        "%m-%d-%Y",  # 01-31-2023
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
            
    return None

def format_date(dt: date, format_str: str = "%Y-%m-%d") -> str:
    """
    날짜를 지정된 형식의 문자열로 변환합니다.
    
    Args:
        dt: 날짜 객체
        format_str: 형식 문자열
        
    Returns:
        형식화된 날짜 문자열
    """
    return dt.strftime(format_str)
