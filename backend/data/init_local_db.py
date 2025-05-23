#!/usr/bin/env python3
"""
SQLite 데이터베이스 초기화 스크립트
Supabase 덤프 파일을 SQLite로 임포트합니다.
"""

import sqlite3
import os
import re
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_sql_dump(file_path):
    """SQL 덤프 파일을 파싱하여 개별 INSERT 문으로 변환"""
    logger.info(f"SQL 덤프 파일 파싱 중: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # INSERT INTO ... VALUES 패턴 찾기
    insert_match = re.search(r'INSERT INTO (\w+) VALUES\s*\n(.*)', content, re.DOTALL)
    if not insert_match:
        logger.error("INSERT 문을 찾을 수 없습니다.")
        return None, []
    
    table_name = insert_match.group(1)
    values_part = insert_match.group(2).strip()
    
    # 마지막 세미콜론 제거
    if values_part.endswith(';'):
        values_part = values_part[:-1]
    
    # 각 값 세트를 개별 INSERT 문으로 변환
    # 간단한 파서 - 괄호 기반으로 분리
    inserts = []
    current_value = ""
    paren_count = 0
    
    for char in values_part:
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
        
        current_value += char
        
        # 완전한 값 세트를 찾았을 때
        if paren_count == 0 and char == ')':
            # 다음 문자가 쉼표면 제거
            value_set = current_value.strip()
            if value_set.endswith(','):
                value_set = value_set[:-1]
            
            if value_set.startswith('('):
                insert_sql = f"INSERT INTO {table_name} VALUES {value_set};"
                inserts.append(insert_sql)
            
            current_value = ""
    
    logger.info(f"파싱 완료: {len(inserts)}개의 INSERT 문 생성")
    return table_name, inserts

def create_database():
    """SQLite 데이터베이스 생성 및 초기화"""
    
    # 데이터베이스 경로
    db_path = os.path.join(os.path.dirname(__file__), 'LePain.db')
    data_path = os.path.dirname(__file__)
    
    # 기존 DB 파일이 있으면 백업
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup"
        logger.info(f"기존 데이터베이스를 백업합니다: {backup_path}")
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(db_path, backup_path)
    
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 스키마 생성
        logger.info("스키마 생성 중...")
        schema_path = os.path.join(data_path, '00_create_schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
            cursor.executescript(schema_sql)
        
        # 2. daily_sales_summary 데이터 임포트
        logger.info("daily_sales_summary 데이터 임포트 중...")
        daily_dump_path = os.path.join(data_path, 'daily_sales_summary_dump.sql')
        
        # CSV 파일을 대신 사용 (더 간단함)
        import csv
        daily_csv_path = os.path.join(data_path, 'daily_sales_summary.csv')
        
        with open(daily_csv_path, 'r', encoding='utf-8') as f:
            csv_reader = csv.DictReader(f)
            rows = []
            for i, row in enumerate(csv_reader):
                rows.append((
                    int(row['id']),
                    row['date'],
                    int(row['no']) if row['no'] else None,
                    row['pos_number'],
                    row['receipt_number'],
                    row['payment_time'],
                    row['payment_type'],
                    int(row['total_sales']) if row['total_sales'] else 0,
                    int(row['total_discount']) if row['total_discount'] else 0,
                    int(row['actual_sales']) if row['actual_sales'] else 0,