-- LePain 대시보드 데이터베이스 스키마
-- 생성 시간: 2025-05-18T17:52:04.030Z

-- receipt_sales_detail 테이블 생성
CREATE TABLE IF NOT EXISTS receipt_sales_detail (
  id INTEGER PRIMARY KEY,
  date DATE,
  pos_number VARCHAR,
  receipt_number VARCHAR,
  payment_type VARCHAR,
  table_name VARCHAR,
  first_order TIMESTAMP,
  payment_time TIMESTAMP,
  product_code VARCHAR,
  barcode VARCHAR,
  product_name VARCHAR,
  quantity INTEGER,
  total_sales INTEGER,
  erp_mapping_code VARCHAR,
  note TEXT,
  discount_amount INTEGER,
  discount_type VARCHAR,
  actual_sales INTEGER,
  price INTEGER,
  vat INTEGER,
  created_at TIMESTAMP,
  store_name VARCHAR
);

-- daily_sales_summary 테이블 생성
CREATE TABLE IF NOT EXISTS daily_sales_summary (
  id INTEGER PRIMARY KEY,
  date DATE,
  no INTEGER,
  pos_number VARCHAR,
  receipt_number VARCHAR,
  payment_time TIMESTAMP,
  payment_type VARCHAR,
  total_sales INTEGER,
  total_discount INTEGER,
  actual_sales INTEGER,
  price INTEGER,
  vat INTEGER,
  created_at TIMESTAMP,
  store_name VARCHAR
);
