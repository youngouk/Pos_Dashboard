# POS Dashboard - AI-Powered Analytics Platform

## 🚀 프로젝트 개요

POS Dashboard는 매장 운영 데이터를 종합적으로 분석하고 AI 기반 인사이트를 제공하는 현대적인 대시보드 플랫폼입니다. React 프론트엔드와 FastAPI 백엔드를 기반으로 구축되었으며, 실시간 데이터 분석과 AI 기반 경영 인사이트를 제공합니다.

## ✨ 주요 기능

### 📊 데이터 분석 및 시각화
- **매장 현황 분석**: 일별/월별 매출, 거래수, 객단가 분석
- **상품별 분석**: 베스트셀러, 판매량 분석, 수익성 평가
- **시간대별 분석**: 요일별/시간대별 매출 패턴 분석
- **벤치마크 비교**: 타 매장 대비 성과 비교 분석

### 🤖 AI 기반 인사이트
- **종합 경영 성과 분석**: 페이지 전체 데이터를 활용한 심층 분석
- **개별 차트 분석**: 각 차트별 맞춤형 AI 분석
- **실행 가능한 제안**: 경영진 관점의 구체적 개선 방안 제시
- **마크다운 편집**: AI 분석 결과 편집 및 저장 기능

### 📈 고급 시각화
- **반응형 차트**: Recharts 기반 인터랙티브 차트
- **실시간 필터링**: 날짜, 매장, 카테고리별 동적 필터링
- **기준선 표시**: 평균값, 중앙값, 최고/최저값 기준선
- **PDF 내보내기**: 분석 결과 PDF 다운로드

## 🛠 기술 스택

### Frontend
- **React 18**: 모던 React 훅 기반 개발
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Recharts**: 데이터 시각화 라이브러리
- **React Markdown**: 마크다운 렌더링
- **Axios**: HTTP 클라이언트

### Backend
- **FastAPI**: 고성능 Python 웹 프레임워크
- **Pydantic**: 데이터 검증 및 설정 관리
- **SQLAlchemy**: ORM 및 데이터베이스 추상화
- **Pandas/NumPy**: 데이터 분석 및 처리
- **OpenAI API**: AI 기반 분석 엔진

### Database
- **Supabase**: 메인 데이터베이스 (PostgreSQL)
- **SQLite**: 로컬 개발 및 백업 데이터베이스

### DevOps
- **Docker**: 컨테이너화
- **Docker Compose**: 멀티 컨테이너 오케스트레이션
- **Nginx**: 리버스 프록시 및 정적 파일 서빙

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 16+
- Python 3.8+
- Docker & Docker Compose (선택사항)

### 로컬 개발 환경 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/youngouk/Pos_Dashboard.git
cd Pos_Dashboard
```

#### 2. 백엔드 설정
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 환경 변수 설정
cp sample.env .env
# .env 파일에서 필요한 설정 수정

# 로컬 데이터베이스 초기화
python init_local_db.py

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. 프론트엔드 설정
```bash
cd frontend
npm install
npm start
```

### Docker를 사용한 실행
```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 📁 프로젝트 구조

```
DashBoard4/
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── services/       # API 서비스
│   │   ├── contexts/       # React Context
│   │   └── hooks/          # 커스텀 훅
│   └── public/
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 엔드포인트
│   │   ├── core/           # 핵심 설정
│   │   ├── models/         # 데이터 모델
│   │   ├── services/       # 비즈니스 로직
│   │   └── utils/          # 유틸리티
│   └── data/               # 데이터 파일
├── supabase/                # Supabase 설정
└── docker-compose.yml       # Docker 구성
```

## 🔧 주요 API 엔드포인트

### 매출 분석
- `GET /api/sales/daily` - 일별 매출 데이터
- `GET /api/sales/products` - 상품별 매출 데이터
- `GET /api/sales/hourly` - 시간대별 매출 데이터

### AI 분석
- `POST /api/ai/analyze-chart` - 개별 차트 AI 분석
- `POST /api/ai/analyze-page` - 페이지 전체 AI 분석

### 벤치마크 비교
- `GET /api/compare/benchmark` - 벤치마크 비교 데이터
- `GET /api/compare/stores` - 매장 간 비교 데이터

## 🎯 주요 페이지

### 1. 매장 현황분석 (`/blank`)
- 전반적 경영 성과 종합 요약
- 월간 매출 데이터 종합 분석
- 상품별 판매 데이터 분석
- 요일별/시간대별 데이터 분석

### 2. 타 매장 비교 분석 (`/benchmark`)
- 벤치마크 비교 종합 분석
- 상위/하위 25% 매장 비교
- 매장별 성과 지표 비교

### 3. 대시보드 (`/dashboard`)
- KPI 카드 및 주요 지표
- 실시간 데이터 모니터링

## 🔐 환경 변수 설정

### 백엔드 (.env)
```env
# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# OpenAI 설정
OPENAI_API_KEY=your_openai_api_key

# 데이터베이스 설정
LOCAL_MODE=true  # 로컬 SQLite 사용시
DATABASE_URL=your_database_url
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트 관련 문의사항이 있으시면 GitHub Issues를 통해 연락해 주세요.

---

**POS Dashboard** - AI로 더 스마트한 매장 운영을 시작하세요! 🚀