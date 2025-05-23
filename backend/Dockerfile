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

EXPOSE $PORT

CMD ["./start.sh"]
