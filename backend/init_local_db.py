#!/usr/bin/env python3
"""
로컬 SQLite 데이터베이스 초기화 스크립트
Supabase 데이터를 로컬 SQLite DB로 마이그레이션
"""

import sqlite3
import pandas as pd
import os
import logging
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_database():
    """SQLite 데이터베이스 초기화"""
    # 데이터베이스 경로
    db_path = os.path.join(os.path.dirname(__file__), 'LePain_local.db')
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    logger.info(f"데이터베이스 초기화 시작: {db_path}")
    
    # 기존 DB 파일이 있으면 백업
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(db_path, backup_path)
        logger.info(f"기존 DB 백업: {backup_path}")
    
    # SQLite 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 스키마 생성
        logger.info("스키마 생성 중...")
        with open(os.path.join(data_dir, '00_create_schema.sql'), 'r') as f:
            schema_sql = f.read()
            cursor.executescript(schema_sql)
        
        # 2. daily_sales_summary 데이터 로드
        logger.info("daily_sales_summary 데이터 로드 중...")
        daily_sales_df = pd.read_csv(os.path.join(data_dir, 'daily_sales_summary.csv'))
        daily_sales_df.to_sql('daily_sales_summary', conn, if_exists='append', index=False)
        logger.info(f"daily_sales_summary: {len(daily_sales_df)} 건 로드 완료")
        
        # 3. receipt_sales_detail 데이터 로드
        logger.info("receipt_sales_detail 데이터 로드 중...")
        receipt_df = pd.read_csv(os.path.join(data_dir, 'receipt_sales_detail.csv'))
        receipt_df.to_sql('receipt_sales_detail', conn, if_exists='append', index=False)
        logger.info(f"receipt_sales_detail: {len(receipt_df)} 건 로드 완료")
        
        # 4. 인덱스 생성 (성능 향상)
        logger.info("인덱스 생성 중...")
        cursor.execute("CREATE INDEX idx_daily_sales_date ON daily_sales_summary(date);")
        cursor.execute("CREATE INDEX idx_daily_sales_store ON daily_sales_summary(store_name);")
        cursor.execute("CREATE INDEX idx_receipt_date ON receipt_sales_detail(date);")
        cursor.execute("CREATE INDEX idx_receipt_store ON receipt_sales_detail(store_name);")
        cursor.execute("CREATE INDEX idx_receipt_product ON receipt_sales_detail(product_name);")
        
        # 커밋
        conn.commit()
        logger.info("데이터베이스 초기화 완료!")
        
        # 데이터 검증
        cursor.execute("SELECT COUNT(*) FROM daily_sales_summary")
        daily_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
        receipt_count = cursor.fetchone()[0]
        
        logger.info(f"검증 - daily_sales_summary: {daily_count} 건")
        logger.info(f"검증 - receipt_sales_detail: {receipt_count} 건")
        
    except Exception as e:
        logger.error(f"데이터베이스 초기화 실패: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()
