# LePain 대시보드 데이터 덤프

## 데이터 정보
- 기간: 2025-01-01 ~ 2025-03-31
- 테이블: receipt_sales_detail, daily_sales_summary
- 생성 일시: 2025-05-18T17:53:06.860Z

## 파일 목록
- `00_create_schema.sql`: 데이터베이스 스키마 생성 스크립트
- `receipt_sales_detail_dump.sql`: 영수증 판매 상세 데이터
- `daily_sales_summary_dump.sql`: 일일 판매 요약 데이터
- `receipt_sales_detail.csv`: 영수증 판매 상세 데이터 (CSV 형식)
- `daily_sales_summary.csv`: 일일 판매 요약 데이터 (CSV 형식)

## 데이터 구조

### receipt_sales_detail
영수증 판매 상세 데이터 테이블입니다.

| 컬럼명 | 데이터 타입 | 설명 |
|--------|------------|------|
| id | INTEGER | 기본 키 |
| date | DATE | 판매 날짜 |
| pos_number | VARCHAR | POS 번호 |
| receipt_number | VARCHAR | 영수증 번호 |
| payment_type | VARCHAR | 결제 유형 |
| table_name | VARCHAR | 테이블 이름 |
| first_order | TIMESTAMP | 첫 주문 시간 |
| payment_time | TIMESTAMP | 결제 시간 |
| product_code | VARCHAR | 제품 코드 |
| barcode | VARCHAR | 바코드 |
| product_name | VARCHAR | 제품 이름 |
| quantity | INTEGER | 수량 |
| total_sales | INTEGER | 총 판매액 |
| erp_mapping_code | VARCHAR | ERP 매핑 코드 |
| note | TEXT | 메모 |
| discount_amount | INTEGER | 할인 금액 |
| discount_type | VARCHAR | 할인 유형 |
| actual_sales | INTEGER | 실제 판매액 |
| price | INTEGER | 가격 |
| vat | INTEGER | 부가가치세 |
| created_at | TIMESTAMP | 생성 시간 |
| store_name | VARCHAR | 매장 이름 |

### daily_sales_summary
일일 판매 요약 테이블입니다.

| 컬럼명 | 데이터 타입 | 설명 |
|--------|------------|------|
| id | INTEGER | 기본 키 |
| date | DATE | 판매 날짜 |
| no | INTEGER | 번호 |
| pos_number | VARCHAR | POS 번호 |
| receipt_number | VARCHAR | 영수증 번호 |
| payment_time | TIMESTAMP | 결제 시간 |
| payment_type | VARCHAR | 결제 유형 |
| total_sales | INTEGER | 총 판매액 |
| total_discount | INTEGER | 총 할인액 |
| actual_sales | INTEGER | 실제 판매액 |
| price | INTEGER | 가격 |
| vat | INTEGER | 부가가치세 |
| created_at | TIMESTAMP | 생성 시간 |
| store_name | VARCHAR | 매장 이름 |
