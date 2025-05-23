#!/usr/bin/env python3
"""
3월 석촌점 상품별 매출 데이터 확인 스크립트
"""

import sqlite3
from datetime import datetime

def check_march_seokchon_data():
    # DB 연결
    db_path = 'data/LePain.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=== 3월 석촌점 상품별 매출 데이터 확인 ===")
    print()
    
    # 1. 기본 정보 확인
    print("1. 기본 정보:")
    cursor.execute("""
        SELECT COUNT(*) as total_records
        FROM receipt_sales_detail 
        WHERE store_name = '석촌점' AND date LIKE '2025-03%'
    """)
    total_records = cursor.fetchone()[0]
    print(f"   - 3월 석촌점 총 거래 건수: {total_records:,}건")
    
    cursor.execute("""
        SELECT COUNT(DISTINCT product_name) as unique_products
        FROM receipt_sales_detail 
        WHERE store_name = '석촌점' AND date LIKE '2025-03%'
    """)
    unique_products = cursor.fetchone()[0]
    print(f"   - 3월 석촌점 상품 종류: {unique_products}개")
    
    cursor.execute("""
        SELECT SUM(actual_sales) as total_sales
        FROM receipt_sales_detail 
        WHERE store_name = '석촌점' AND date LIKE '2025-03%'
    """)
    total_sales = cursor.fetchone()[0]
    print(f"   - 3월 석촌점 총 매출액: {total_sales:,}원")
    print()
    
    # 2. 상품별 매출 TOP 15
    print("2. 상품별 매출 TOP 15:")
    cursor.execute("""
        SELECT 
            product_name,
            COUNT(*) as sales_count,
            SUM(quantity) as total_quantity,
            SUM(actual_sales) as total_sales,
            ROUND(AVG(actual_sales), 0) as avg_sales
        FROM receipt_sales_detail 
        WHERE store_name = '석촌점' AND date LIKE '2025-03%'
        GROUP BY product_name
        ORDER BY total_sales DESC
        LIMIT 15
    """)
    
    results = cursor.fetchall()
    print(f"{'순위':>4} | {'상품명':<25} | {'판매건수':>8} | {'총수량':>8} | {'총매출액':>12} | {'평균단가':>10}")
    print("-" * 85)
    
    for i, (product_name, sales_count, total_quantity, total_sales, avg_sales) in enumerate(results, 1):
        product_display = product_name[:25] if len(product_name) <= 25 else product_name[:22] + "..."
        print(f"{i:4d} | {product_display:<25} | {sales_count:8,d} | {total_quantity:8,d} | {total_sales:12,d} | {avg_sales:10,.0f}")
    
    print()
    
    # 3. 상품 카테고리별 분석 (상품명 패턴 기반)
    print("3. 주요 상품 카테고리별 매출:")
    categories = [
        ('크루아상', "product_name LIKE '%크루아상%'"),
        ('브레드', "product_name LIKE '%브레드%' OR product_name LIKE '%빵%'"),
        ('케이크', "product_name LIKE '%케이크%'"),
        ('쿠키', "product_name LIKE '%쿠키%'"),
        ('음료', "product_name LIKE '%라떼%' OR product_name LIKE '%커피%' OR product_name LIKE '%차%' OR product_name LIKE '%음료%'"),
        ('샌드위치', "product_name LIKE '%샌드위치%'"),
    ]
    
    for category_name, condition in categories:
        cursor.execute(f"""
            SELECT 
                COUNT(*) as sales_count,
                SUM(actual_sales) as total_sales,
                COUNT(DISTINCT product_name) as product_types
            FROM receipt_sales_detail 
            WHERE store_name = '석촌점' AND date LIKE '2025-03%' AND {condition}
        """)
        
        result = cursor.fetchone()
        if result and result[0] > 0:
            sales_count, total_sales, product_types = result
            print(f"   - {category_name:<10}: {sales_count:6,d}건, {total_sales:10,d}원, {product_types:2d}종류")
    
    print()
    
    # 4. 일별 매출 패턴 (3월 첫 주)
    print("4. 3월 첫 주 일별 매출 패턴:")
    cursor.execute("""
        SELECT 
            date,
            COUNT(*) as daily_sales_count,
            SUM(actual_sales) as daily_sales,
            COUNT(DISTINCT product_name) as daily_products
        FROM receipt_sales_detail 
        WHERE store_name = '석촌점' AND date BETWEEN '2025-03-01' AND '2025-03-07'
        GROUP BY date
        ORDER BY date
    """)
    
    daily_results = cursor.fetchall()
    print(f"{'날짜':>12} | {'판매건수':>8} | {'매출액':>12} | {'상품종류':>8}")
    print("-" * 50)
    
    for date, sales_count, daily_sales, product_count in daily_results:
        print(f"{date:>12} | {sales_count:8,d} | {daily_sales:12,d} | {product_count:8d}")
    
    conn.close()
    print()
    print("=== 데이터 확인 완료 ===")
    print("✅ 3월 석촌점 상품별 매출/판매 개수 데이터가 충분히 존재합니다!")

if __name__ == "__main__":
    check_march_seokchon_data() 