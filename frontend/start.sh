#!/bin/sh

# Railway 환경변수 확인
echo "=== Frontend Environment Check ==="
echo "PORT: ${PORT:-'Not set'}"
echo "NODE_ENV: ${NODE_ENV:-'Not set'}"
echo "REACT_APP_API_URL: ${REACT_APP_API_URL:-'Not set'}"
echo "=================================="

# 포트 설정 (Railway에서 동적 할당)
export PORT=${PORT:-3000}
echo "Starting frontend on port: $PORT"

# Railway Job 인식 방지를 위한 신호 무시 설정
trap '' TERM INT

# 현재 디렉토리 확인
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# 빌드 디렉토리 확인
if [ -d "build" ]; then
    echo "Build directory found"
    ls -la build/
    echo "Build directory contents:"
    ls -la build/
else
    echo "Error: Build directory not found"
    exit 1
fi

# serve 버전 확인
echo "Serve version:"
serve --version

# 서버 시작 - serve는 기본적으로 0.0.0.0에 바인딩됩니다
echo "Starting serve on port $PORT (binding to 0.0.0.0 by default)"
exec serve -s build -p $PORT 