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

# Railway 웹 서비스 인식을 위한 포트 EXPOSE
EXPOSE 8080

# Shell 형태로 실행하여 환경변수 확장 보장
CMD ["/bin/bash", "-c", "./start.sh"]
