#!/usr/bin/env python3
"""
SQL 덤프 파일을 SQLite 데이터베이스로 임포트
"""

import sqlite3
import os
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_sql_dump(file_path, conn):
    """SQL 덤프 파일을 처리하여 SQLite에 임포트"""
    logger.info(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # PostgreSQL 특수 문법을 SQLite 호환으로 변경
    sql_content = sql_content.replace('integer PRIMARY KEY', 'INTEGER PRIMARY KEY')
    sql_content = sql_content.replace('varchar', 'TEXT')
    sql_content = sql_content.replace('timestamp', 'DATETIME')
    sql_content = sql_content.replace('date', 'DATE')
    
    # 큰 INSERT 문을 개별 트랜잭션으로 분리
    # VALUES 이후 부분 찾기
    match = re.search(r'INSERT INTO (\w+) VALUES\s*\n(.*?)(?=\n\n|$)', sql_content, re.DOTALL)
    
    if match:
        table_name = match.group(1)
        values_part = match.group(2)
        
        # 각 행을 개별 INSERT로 변환
        rows = re.findall(r'\((.*?)\)(?=,|\s*;)', values_part, re.DOTALL)
        
        logger.info(f"Found {len(rows)} rows for table {table_name}")
        
        cursor = conn.cursor()
        inserted = 0
        
        for i, row in enumerate(rows):
            try:
                insert_sql = f"INSERT INTO {table_name} VALUES ({row})"
                cursor.execute(insert_sql)
                inserted += 1
                
                if (i + 1) % 1000 == 0:
                    conn.commit()
                    logger.info(f"  Processed {i + 1}/{len(rows)} rows...")
                    
            except Exception as e:
                logger.error(f"Error at row {i + 1}: {e}")
                logger.debug(f"Problem SQL: {insert_sql[:200]}...")
                
        conn.commit()
        logger.info(f"Successfully inserted {inserted}/{len(rows)} rows")
    else:
        # CREATE TABLE 문이나 다른 SQL 문 실행
        try:
            conn.executescript(sql_content)
            logger.info("Executed SQL script")
        except Exception as e:
            logger.error(f"Error executing SQL: {e}")

def main():
    data_dir = os.path.dirname(__file__)
    db_path = os.path.join(data_dir, 'LePain.db')
    
    # 기존 DB 삭제
    if os.path.exists(db_path):
        logger.info(f"Removing existing database...")
        os.remove(db_path)
    
    # 새 데이터베이스 생성
    conn = sqlite3.connect(db_path)
    
    try:
        # 1. 스키마 생성
        logger.info("Creating schema...")
        schema_path = os.path.join(data_dir, '00_create_schema.sql')
        process_sql_dump(schema_path, conn)
        
        # 2. 데이터 임포트
        logger.info("Importing daily_sales_summary...")
        daily_dump_path = os.path.join(data_dir, 'daily_sales_summary_dump.sql')
        process_sql_dump(daily_dump_path, conn)
        
        logger.info("Importing receipt_sales_detail...")
        receipt_dump_path = os.path.join(data_dir, 'receipt_sales_detail_dump.sql')
        process_sql_dump(receipt_dump_path, conn)
        
        # 3. 인덱스 생성
        logger.info("Creating indexes...")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_sales_summary(date);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_daily_store ON daily_sales_summary(store_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt_sales_detail(date);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_receipt_store ON receipt_sales_detail(store_name);")
        conn.commit()
        
        # 4. 데이터 검증
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM daily_sales_summary")
        daily_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
        receipt_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT DISTINCT store_name FROM daily_sales_summary")
        stores = [row[0] for row in cursor.fetchall()]
        
        logger.info(f"Database created successfully!")
        logger.info(f"- daily_sales_summary: {daily_count} rows")
        logger.info(f"- receipt_sales_detail: {receipt_count} rows")
        logger.info(f"- Stores: {', '.join(stores)}")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
