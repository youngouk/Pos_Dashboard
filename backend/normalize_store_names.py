import sqlite3
import unicodedata

# 데이터베이스 연결
db_path = "/Users/youngouk/Desktop/LePain/DashBoard4/backend/data/LePain.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# store_name을 NFC로 정규화
print("Normalizing store names to NFC format...")

# 현재 store_name 확인
cursor.execute("SELECT DISTINCT store_name FROM receipt_sales_detail")
stores = cursor.fetchall()
print(f"Found {len(stores)} unique store names")

for store in stores:
    old_name = store[0]
    # NFC로 정규화
    new_name = unicodedata.normalize('NFC', old_name)
    
    # 변경 사항이 있는 경우만 업데이트
    if old_name != new_name:
        print(f"Converting: {repr(old_name)} -> {repr(new_name)}")
        cursor.execute("UPDATE receipt_sales_detail SET store_name = ? WHERE store_name = ?", (new_name, old_name))
    else:
        print(f"Already normalized: {repr(old_name)}")

# 변경사항 저장
conn.commit()

# 정규화 후 확인
print("\nAfter normalization:")
cursor.execute("SELECT DISTINCT store_name, HEX(store_name), LENGTH(store_name) FROM receipt_sales_detail")
results = cursor.fetchall()
for row in results:
    print(f"Store: {row[0]}, HEX: {row[1]}, Length: {row[2]}")

# 테스트 쿼리
print("\nTesting query:")
cursor.execute("SELECT COUNT(*) FROM receipt_sales_detail WHERE store_name = '석촌점'")
count = cursor.fetchone()[0]
print(f"Count for '석촌점': {count}")

conn.close()
print("Done!")
