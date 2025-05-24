#!/bin/bash
set -e

# SIGTERM 신호 무시 - Railway 강제 종료 방지
trap '' SIGTERM SIGINT
echo "Signal traps set to ignore SIGTERM and SIGINT"

# Python 버퍼링 비활성화 (Railway 환경)
export PYTHONUNBUFFERED=1

echo "=== Railway Environment Check ==="
echo "PORT: ${PORT:-8080}"
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+Set}"
echo "DATABASE_URL: '${DATABASE_URL:-Not set}'"
echo "ENVIRONMENT: ${ENVIRONMENT:-development}"
echo "APP_NAME: ${APP_NAME:-LePain Dashboard}"
echo "DEBUG: ${DEBUG:-true}"
echo "USE_LOCAL_DB: ${USE_LOCAL_DB:-true}"
echo "================================="

# 포트 설정 (Railway에서 동적 할당)
export PORT=${PORT:-8080}
echo "Starting server on port: $PORT"

# Railway 환경변수 기본값 설정
export ENVIRONMENT=${ENVIRONMENT:-development}
export APP_NAME="${APP_NAME:-LePain Dashboard}"
export DEBUG=${DEBUG:-true}
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
    echo "Warning: lepain_local.db not found"
fi

# Railway 환경변수 정보 출력
echo "Using Railway environment variables (no .env file needed)"

# 서버 시작
echo "Starting uvicorn server..."

# 직접 uvicorn 실행 (신호 무시 상태에서)
echo "Web service starting with signal protection..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info 