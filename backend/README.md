# LePain 대시보드 백엔드 API 문서

이 문서는 LePain 빵집 대시보드 애플리케이션의 백엔드 API 기능을 설명합니다.

## 기술 스택

- **FastAPI**: 빠르고 현대적인 Python 웹 프레임워크
- **Python 3.12+**: 최신 Python 런타임 환경
- **Pandas & NumPy**: 데이터 처리 및 분석
- **Scikit-learn & Statsmodels**: 고급 데이터 분석 및 이상치 감지
- **Prophet**: 시계열 데이터 예측
- **Supabase**: 백엔드 데이터베이스 및 인증 서비스

## 프로젝트 구조

```
backend/
├── app/
│   ├── api/                 # API 라우트 및 엔드포인트
│   │   ├── endpoints/       # 기능별 API 엔드포인트
│   │   │   ├── analytics.py # 분석 관련 엔드포인트
│   │   │   ├── compare.py   # 비교 관련 엔드포인트
│   │   │   ├── kpi.py       # KPI 관련 엔드포인트
│   │   │   ├── notice.py    # 공지사항 관련 엔드포인트
│   │   │   ├── sales.py     # 매출 관련 엔드포인트
│   │   │   └── trends.py    # 트렌드 관련 엔드포인트
│   │   └── router.py        # 메인 API 라우터
│   ├── core/                # 핵심 설정 및 유틸리티
│   │   ├── config.py        # 환경 설정
│   │   └── database.py      # 데이터베이스 연결
│   ├── models/              # Pydantic 모델
│   │   ├── analytics.py     # 분석 관련 모델
│   │   ├── compare.py       # 비교 관련 모델
│   │   ├── kpi.py           # KPI 관련 모델
│   │   ├── notice.py        # 공지사항 관련 모델
│   │   ├── sales.py         # 매출 관련 모델
│   │   └── trends.py        # 트렌드 관련 모델
│   ├── services/            # 비즈니스 로직
│   │   ├── analytics_service.py  # 분석 서비스
│   │   ├── compare_service.py    # 비교 서비스
│   │   ├── kpi_service.py        # KPI 서비스
│   │   ├── notice_service.py     # 공지사항 서비스
│   │   ├── sales_service.py      # 매출 서비스
│   │   └── trends_service.py     # 트렌드 서비스
│   ├── utils/               # 유틸리티 함수
│   │   ├── data_processing.py    # 데이터 처리 유틸리티
│   │   └── date_utils.py         # 날짜 관련 유틸리티
│   └── main.py              # 애플리케이션 진입점
├── requirements.txt         # 패키지 의존성
└── sample.env               # 환경 변수 샘플
```

## API 엔드포인트 기능 요약

### 1. 매출 데이터 API (`/sales`)

매출 데이터 조회를 위한 API 엔드포인트들을 제공합니다.

- **GET /sales/daily**: 일별 매출 조회
  - 일일 매출 합계, 할인, 거래 수, 평균 거래 금액 등을 제공
  - 필터: 날짜 범위, 매장

- **GET /sales/hourly**: 시간별 매출 조회
  - 영업 시간대별 매출 추이 데이터 제공
  - 필터: 날짜 범위, 매장

- **GET /sales/products**: 제품별 매출 조회
  - 제품별 판매량, 매출액, 할인액, 매출 비율 등 제공
  - 필터: 날짜 범위, 매장, 상위 제품 수 제한

- **GET /sales/payment_types**: 결제 유형별 매출 조회
  - 결제 수단별 거래 수, 매출액, 비율 등 제공
  - 필터: 날짜 범위, 매장

- **POST /sales/filter**: 필터링된 매출 데이터 조회
  - 다양한 필터 조건을 통해 일별, 제품별, 결제유형별 매출 데이터를 한 번에 조회

### 2. KPI API (`/kpi`)

핵심 성과 지표(KPI) 조회를 위한 API 엔드포인트들을 제공합니다.

- **GET /kpi/summary**: KPI 요약 정보 조회
  - 총 매출, 평균 일일 매출, 총 거래 건수, 평균 거래 금액 등의 요약 정보

- **GET /kpi/trends**: KPI 트렌드 조회
  - 시간에 따른 KPI 지표(매출, 거래 건수, 평균 거래 금액 등)의 변화 추이

- **GET /kpi/products**: 제품별 KPI 조회
  - 제품별 매출 기여도, 판매량, 판매 추이 등 제공
  - 상위 N개 제품 필터링 가능

- **GET /kpi/categories**: 카테고리별 KPI 조회
  - 제품 카테고리별 매출 기여도, 판매량, 판매 추이 등 제공

- **POST /kpi/filter**: 필터링된 KPI 데이터 조회
  - 다양한 필터 조건을 통해 요약, 트렌드, 제품별, 카테고리별 KPI를 한 번에 조회

### 3. 분석 API (`/analytics`)

고급 데이터 분석을 위한 API 엔드포인트들을 제공합니다.

- **GET /analytics/anomalies**: 이상치 감지
  - 매출, 거래 건수 등의 이상치를 감지하여 제공
  - Z-score, IQR 등의 방법 지원

- **GET /analytics/correlations**: 상관관계 분석
  - 매출, 날씨, 이벤트 등 다양한 변수 간의 상관관계 분석
  - Pearson, Spearman 등의 상관계수 지원

- **GET /analytics/patterns**: 패턴 분석
  - 시간대별, 일별, 주별, 월별, 제품별 패턴 분석
  - 다양한 패턴 유형 지원

- **POST /analytics/filter**: 필터링된 분석 데이터 조회
  - 다양한 필터 조건을 통해 이상치, 상관관계, 패턴 분석 결과를 한 번에 조회

### 4. 비교 API (`/compare`)

데이터 비교 분석을 위한 API 엔드포인트들을 제공합니다.

- 기간별, 매장별, 제품별 비교 분석
- 성장률, 변화량 등의 지표 제공

### 5. 트렌드 API (`/trends`)

트렌드 분석 및 예측을 위한 API 엔드포인트들을 제공합니다.

- 과거 데이터 기반의 트렌드 분석
- Prophet 등을 활용한 미래 매출 예측
- 계절성, 추세 등의 요소 분석

### 6. 공지사항 API (`/notice`)

시스템 공지사항을 위한 API 엔드포인트들을 제공합니다.

- 공지사항 목록 조회
- 공지사항 상세 조회
- 읽음 상태 관리

## 일반적인 API 기능

대부분의 API에서 다음과 같은 기능을 제공합니다:

- **날짜 필터링**: 시작일, 종료일 또는 최근 일수 기준 필터링
- **매장 필터링**: 특정 매장 또는 매장 그룹에 따른 필터링
- **페이지네이션**: 대용량 데이터의 페이지 단위 조회
- **정렬**: 다양한 기준에 따른 데이터 정렬
- **집계 범위**: 일별, 주별, 월별 등 다양한 집계 단위 지원

## 시작하기

1. 필요한 패키지 설치:
   ```bash
   pip install -r requirements.txt
   ```

2. 환경 변수 설정:
   ```bash
   cp sample.env .env
   # .env 파일을 알맞게 수정
   ```

3. 서버 실행:
   ```bash
   uvicorn app.main:app --reload
   ```

4. API 문서 확인:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`