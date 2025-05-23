import pandas as pd
import sqlite3
from datetime import datetime

# CSV 파일 읽기
csv_path = "/Users/youngouk/Desktop/LePain/DashBoard3/backend/data/receipt_sales_detail.csv"
df = pd.read_csv(csv_path, encoding='utf-8-sig')

# 데이터베이스 연결
db_path = "/Users/youngouk/Desktop/LePain/DashBoard4/backend/data/LePain.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 기존 데이터 삭제
print("기존 데이터 삭제 중...")
cursor.execute("DELETE FROM receipt_sales_detail")
conn.commit()

# 데이터 임포트
print("새 데이터 임포트 중...")
df.to_sql('receipt_sales_detail', conn, if_exists='append', index=False)

# 데이터 확인
cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail")
total_count = cursor.fetchone()[0]
print(f"총 {total_count}개의 레코드가 임포트되었습니다.")

# 매장별 데이터 확인
cursor.execute("""
    SELECT store_name, COUNT(*) as cnt 
    FROM receipt_sales_detail 
    GROUP BY store_name
""")
print("\n매장별 데이터:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}개")

# 테스트 쿼리
print("\n테스트 쿼리 실행:")
cursor.execute("""
    SELECT product_name, SUM(actual_sales) as total 
    FROM receipt_sales_detail 
    WHERE store_name = '명동점' 
    AND date >= '2025-01-01' 
    AND date <= '2025-01-05'
    GROUP BY product_name
    ORDER BY total DESC
    LIMIT 5
""")
print("상위 5개 제품 (명동점, 2025-01-01 ~ 2025-01-05):")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]:,}원")

conn.close()
print("\n임포트 완료!")
