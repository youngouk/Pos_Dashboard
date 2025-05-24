# Node.js 20 베이스 이미지 사용 (Anthropic SDK 요구사항)
FROM node:20-alpine

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

# serve 전역 설치
RUN npm install -g serve

# 시작 스크립트 실행 권한 부여
RUN chmod +x start.sh

# Railway에서 동적으로 할당하는 포트 사용
EXPOSE $PORT

# 시작 스크립트 실행
CMD ["./start.sh"]