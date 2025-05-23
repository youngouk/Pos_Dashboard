#!/bin/bash
# 백엔드 서버 시작 스크립트 (로컬 DB 모드)

echo "==========================="
echo "LePain 백엔드 서버 시작"
echo "모드: 로컬 SQLite DB"
echo "==========================="

# 환경 변수 설정
export USE_LOCAL_DB=true

# 서버 실행
cd /Users/youngouk/Desktop/LePain/DashBoard4/backend
python3 -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0
