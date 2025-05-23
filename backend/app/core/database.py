"""
SQLAlchemy 기반 로컬 데이터베이스 연결 모듈
Supabase를 SQLite로 교체
"""

from sqlalchemy import create_engine, text, Column, Integer, String, Date, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List, Dict, Any, Optional
from datetime import date, datetime
import logging
import os

from app.core.config import settings

# 로거 설정
logger = logging.getLogger("database")
logger.setLevel(logging.INFO)

# SQLAlchemy Base
Base = declarative_base()

# 데이터베이스 경로
import os
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "LePain.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

logger.info(f"Database path: {DB_PATH}")
logger.info(f"Database exists: {os.path.exists(DB_PATH)}")

# 엔진 생성
try:
    logger.info(f"Creating database engine: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})  # echo=True로 SQL 로깅
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

# 테이블 모델 정의
class DailySalesSummary(Base):
    __tablename__ = "daily_sales_summary"
    
    id = Column(Integer, primary_key=True)
    date = Column(String)  # Date -> String으로 변경
    no = Column(Integer)
    pos_number = Column(String)
    receipt_number = Column(String)
    payment_time = Column(DateTime)
    payment_type = Column(String)
    total_sales = Column(Integer)
    total_discount = Column(Integer)
    actual_sales = Column(Integer)
    price = Column(Integer)
    vat = Column(Integer)
    created_at = Column(DateTime)
    store_name = Column(String)

class ReceiptSalesDetail(Base):
    __tablename__ = "receipt_sales_detail"
    
    id = Column(Integer, primary_key=True)
    date = Column(String)  # Date -> String으로 변경
    pos_number = Column(String)
    receipt_number = Column(String)
    payment_type = Column(String)
    table_name = Column(String)
    first_order = Column(DateTime)
    payment_time = Column(DateTime)
    product_code = Column(String)
    barcode = Column(String)
    product_name = Column(String)
    quantity = Column(Integer)
    total_sales = Column(Integer)
    erp_mapping_code = Column(String)
    note = Column(String)
    discount_amount = Column(Integer)
    discount_type = Column(String)
    actual_sales = Column(Integer)
    price = Column(Integer)
    vat = Column(Integer)
    created_at = Column(DateTime)
    store_name = Column(String)

# 테이블 상수 (기존 코드와 호환성 유지)
class Tables:
    RECEIPT_SALES_DETAIL = "receipt_sales_detail"
    DAILY_SALES_SUMMARY = "daily_sales_summary"

# DB 세션 생성 함수
def get_db():
    """FastAPI 의존성 주입용 DB 세션"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Supabase 스타일의 쿼리 빌더 (호환성 레이어)
class SupabaseCompatibleQuery:
    """기존 Supabase 스타일 쿼리를 SQLAlchemy로 변환하는 어댑터"""
    
    def __init__(self, db: Session, table_name: str):
        self.db = db
        self.table_name = table_name
        self.query = None
        self._init_query()
        
    def _init_query(self):
        """테이블에 따라 적절한 쿼리 초기화"""
        if self.table_name == Tables.DAILY_SALES_SUMMARY:
            self.query = self.db.query(DailySalesSummary)
            self.model = DailySalesSummary
        elif self.table_name == Tables.RECEIPT_SALES_DETAIL:
            self.query = self.db.query(ReceiptSalesDetail)
            self.model = ReceiptSalesDetail
        else:
            raise ValueError(f"Unknown table: {self.table_name}")
    
    def select(self, *columns):
        """컬럼 선택 (호환성을 위해 유지)"""
        # 특정 컬럼만 선택하는 경우
        if columns and columns[0] != "*":
            # SQLAlchemy에서 특정 컬럼만 선택하려면 getattr를 사용
            # 현재는 전체 모델을 가져오는 것으로 단순화
            # TODO: 필요시 특정 컬럼만 선택하는 기능 구현
            logger.debug(f"Selecting columns: {columns}")
        return self
    
    def gte(self, column: str, value: Any):
        """Greater than or equal 필터"""
        if hasattr(self.model, column):
            self.query = self.query.filter(getattr(self.model, column) >= value)
        return self
    
    def lte(self, column: str, value: Any):
        """Less than or equal 필터"""
        if hasattr(self.model, column):
            self.query = self.query.filter(getattr(self.model, column) <= value)
        return self
    
    def in_(self, column: str, values: List[Any]):
        """IN 필터"""
        if hasattr(self.model, column):
            # SQLAlchemy의 in_ 메서드는 리스트를 받아야 함
            if not isinstance(values, list):
                values = [values]
            self.query = self.query.filter(getattr(self.model, column).in_(values))
        return self
    
    def eq(self, column: str, value: Any):
        """Equal 필터"""
        if hasattr(self.model, column):
            self.query = self.query.filter(getattr(self.model, column) == value)
        return self
    
    def limit(self, count: int):
        """결과 개수 제한"""
        self.query = self.query.limit(count)
        return self
    
    def order(self, column: str, desc: bool = False):
        """정렬"""
        if hasattr(self.model, column):
            if desc:
                self.query = self.query.order_by(getattr(self.model, column).desc())
            else:
                self.query = self.query.order_by(getattr(self.model, column))
        return self
    
    def ilike(self, column: str, pattern: str):
        """대소문자 구분 없는 LIKE 검색"""
        if hasattr(self.model, column):
            self.query = self.query.filter(getattr(self.model, column).ilike(pattern))
        return self
    
    def execute(self):
        """쿼리 실행 및 Supabase 스타일 응답 반환"""
        try:
            results = self.query.all()
            
            # ORM 객체를 딕셔너리로 변환
            data = []
            for row in results:
                row_dict = {}
                for column in row.__table__.columns:
                    value = getattr(row, column.name)
                    # 날짜 변환
                    if isinstance(value, date):
                        value = value.isoformat()
                    elif isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[column.name] = value
                data.append(row_dict)
            
            # Supabase 스타일 응답
            class Response:
                def __init__(self, data):
                    self.data = data
            
            logger.info(f"Query executed: {self.table_name}, returned {len(data)} rows")
            return Response(data)
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise

# 전역 DB 세션 (임시 - 점진적 마이그레이션용)
_global_db = SessionLocal()

def get_table(table_name: str):
    """
    테이블명을 받아 Supabase 호환 쿼리 객체를 반환
    기존 코드와의 호환성을 위한 함수
    """
    logger.info(f"테이블 접근: {table_name}")
    return SupabaseCompatibleQuery(_global_db, table_name)

# SQL 쿼리 직접 실행 (기존 코드 호환)
async def run_query(query: str, params: dict = None) -> List[Dict[str, Any]]:
    """Raw SQL 쿼리 실행"""
    logger.info(f"SQL 쿼리 실행: {query[:100]}...")
    
    db = SessionLocal()
    try:
        result = db.execute(text(query), params or {})
        
        # SELECT 쿼리인 경우 결과 반환
        if query.strip().upper().startswith("SELECT"):
            rows = result.fetchall()
            # Row 객체를 딕셔너리로 변환
            data = [dict(row._mapping) for row in rows]
            logger.info(f"SQL 쿼리 실행 결과: {len(data)} 레코드 반환")
            return data
        else:
            db.commit()
            return []
            
    except Exception as e:
        logger.error(f"SQL 쿼리 실행 실패: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Supabase 클라이언트 대체 (기존 코드 호환)
class SupabaseClient:
    """기존 supabase 객체를 대체하는 클래스"""
    
    def table(self, table_name: str):
        return get_table(table_name)

# 전역 supabase 객체 (기존 코드 호환)
supabase = SupabaseClient()

logger.info("Local SQLite database module initialized")
