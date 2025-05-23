"""
로컬 SQLite 데이터베이스 연결 모듈
Supabase를 대체하여 로컬 SQLite 데이터베이스를 사용합니다.
"""

from sqlalchemy import create_engine, MetaData, Table, select, func, and_, or_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from contextlib import contextmanager

# 로거 설정
logger = logging.getLogger("local_database")
logger.setLevel(logging.INFO)

# SQLite 데이터베이스 경로
DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "data", 
    "LePain.db"
)

# SQLAlchemy 엔진 생성
# check_same_thread=False는 멀티스레드 환경에서 필요
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False  # SQL 로깅 비활성화 (필요시 True로 변경)
)

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 메타데이터 및 테이블 정의
metadata = MetaData()

# 테이블 반영 (기존 테이블 구조 읽기)
metadata.reflect(bind=engine)

# 테이블 객체
daily_sales_table = metadata.tables['daily_sales_summary']
receipt_sales_table = metadata.tables['receipt_sales_detail']

@contextmanager
def get_db_session():
    """데이터베이스 세션 컨텍스트 매니저"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

class LocalDatabase:
    """로컬 SQLite 데이터베이스 인터페이스"""
    
    @staticmethod
    def get_daily_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """일별 매출 데이터 조회"""
        logger.info(f"일별 매출 조회: {start_date} ~ {end_date}, 매장: {store_name}")
        
        with get_db_session() as session:
            # 기본 쿼리
            query = select(
                daily_sales_table.c.date,
                daily_sales_table.c.store_name,
                func.sum(daily_sales_table.c.total_sales).label('total_sales'),
                func.sum(daily_sales_table.c.actual_sales).label('actual_sales'),
                func.sum(daily_sales_table.c.total_discount).label('total_discount'),
                func.count(daily_sales_table.c.receipt_number).label('transaction_count')
            ).where(
                and_(
                    daily_sales_table.c.date >= start_date.isoformat(),
                    daily_sales_table.c.date <= end_date.isoformat()
                )
            )
            
            # 매장 필터
            if store_name:
                query = query.where(daily_sales_table.c.store_name.in_(store_name))
            
            # 그룹화
            query = query.group_by(
                daily_sales_table.c.date,
                daily_sales_table.c.store_name
            ).order_by(daily_sales_table.c.date)
            
            # 실행
            result = session.execute(query)
            
            # 결과 변환
            data = []
            for row in result:
                data.append({
                    'date': row.date,
                    'store_name': row.store_name,
                    'total_sales': float(row.total_sales or 0),
                    'actual_sales': float(row.actual_sales or 0),
                    'total_discount': float(row.total_discount or 0),
                    'transaction_count': int(row.transaction_count or 0)
                })
            
            logger.info(f"조회 결과: {len(data)}개 레코드")
            return data
    
    @staticmethod
    def get_product_sales(
        start_date: date,
        end_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """제품별 매출 데이터 조회"""
        logger.info(f"제품별 매출 조회: {start_date} ~ {end_date}, 매장: {store_name}")
        
        with get_db_session() as session:
            query = select(
                receipt_sales_table.c.product_name,
                receipt_sales_table.c.store_name,
                func.sum(receipt_sales_table.c.quantity).label('quantity'),
                func.sum(receipt_sales_table.c.total_sales).label('total_sales'),
                func.sum(receipt_sales_table.c.actual_sales).label('actual_sales')
            ).where(
                and_(
                    receipt_sales_table.c.date >= start_date.isoformat(),
                    receipt_sales_table.c.date <= end_date.isoformat()
                )
            )
            
            if store_name:
                query = query.where(receipt_sales_table.c.store_name.in_(store_name))
            
            query = query.group_by(
                receipt_sales_table.c.product_name,
                receipt_sales_table.c.store_name
            ).order_by(func.sum(receipt_sales_table.c.total_sales).desc())
            
            result = session.execute(query)
            
            data = []
            for row in result:
                data.append({
                    'product_name': row.product_name,
                    'store_name': row.store_name,
                    'quantity': int(row.quantity or 0),
                    'total_sales': float(row.total_sales or 0),
                    'actual_sales': float(row.actual_sales or 0)
                })
            
            return data
    
    @staticmethod
    def get_hourly_sales(
        target_date: date,
        store_name: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """시간대별 매출 데이터 조회"""
        logger.info(f"시간대별 매출 조회: {target_date}, 매장: {store_name}")
        
        with get_db_session() as session:
            # SQLite에서 시간 추출
            hour_expr = func.strftime('%H', daily_sales_table.c.payment_time)
            
            query = select(
                hour_expr.label('hour'),
                daily_sales_table.c.store_name,
                func.sum(daily_sales_table.c.total_sales).label('total_sales'),
                func.sum(daily_sales_table.c.actual_sales).label('actual_sales'),
                func.count(daily_sales_table.c.receipt_number).label('transaction_count')
            ).where(
                daily_sales_table.c.date == target_date.isoformat()
            )
            
            if store_name:
                query = query.where(daily_sales_table.c.store_name.in_(store_name))
            
            query = query.group_by(
                hour_expr,
                daily_sales_table.c.store_name
            ).order_by(hour_expr)
            
            result = session.execute(query)
            
            data = []
            for row in result:
                data.append({
                    'hour': int(row.hour),
                    'store_name': row.store_name,
                    'total_sales': float(row.total_sales or 0),
                    'actual_sales': float(row.actual_sales or 0),
                    'transaction_count': int(row.transaction_count or 0)
                })
            
            return data
    
    @staticmethod
    def get_stores() -> List[Dict[str, Any]]:
        """매장 목록 조회"""
        logger.info("매장 목록 조회")
        
        with get_db_session() as session:
            query = select(
                daily_sales_table.c.store_name
            ).distinct()
            
            result = session.execute(query)
            
            stores = []
            for idx, row in enumerate(result):
                stores.append({
                    'id': idx + 1,
                    'name': row.store_name,
                    'code': row.store_name[:2].upper(),
                    'is_active': True
                })
            
            return stores

# 싱글톤 인스턴스
local_db = LocalDatabase()
