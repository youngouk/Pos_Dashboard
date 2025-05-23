# LePain 대시보드 - 로컬 모드 전환 가이드

## 변경 사항 요약

Supabase에서 로컬 CSV 데이터로 전환이 완료되었습니다. 

### 주요 변경 파일

1. **새로 생성된 파일**
   - `/app/core/local_database.py` - 로컬 CSV 데이터를 읽는 어댑터
   - `/test_local_db.py` - 로컬 데이터베이스 테스트 스크립트

2. **수정된 파일**
   - `/app/core/database.py` - Supabase 대신 로컬 어댑터 사용
   - `/app/core/config.py` - Supabase 설정을 옵셔널로 변경
   - `/app/main.py` - Supabase import 제거
   - `/app/services/store_service.py` - 로컬 데이터 사용
   - `/requirements.txt` - supabase 패키지 주석 처리

3. **백업된 파일**
   - `/app/core/database_supabase_backup.py` - 원본 database.py 백업

## 사용 방법

### 1. 서버 실행
```bash
cd /Users/youngouk/Desktop/LePain/DashBoard4/backend
python3 -m uvicorn app.main:app --reload --port 8000
```

### 2. API 테스트
```bash
# 매장 목록 조회
curl http://localhost:8000/api/stores

# 일별 매출 조회 
curl "http://localhost:8000/api/sales/daily?start_date=2025-01-01&end_date=2025-01-07"

# 특정 매장 매출 조회
curl "http://localhost:8000/api/sales/daily?store_name=몽핀점&days=7"
```

## 데이터 구조

CSV 파일은 `/backend/data/` 폴더에 위치:
- `daily_sales_summary.csv` - 일별 매출 요약 (40,729 레코드)
- `receipt_sales_detail.csv` - 영수증 상세 데이터

### 주요 매장
- 몽핀점
- 명동점  
- 석촌점

## 주의사항

1. **SQL 쿼리 미지원**: `run_query()` 함수는 로컬 모드에서 작동하지 않습니다.

2. **메모리 사용**: CSV 파일이 메모리에 로드되므로 대용량 데이터의 경우 메모리 사용량이 증가합니다.

3. **성능**: 첫 번째 요청 시 CSV 파일을 로드하므로 초기 응답이 느릴 수 있습니다.

## 원래 Supabase로 되돌리기

1. 백업 파일 복원:
   ```bash
   mv app/core/database_supabase_backup.py app/core/database.py
   ```

2. requirements.txt에서 supabase 주석 해제:
   ```txt
   supabase>=1.0.3
   ```

3. config.py에서 Supabase 설정 필수로 변경:
   ```python
   SUPABASE_URL: str
   SUPABASE_KEY: str
   ```

4. 환경변수 설정 (.env 파일):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## 추가 개발 필요 사항

1. **서비스 레이어 완전 전환**: 일부 서비스가 아직 SQL 쿼리를 사용할 수 있음
2. **인덱싱**: 성능 향상을 위한 데이터 인덱싱
3. **캐싱**: Redis 등을 사용한 쿼리 결과 캐싱
4. **실제 로컬 DB**: SQLite나 PostgreSQL로 마이그레이션
