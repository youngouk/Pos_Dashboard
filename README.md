# LePain 대시보드 애플리케이션

LePain 빵집을 위한 대시보드 애플리케이션으로, 매출 분석, KPI 관리, 이상치 탐지 등 다양한 비즈니스 인사이트를 제공합니다.

## 프로젝트 구조

```
.
├── backend/             # FastAPI 백엔드
│   ├── app/             # 애플리케이션 코드
│   │   ├── api/         # API 엔드포인트
│   │   ├── core/        # 핵심 설정
│   │   ├── models/      # 데이터 모델
│   │   ├── services/    # 비즈니스 로직
│   │   └── utils/       # 유틸리티 함수
│   ├── Dockerfile       # 백엔드 Dockerfile
│   └── requirements.txt # 파이썬 의존성
├── docker-compose.yml   # Docker 구성
└── frontend/            # React 프론트엔드
    ├── public/          # 정적 파일
    ├── src/             # 소스 코드
    ├── Dockerfile       # 프론트엔드 Dockerfile
    └── package.json     # NPM 의존성
```

## 실행 방법

### 환경 변수 설정

1. 프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정합니다:

```
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

### Docker Compose로 실행

전체 애플리케이션을 도커 컴포즈로 실행:

```bash
docker-compose up
```

### 개별 서비스 실행

#### 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### 프론트엔드 실행

```bash
cd frontend
npm install
npm start
```

## 주요 기능

- **대시보드**: 핵심 KPI 및 매출 지표 시각화
- **매출 분석**: 일별, 시간대별, 제품별, 결제 방식별 매출 분석
- **고급 분석**: 이상치 감지, 상관관계 분석, 패턴 분석
- **매장 비교**: 다양한 매장 간 성과 비교 및 벤치마킹
- **공지사항**: 시스템 공지사항 관리

## 기술 스택

- **백엔드**: FastAPI, Python, pandas, scikit-learn, Supabase
- **프론트엔드**: React, Recharts, TailwindCSS
- **데이터베이스**: PostgreSQL (Supabase)
- **컨테이너화**: Docker, Docker Compose