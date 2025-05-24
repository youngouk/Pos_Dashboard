# Node.js 20 베이스 이미지 사용 (Anthropic SDK 요구사항)
FROM node:20-alpine as builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (production 플래그 제거 - 빌드에 필요한 devDependencies 포함)
RUN npm install

# 애플리케이션 코드 복사
COPY . .

# Build argument로 환경변수 받기
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 빌드 시 환경변수 확인 (디버깅용)
RUN echo "Building with REACT_APP_API_URL: $REACT_APP_API_URL"

# 프로덕션 빌드
RUN npm run build

# 빌드 결과 확인
RUN ls -la build/

# 프로덕션 스테이지: nginx 사용
FROM nginx:alpine

# 빌드된 앱을 nginx html 디렉토리로 복사
COPY --from=builder /app/build /usr/share/nginx/html

# nginx 설정 파일 생성 (SPA 지원)
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # 정적 파일 캐싱 \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Railway 웹 서비스 인식을 위한 포트 EXPOSE
EXPOSE 8080

# nginx 시작
CMD ["nginx", "-g", "daemon off;"]