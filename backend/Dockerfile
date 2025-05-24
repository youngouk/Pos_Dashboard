## Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# 데이터베이스 파일을 현재 디렉토리로 복사 (Railway 환경 호환)
COPY data/lepain.db ./lepain_local.db

# Set file permissions
RUN chmod 644 lepain_local.db

# Railway에서 동적으로 할당하는 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
