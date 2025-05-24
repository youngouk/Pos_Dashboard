## Dockerfile

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure database file has correct permissions
RUN chmod 644 lepain_local.db

RUN chmod +x start.sh

# Railway는 동적 포트를 사용하므로 EXPOSE 제거
# EXPOSE는 문서화 목적이므로 실제 바인딩에는 영향 없음

# Shell 형태로 실행하여 환경변수 확장 보장
CMD ["/bin/bash", "-c", "./start.sh"]
