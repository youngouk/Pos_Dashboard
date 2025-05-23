"""
데이터베이스 연결 모듈
로컬 SQLite 데이터베이스를 사용하도록 변경됨
"""

from app.core.config import settings
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime
import os

# 로거 설정
logger = logging.getLogger("database")
logger.setLevel(logging.INFO)

# 로컬 데이터베이스 모듈 임포트
try:
    from app.core.local_database import local_db, get_db_session
    logger.info("로컬 SQLite 데이터베이스 모듈 로드 성공")
    
    # DB 파일 존재 확인
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
        "data", 
        "LePain.db"
    )
    if os.path.exists(db_path):
        logger.info(f"SQLite 데이터베이스 확인: {db_path}")
    else:
        logger.error(f"SQLite 데이터베이스 파일을 찾을 수 없음: {db_path}")
except Exception as e:
    logger.error(f"로컬 데이터베이스 모듈 로드 실패: {str(e)}")
    raise

# Supabase 호환성을 위한 더미 객체
class DummySupabase:
    """Supabase 호환성을 위한 더미 클래스"""
    def table(self, table_name: str):
        return LocalTableQuery(table_name)

# 기존 코드와의 호환성을 위해 supabase 변수 유지
supabase = DummySupabase()

# 데이터 테이블 상수 정의
class Tables:
    """
    데이터베이스 테이블 이름 상수를 정의합니다.
    """
    RECEIPT_SALES_DETAIL = "receipt_sales_detail"
    DAILY_SALES_SUMMARY = "daily_sales_summary"

# Supabase 스타일 쿼리를 SQLite로 변환하는 클래스
class LocalTableQuery:
    """Supabase 스타일 쿼리를 로컬 DB로 변환"""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.filters = {
            'gte': {},
            'lte': {},
            'in': {},
            'eq': {}
        }
        self.select_columns = None
        
    def select(self, columns="*"):
        """컬럼 선택"""
        self.select_columns = columns
        return self
        
    def gte(self, column: str, value: Any):
        """Greater than or equal 필터"""
        self.filters['gte'][column] = value
        return self
        
    def lte(self, column: str, value: Any):
        """Less than or equal 필터"""
        self.filters['lte'][column] = value
        return self
        
    def in_(self, column: str, values: List[Any]):
        """IN 필터"""
        self.filters['in'][column] = values
        return self
        
    def eq(self, column: str, value: Any):
        """Equal 필터"""
        self.filters['eq'][column] = value
        return self
        
    def execute(self):
        """쿼리 실행"""
        logger.info(f"쿼리 실행: 테이블={self.table_name}, 필터={self.filters}")
        
        # 날짜 범위 추출
        start_date = self.filters['gte'].get('date')
        end_date = self.filters['lte'].get('date')
        
        # 날짜 형식 변환
        if start_date and isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date).date()
        if end_date and isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date).date()
        
        # 매장 필터 추출
        store_names = None
        if 'store_name' in self.filters['in']:
            store_names = self.filters['in']['store_name']
        elif 'store_name' in self.filters['eq']:
            store_names = [self.filters['eq']['store_name']]
        
        # 테이블에 따라 적절한 메서드 호출
        if self.table_name == Tables.DAILY_SALES_SUMMARY:
            data = local_db.get_daily_sales(
                start_date=start_date or date.today(),
                end_date=end_date or date.today(),
                store_name=store_names
            )
        elif self.table_name == Tables.RECEIPT_SALES_DETAIL:
            data = local_db.get_product_sales(
                start_date=start_date or date.today(),
                end_date=end_date or date.today(),
                store_name=store_names
            )
        else:
            logger.warning(f"알 수 없는 테이블: {self.table_name}")
            data = []
        
        # Supabase 응답 형식으로 래핑
        class Response:
            def __init__(self, data):
                self.data = data
                
        return Response(data)

def get_table(table_name: str):
    """
    테이블명을 받아 쿼리 객체를 반환하는 유틸리티 함수
    
    Args:
        table_name: 쿼리할 테이블 이름
        
    Returns:
        LocalTableQuery 객체
    """
    logger.info(f"테이블 접근: {table_name}")
    return LocalTableQuery(table_name)

# SQL 쿼리 직접 실행 유틸리티 함수
async def run_query(query: str, params: dict = None) -> List[Dict[str, Any]]:
    """
    Raw SQL 쿼리 실행
    """
    logger.info(f"SQL 쿼리 실행: {query[:100]}...")
    
    try:
        from sqlalchemy import text
        
        with get_db_session() as session:
            if params:
                result = session.execute(text(query), params)
            else:
                result = session.execute(text(query))
            
            # SELECT 쿼리인 경우 결과 반환
            if query.strip().upper().startswith("SELECT"):
                rows = result.fetchall()
                # Row 객체를 딕셔너리로 변환
                data = []
                for row in rows:
                    data.append(dict(row._mapping))
                return data
            else:
                # INSERT, UPDATE, DELETE 등의 경우
                session.commit()
                return []
                
    except Exception as e:
        logger.error(f"SQL 쿼리 실행 실패: {str(e)}")
        raise

logger.info("데이터베이스 모듈 초기화 완료 - SQLite 사용")
