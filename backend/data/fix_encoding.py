#!/usr/bin/env python3
"""
receipt_sales_detail 테이블의 한글 인코딩 문제를 수정하는 스크립트
"""

import sqlite3
import os

def fix_encoding():
    db_path = os.path.join(os.path.dirname(__file__), 'LePain.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 잘못된 인코딩으로 저장된 store_name 값들을 매핑
        encoding_map = {
            '명동점': '명동점',
            '몽핀점': '몽핀점', 
            '석촌점': '석촌점'
        }
        
        # 현재 store_name 값들 확인
        cursor.execute("SELECT DISTINCT store_name FROM receipt_sales_detail")
        current_stores = [row[0] for row in cursor.fetchall()]
        print(f"현재 store_name 값들: {current_stores}")
        
        # CSV 파일에서 직접 데이터 가져오기
        import pandas as pd
        csv_path = os.path.join(os.path.dirname(__file__), 'receipt_sales_detail.csv')
        
        if os.path.exists(csv_path):
            print("CSV 파일에서 데이터를 다시 임포트합니다...")
            
            # 기존 데이터 삭제
            cursor.execute("DELETE FROM receipt_sales_detail")
            
            # CSV 데이터 읽기
            df = pd.read_csv(csv_path)
            
            # 데이터 임포트
            df.to_sql('receipt_sales_detail', conn, if_exists='append', index=False)
            
            print(f"임포트 완료: {len(df)} 레코드")
            
            # 확인
            cursor.execute("SELECT COUNT(*), COUNT(DISTINCT store_name) FROM receipt_sales_detail")
            total, stores = cursor.fetchone()
            print(f"총 레코드: {total}, 매장 수: {stores}")
            
            cursor.execute("SELECT DISTINCT store_name FROM receipt_sales_detail")
            new_stores = [row[0] for row in cursor.fetchall()]
            print(f"새로운 store_name 값들: {new_stores}")
            
        else:
            print("CSV 파일을 찾을 수 없습니다.")
            
        conn.commit()
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_encoding()
