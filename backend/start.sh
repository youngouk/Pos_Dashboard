#!/bin/bash

# Railway 환경변수 확인
echo "=== Railway Environment Check ==="
echo "PORT: ${PORT:-'Not set'}"
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+Set}"
echo "DATABASE_URL: ${DATABASE_URL:-'Not set'}"
echo "ENVIRONMENT: ${ENVIRONMENT:-'production'}"
echo "APP_NAME: ${APP_NAME:-'LePain Dashboard'}"
echo "DEBUG: ${DEBUG:-'false'}"
echo "USE_LOCAL_DB: ${USE_LOCAL_DB:-'true'}"
echo "================================="

# 포트 설정 (Railway에서 동적 할당)
export PORT=${PORT:-8000}
echo "Starting server on port: $PORT"

# Railway 환경변수 기본값 설정
export ENVIRONMENT=${ENVIRONMENT:-production}
export APP_NAME="${APP_NAME:-LePain Dashboard}"
export DEBUG=${DEBUG:-false}
export USE_LOCAL_DB=${USE_LOCAL_DB:-true}
export API_PREFIX=${API_PREFIX:-/api}
export LOG_LEVEL=${LOG_LEVEL:-INFO}

# 현재 디렉토리 확인
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# 데이터베이스 파일 확인
if [ -f "lepain_local.db" ]; then
    echo "Database file found: lepain_local.db"
    ls -la lepain_local.db
else
    echo "Warning: Database file not found"
fi

# Railway 환경변수 정보 출력
echo "Using Railway environment variables (no .env file needed)"

# 서버 시작
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info 