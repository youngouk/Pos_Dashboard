#!/usr/bin/env python3
"""
SQLite 데이터베이스 초기화 (CSV 파일 사용)
"""

import sqlite3
import pandas as pd
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database():
    data_dir = os.path.dirname(__file__)
    db_path = os.path.join(data_dir, 'LePain.db')
    
    # 기존 DB 백업
    if os.path.exists(db_path):
        os.rename(db_path, f"{db_path}.backup")
    
    # 데이터베이스 생성
    conn = sqlite3.connect(db_path)
    
    try:
        # 1. 스키마 생성
        logger.info("스키마 생성 중...")
        schema_path = os.path.join(data_dir, '00_create_schema.sql')
        with open(schema_path, 'r') as f:
            conn.executescript(f.read())
        
        # 2. CSV 데이터 임포트
        logger.info("daily_sales_summary 임포트 중...")
        daily_csv_path = os.path.join(data_dir, 'daily_sales_summary.csv')
        df_daily = pd.read_csv(daily_csv_path)
        df_daily.to_sql('daily_sales_summary', conn, if_exists='append', index=False)
        
        logger.info("receipt_sales_detail 임포트 중...")
        receipt_csv_path = os.path.join(data_dir, 'receipt_sales_detail.csv')
        df_receipt = pd.read_csv(receipt_csv_path)
        df_receipt.to_sql('receipt_sales_detail', conn, if_exists='append', index=False)
        
        # 3. 인덱스 생성
        logger.info("인덱스 생성 중...")
        conn.execute("CREATE INDEX idx_daily_date ON daily_sales_summary(date);")
        conn.execute("CREATE INDEX idx_daily_store ON daily_sales_summary(store_name);")
        conn.execute("CREATE INDEX idx_receipt_date ON receipt_sales_detail(date);")
        conn.execute("CREATE INDEX idx_receipt_store ON receipt_sales_detail(store_name);")
        
        conn.commit()
        logger.info("데이터베이스 생성 완료!")
        
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_database()
