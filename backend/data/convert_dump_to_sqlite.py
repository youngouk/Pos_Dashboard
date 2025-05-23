#!/usr/bin/env python3
"""
SQL 덤프 파일을 SQLite 데이터베이스로 변환
"""

import sqlite3
import os
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def convert_sql_dump_to_sqlite():
    """SQL 덤프를 SQLite로 변환"""
    data_dir = os.path.dirname(__file__)
    db_path = os.path.join(data_dir, 'LePain.db')
    
    # 기존 DB 백업
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup"
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(db_path, backup_path)
        logger.info(f"기존 DB 백업: {backup_path}")
    
    # SQLite 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 스키마 생성
        logger.info("스키마 생성 중...")
        schema_path = os.path.join(data_dir, '00_create_schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
            cursor.executescript(schema_sql)
        
        # 2. daily_sales_summary 데이터 임포트
        logger.info("daily_sales_summary 덤프 처리 중...")
        daily_dump_path = os.path.join(data_dir, 'daily_sales_summary_dump.sql')
        
        with open(daily_dump_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # INSERT 문 찾기
        in_insert = False
        batch_values = []
        insert_count = 0
        
        for line in lines:
            line = line.strip()
            
            # INSERT INTO 시작
            if line.startswith('INSERT INTO daily_sales_summary VALUES'):
                in_insert = True
                continue
            
            # 주석이나 빈 줄 무시
            if not line or line.startswith('--'):
                continue
                
            if in_insert:
                # 각 값 행 처리
                if line.endswith(','):
                    # 쉼표 제거하고 값 추가
                    batch_values.append(line[:-1])
                elif line.endswith(';'):
                    # 마지막 값 (세미콜론 제거)
                    if line[:-1].strip():
                        batch_values.append(line[:-1])
                    
                    # 배치 실행
                    if batch_values:
                        for value in batch_values:
                            try:
                                sql = f"INSERT INTO daily_sales_summary VALUES {value}"
                                cursor.execute(sql)
                                insert_count += 1
                                
                                if insert_count % 1000 == 0:
                                    logger.info(f"  {insert_count} 레코드 처리됨...")
                                    conn.commit()
                            except Exception as e:
                                logger.error(f"INSERT 실패: {e}")
                                logger.error(f"문제 데이터: {value[:100]}...")
                        
                        batch_values = []
                    in_insert = False
                else:
                    # 값 추가
                    batch_values.append(line)
        
        conn.commit()
        logger.info(f"daily_sales_summary 완료: {insert_count} 레코드")
        
        # 3. receipt_sales_detail 데이터 임포트
        logger.info("receipt_sales_detail 덤프 처리 중...")
        receipt_dump_path = os.path.join(data_dir, 'receipt_sales_detail_dump.sql')
        
        with open(receipt_dump_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        in_insert = False
        batch_values = []
        insert_count = 0
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('INSERT INTO receipt_sales_detail VALUES'):
                in_insert = True
                continue
                
            if not line or line.startswith('--'):
                continue
                
            if in_insert:
                if line.endswith(','):
                    batch_values.append(line[:-1])
                elif line.endswith(';'):
                    if line[:-1].strip():
                        batch_values.append(line[:-1])
                    
                    # 배치 실행
                    if batch_values:
                        for value in batch_values:
                            try:
                                sql = f"INSERT INTO receipt_sales_detail VALUES {value}"
                                cursor.execute(sql)
                                insert_count += 1
                                
                                if insert_count % 5000 == 0:
                                    logger.info(f"  {insert_count} 레코드 처리됨...")
                                    conn.commit()
                            except Exception as e:
                                logger.error(f"INSERT 실패: {e}")
                        
                        batch_values = []
                    in_insert = False
                else:
                    batch_values.append(line)
        
        conn.commit()
        logger.info(f"receipt_sales_detail 완료: {insert_count} 레코드")
        
        # 4. 인덱스 생성
        logger.info("인덱스 생성 중...")
        cursor.execute("CREATE INDEX idx_daily_date ON daily_sales_summary(date);")
        cursor.execute("CREATE INDEX idx_daily_store ON daily_sales_summary(store_name);")
        cursor.execute("CREATE INDEX idx_receipt_date ON receipt_sales_detail(date);")
        cursor.execute("CREATE INDEX idx_receipt_store ON receipt_sales_detail(store_name);")
        cursor.execute("CREATE INDEX idx_receipt_product ON receipt_sales_detail(product_name);")
        
        # 5. 데이터 확인
        cursor.execute("SELECT COUNT(*) FROM daily_sales_summary")
        daily_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
        receipt_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT DISTINCT store_name FROM daily_sales_summary")
        stores = [row[0] for row in cursor.fetchall()]
        
        logger.info("=== 데이터베이스 생성 완료 ===")
        logger.info(f"DB 경로: {db_path}")
        logger.info(f"daily_sales_summary: {daily_count} 레코드")
        logger.info(f"receipt_sales_detail: {receipt_count} 레코드")
        logger.info(f"매장: {', '.join(stores)}")
        
        conn.commit()
        
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    convert_sql_dump_to_sqlite()
