# AI 분석 기능 문서

## 개요
본 프로젝트는 프랜차이즈 매장 대시보드에서 Claude AI를 활용한 데이터 분석 기능을 제공합니다. 두 가지 주요 AI 서비스로 구성되어 있습니다.

## 1. 핵심 AI 서비스 구조

### 1.1 AIService (기본 AI 분석 서비스)
- **파일**: `backend/app/services/ai_service.py`
- **역할**: 개별 차트 데이터 분석 및 기본 AI 기능 제공
- **AI 모델**: Claude-3-7-Sonnet-20250219

### 1.2 PageAnalysisService (전체 페이지 분석 서비스)
- **파일**: `backend/app/services/page_analysis_service.py`
- **역할**: 대시보드 전체 페이지 데이터 종합 분석
- **상속**: AIService를 상속받아 확장된 기능 제공

## 2. 주요 기능

### 2.1 개별 차트 데이터 분석 (`analyze_chart_data`)

#### 지원하는 차트 유형
- **일별 매출 추이** (`dailySales`)
- **시간대별 매출** (`hourlySales`) 
- **상품별 매출** (`productSales`)
- **상품 판매 비율** (`productDistribution`)

#### 분석 내용
각 차트 유형별로 특화된 분석을 제공합니다:

**일별 매출 데이터 분석**
- 매출 증감 추세와 성장률
- 요일별/주간별 매출 패턴
- 이상치 발생 일자와 가능한 원인
- 계절성 및 주기성 패턴
- 특별한 이벤트/할인의 효과 추정

**시간대별 매출 데이터 분석**
- 피크 시간대와 저조한 시간대
- 시간대별 운영 효율성 개선 기회
- 인력 배치 최적화 제안
- 시간대별 매출 변동 패턴
- 운영 시간 조정 검토 필요성

**상품별 매출 데이터 분석**
- 주요 수익 기여 상품과 비중
- 저성과 상품 파악
- 상품 간 판매 상관관계
- 상품 믹스 최적화 제안
- 추가 마케팅/프로모션이 필요한 상품군

**상품 판매 비율 데이터 분석**
- 상품 포트폴리오 균형도 평가
- 매출과 마진 기여도 측면의 상품 분석
- 상품 믹스 최적화 방안
- 교차판매 및 업셀링 기회
- 재고 및 발주 최적화 제안

### 2.2 전체 페이지 종합 분석 (`analyze_full_page_data`)

#### 분석 범위
- KPI 데이터
- 차트 데이터 (일별/시간대별/상품별)
- 매장 비교 정보
- 기타 대시보드 전체 데이터

#### 분석 특징
- **상호 교차분석**: 여러 데이터를 연관지어 분석
- **심도있는 분석**: 단순 요약이 아닌 인사이트 중심
- **종합적 관점**: 전체 데이터를 통합하여 경영 시사점 도출

## 3. 기술적 특징

### 3.1 API 설정
- **모델**: Claude-3-7-Sonnet-20250219
- **API 키**: 환경변수 `ANTHROPIC_API_KEY`로 관리
- **타임아웃**: 300초 (5분)
- **API 버전**: 2023-06-01

### 3.2 토큰 및 예산 관리

#### 개별 차트 분석
- **max_tokens**: 10,000
- **budget_tokens**: 4,000
- **temperature**: 1

#### 전체 페이지 분석 (2배 증가)
- **max_tokens**: 20,000
- **budget_tokens**: 18,000
- **temperature**: 1

### 3.3 데이터 처리
- **데이터 제한**: 차트 분석 시 최대 300개 데이터 포인트
- **JSON 형식**: 한글 지원 (`ensure_ascii=False`)
- **컨텍스트 정보**: 날짜 범위, 매장 정보, 사용자 정의 프롬프트 지원

## 4. 분석 결과 특징

### 4.1 출력 형식
- **언어**: 한국어
- **형식**: 마크다운 + 불릿포인트
- **길이 제한**: 
  - 개별 차트: 500자 미만
  - 전체 페이지: 1000자 미만

### 4.2 분석 원칙
- 데이터의 주요 패턴과 추세 파악
- 이상치나 특이점 식별
- 프랜차이즈 지점운영 관점에서의 실용적인 시사점
- 누락된 데이터 무시, 제공된 데이터 기반 분석
- 인사이트 중심의 결과 제공

## 5. 에러 처리 및 로깅

### 5.1 에러 처리
- API 키 미설정 시 명확한 오류 메시지
- HTTP 상태 코드별 오류 처리
- 타임아웃 및 연결 오류 처리
- JSON 파싱 오류 처리

### 5.2 로깅 시스템
- **로거**: `ai_service`, `page_analysis_service`
- **로그 레벨**: INFO, DEBUG, WARNING, ERROR
- **상세 로깅**: API 호출 상태, 응답 코드, 오류 추적

## 6. 사용 방법

### 6.1 개별 차트 분석
```python
from app.services.ai_service import ai_service

# 차트 데이터 분석
result = await ai_service.analyze_chart_data(
    chart_type="dailySales",
    chart_data=chart_data_list,
    context={
        "dateRange": "2024-01-01 ~ 2024-01-31",
        "selectedStores": "전체 매장",
        "chartTitle": "일별 매출 추이"
    }
)
```

### 6.2 전체 페이지 분석
```python
from app.services.page_analysis_service import page_analysis_service

# 전체 페이지 데이터 분석
result = await page_analysis_service.analyze_full_page_data(
    page_data={
        "kpi": kpi_data,
        "charts": chart_data,
        "comparison": comparison_data
    },
    context={
        "period": "monthly",
        "stores": "selected_stores"
    }
)
```

## 7. 보안 및 설정

### 7.1 API 키 관리
- 환경변수를 통한 안전한 키 관리
- 로그에서 API 키 마스킹 처리
- 키 존재 여부 검증

### 7.2 설정 의존성
- `app.core.config.settings`에서 설정 로드
- `ANTHROPIC_API_KEY` 환경변수 필수

## 8. 확장성 및 유지보수

### 8.1 모듈화 설계
- 기본 AI 서비스와 전문화된 페이지 분석 서비스 분리
- 상속 구조를 통한 코드 재사용
- 독립적인 서비스 인스턴스 제공

### 8.2 커스터마이징
- 차트 유형별 프롬프트 템플릿 수정 가능
- 사용자 정의 프롬프트 지원
- 컨텍스트 정보 확장 가능

이 AI 분석 기능은 프랜차이즈 매장 운영진이 데이터 기반의 의사결정을 내릴 수 있도록 전문적이고 실용적인 인사이트를 제공합니다. 