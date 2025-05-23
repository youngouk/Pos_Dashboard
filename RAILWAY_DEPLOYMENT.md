# Railway 모노레포 배포 가이드

## 🚀 Railway 배포 단계별 가이드

### 1. Railway 프로젝트 생성
1. [Railway](https://railway.app) 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. `youngouk/Pos_Dashboard` 저장소 선택

### 2. 백엔드 서비스 설정
1. Railway 대시보드에서 "Add Service" 클릭
2. "GitHub Repo" 선택
3. **중요**: Settings → General → Root Directory를 `backend`로 설정
4. Settings → Environment에서 환경변수 설정:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   DATABASE_URL=sqlite:///./lepain_local.db
   ENVIRONMENT=production
   ```

### 3. 프론트엔드 서비스 설정
1. Railway 대시보드에서 "Add Service" 클릭
2. "GitHub Repo" 선택
3. **중요**: Settings → General → Root Directory를 `frontend`로 설정
4. Settings → Environment에서 환경변수 설정:
   ```
   REACT_APP_API_URL=https://your-backend-service.railway.app
   NODE_ENV=production
   ```

### 4. 서비스 연결
1. 백엔드 서비스가 배포되면 URL 복사
2. 프론트엔드 환경변수 `REACT_APP_API_URL`에 백엔드 URL 설정
3. 프론트엔드 재배포

## 📋 체크리스트

### 백엔드 서비스
- [ ] Root Directory: `backend`
- [ ] Dockerfile 존재 확인: `backend/Dockerfile`
- [ ] 환경변수 설정 완료
- [ ] 헬스체크 엔드포인트: `/health`

### 프론트엔드 서비스  
- [ ] Root Directory: `frontend`
- [ ] Dockerfile 존재 확인: `frontend/Dockerfile`
- [ ] 백엔드 URL 환경변수 설정
- [ ] 빌드 성공 확인

## 🔧 트러블슈팅

### 문제 1: "Dockerfile does not exist"
**해결책**: Railway 서비스 설정에서 Root Directory가 올바르게 설정되었는지 확인

### 문제 2: 프론트엔드에서 API 호출 실패
**해결책**: 
1. 백엔드 서비스 URL 확인
2. CORS 설정 확인
3. 환경변수 `REACT_APP_API_URL` 확인

### 문제 3: 백엔드 빌드 실패
**해결책**:
1. `requirements.txt` 의존성 확인
2. Python 버전 호환성 확인
3. 환경변수 설정 확인

## 📝 주의사항

1. **Root Directory 설정 필수**: 각 서비스마다 올바른 루트 디렉토리 설정
2. **환경변수**: 프로덕션 환경에 맞는 환경변수 설정
3. **CORS**: 백엔드에서 프론트엔드 도메인 허용 설정
4. **데이터베이스**: 현재는 SQLite 로컬 DB 사용 (프로덕션에서는 PostgreSQL 권장)

## 🌐 배포 후 확인사항

1. 백엔드 헬스체크: `https://your-backend.railway.app/health`
2. 프론트엔드 접속: `https://your-frontend.railway.app`
3. API 연결 테스트: 대시보드에서 데이터 로딩 확인
4. AI 분석 기능 테스트: 분석 버튼 클릭하여 정상 작동 확인 