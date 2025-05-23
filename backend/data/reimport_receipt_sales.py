#!/usr/bin/env python3
"""
DashBoard3의 receipt_sales_detail.csv를 사용하여 
SQLite 데이터베이스의 receipt_sales_detail 테이블을 다시 임포트하는 스크립트
"""

import sqlite3
import pandas as pd
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def reimport_receipt_sales_detail():
    # 경로 설정
    db_path = os.path.join(os.path.dirname(__file__), 'LePain.db')
    csv_path = '/Users/youngouk/Desktop/LePain/DashBoard3/backend/data/receipt_sales_detail.csv'
    
    logger.info(f"데이터베이스 경로: {db_path}")
    logger.info(f"CSV 파일 경로: {csv_path}")
    
    # CSV 파일 확인
    if not os.path.exists(csv_path):
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_path}")
        return
        
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 기존 데이터 백업을 위한 카운트
        cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
        old_count = cursor.fetchone()[0]
        logger.info(f"기존 레코드 수: {old_count}")
        
        # 기존 데이터 삭제
        logger.info("기존 receipt_sales_detail 데이터 삭제 중...")
        cursor.execute("DELETE FROM receipt_sales_detail")
        conn.commit()
        
        # CSV 파일 읽기 (청크 단위로 읽기)
        logger.info("CSV 파일 읽기 시작...")
        chunk_size = 10000
        total_rows = 0
        
        for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
            # NaN 값을 None으로 변환
            chunk = chunk.where(pd.notnull(chunk), None)
            
            # 데이터 타입 변환
            chunk['date'] = pd.to_datetime(chunk['date']).dt.date
            chunk['first_order'] = pd.to_datetime(chunk['first_order'])
            chunk['payment_time'] = pd.to_datetime(chunk['payment_time'])
            chunk['created_at'] = pd.to_datetime(chunk['created_at'])
            
            # SQLite에 삽입
            chunk.to_sql('receipt_sales_detail', conn, if_exists='append', index=False)
            total_rows += len(chunk)
            logger.info(f"  {total_rows} 레코드 처리 완료...")
        
        # 인덱스 재생성
        logger.info("인덱스 재생성 중...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt_sales_detail(date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipt_store ON receipt_sales_detail(store_name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipt_product ON receipt_sales_detail(product_name);")
        
        conn.commit()
        
        # 결과 확인
        cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
        new_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT store_name) FROM receipt_sales_detail")
        store_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT DISTINCT store_name FROM receipt_sales_detail ORDER BY store_name")
        stores = [row[0] for row in cursor.fetchall()]
        
        # 샘플 데이터 확인
        cursor.execute("""
            SELECT date, store_name, product_name, total_sales 
            FROM receipt_sales_detail 
            WHERE store_name = '명동점' 
            LIMIT 5
        """)
        samples = cursor.fetchall()
        
        logger.info(f"\n=== 임포트 완료 ===")
        logger.info(f"총 레코드 수: {new_count}")
        logger.info(f"매장 수: {store_count}")
        logger.info(f"매장 목록: {', '.join(stores)}")
        logger.info(f"\n명동점 샘플 데이터:")
        for sample in samples:
            logger.info(f"  {sample}")
            
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    reimport_receipt_sales_detail()
