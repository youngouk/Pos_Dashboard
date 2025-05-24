# Node.js 20 베이스 이미지 사용 (Anthropic SDK 요구사항)
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (production 플래그 제거 - 빌드에 필요한 devDependencies 포함)
RUN npm install

# serve 전역 설치
RUN npm install -g serve

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

# Railway 웹 서비스 인식을 위한 포트 EXPOSE
EXPOSE 8080

# serve로 정적 파일 서빙 (SPA 지원)
CMD ["serve", "-s", "build", "-p", "8080", "--no-clipboard", "--single"]