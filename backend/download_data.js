/**
 * Supabase 데이터베이스에서 데이터 추출 및 PostgreSQL 덤프 파일 생성 스크립트
 * 
 * 필요한 패키지:
 * npm install @supabase/supabase-js fs-extra
 */

// @supabase/supabase-js와 fs-extra 패키지 가져오기
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');

// 환경 변수 설정
const SUPABASE_URL = 'https://byqtooupqqorrovwxezs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cXRvb3VwcXFvcnJvdnd4ZXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTg4MDQsImV4cCI6MjA2MjU5NDgwNH0.4cAPDVG7i3MGM_kAJ7_qEm1xCd-fNJ7LUZmqm5nkp70';
const OUTPUT_DIR = path.join(__dirname, 'data');
const START_DATE = '2025-01-01';
const END_DATE = '2025-03-31';

// Supabase 클라이언트 초기화
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 출력 디렉토리 생성
fs.ensureDirSync(OUTPUT_DIR);

// PostgreSQL 스크립트 파일 헤더 생성
const createScriptHeader = (tableName, columns) => {
  return `-- ${tableName} 테이블 데이터 (${START_DATE} ~ ${END_DATE})
-- 생성 시간: ${new Date().toISOString()}

-- 테이블 생성
CREATE TABLE IF NOT EXISTS ${tableName} (
${columns.map(col => `  ${col.name} ${col.type}${col.isPrimary ? ' PRIMARY KEY' : ''}`).join(',\n')}
);

-- 데이터 삽입
`;
};

// PostgreSQL 값 포맷
const formatValue = (value, type) => {
  if (value === null) return 'NULL';
  
  switch (type) {
    case 'integer':
      return String(value);
    case 'timestamp':
      return `'${value}'`;
    case 'date':
      return `'${value}'`;
    case 'text':
    case 'varchar':
    default:
      // 특수 문자 이스케이프 처리
      return `'${String(value).replace(/'/g, "''")}'`;
  }
};

// receipt_sales_detail 테이블 데이터 다운로드 및 덤프 파일 생성
async function downloadReceiptSalesDetail() {
  console.log('receipt_sales_detail 테이블 데이터 다운로드 중...');
  
  // 테이블 컬럼 정의
  const columns = [
    { name: 'id', type: 'integer', isPrimary: true },
    { name: 'date', type: 'date' },
    { name: 'pos_number', type: 'varchar' },
    { name: 'receipt_number', type: 'varchar' },
    { name: 'payment_type', type: 'varchar' },
    { name: 'table_name', type: 'varchar' },
    { name: 'first_order', type: 'timestamp' },
    { name: 'payment_time', type: 'timestamp' },
    { name: 'product_code', type: 'varchar' },
    { name: 'barcode', type: 'varchar' },
    { name: 'product_name', type: 'varchar' },
    { name: 'quantity', type: 'integer' },
    { name: 'total_sales', type: 'integer' },
    { name: 'erp_mapping_code', type: 'varchar' },
    { name: 'note', type: 'text' },
    { name: 'discount_amount', type: 'integer' },
    { name: 'discount_type', type: 'varchar' },
    { name: 'actual_sales', type: 'integer' },
    { name: 'price', type: 'integer' },
    { name: 'vat', type: 'integer' },
    { name: 'created_at', type: 'timestamp' },
    { name: 'store_name', type: 'varchar' }
  ];
  
  // 파일 스트림 생성
  const outputFile = path.join(OUTPUT_DIR, 'receipt_sales_detail_dump.sql');
  const writeStream = fs.createWriteStream(outputFile);
  
  // 헤더 작성
  writeStream.write(createScriptHeader('receipt_sales_detail', columns));
  writeStream.write('INSERT INTO receipt_sales_detail VALUES\n');
  
  // 페이징 처리를 위한 변수
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMoreData = true;
  let isFirstBatch = true;
  
  // 페이징 처리하여 데이터 추출
  while (hasMoreData) {
    const { data, error } = await supabase
      .from('receipt_sales_detail')
      .select('*')
      .gte('date', START_DATE)
      .lte('date', END_DATE)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('데이터 조회 오류:', error);
      break;
    }
    
    if (data.length === 0) {
      hasMoreData = false;
      break;
    }
    
    // 데이터 행 작성
    for (const row of data) {
      if (!isFirstBatch) {
        writeStream.write(',\n');
      }
      
      const values = columns.map(col => formatValue(row[col.name], col.type));
      writeStream.write(`${isFirstBatch ? '' : '  '}(${values.join(', ')})`);
      
      isFirstBatch = false;
    }
    
    page++;
    console.log(`receipt_sales_detail: ${page * PAGE_SIZE} 건 처리 완료`);
  }
  
  // SQL 종료
  writeStream.write(';\n');
  writeStream.end();
  
  console.log(`receipt_sales_detail 테이블 덤프 파일 생성 완료: ${outputFile}`);
}

// daily_sales_summary 테이블 데이터 다운로드 및 덤프 파일 생성
async function downloadDailySalesSummary() {
  console.log('daily_sales_summary 테이블 데이터 다운로드 중...');
  
  // 테이블 컬럼 정의
  const columns = [
    { name: 'id', type: 'integer', isPrimary: true },
    { name: 'date', type: 'date' },
    { name: 'no', type: 'integer' },
    { name: 'pos_number', type: 'varchar' },
    { name: 'receipt_number', type: 'varchar' },
    { name: 'payment_time', type: 'timestamp' },
    { name: 'payment_type', type: 'varchar' },
    { name: 'total_sales', type: 'integer' },
    { name: 'total_discount', type: 'integer' },
    { name: 'actual_sales', type: 'integer' },
    { name: 'price', type: 'integer' },
    { name: 'vat', type: 'integer' },
    { name: 'created_at', type: 'timestamp' },
    { name: 'store_name', type: 'varchar' }
  ];
  
  // 파일 스트림 생성
  const outputFile = path.join(OUTPUT_DIR, 'daily_sales_summary_dump.sql');
  const writeStream = fs.createWriteStream(outputFile);
  
  // 헤더 작성
  writeStream.write(createScriptHeader('daily_sales_summary', columns));
  writeStream.write('INSERT INTO daily_sales_summary VALUES\n');
  
  // 페이징 처리를 위한 변수
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMoreData = true;
  let isFirstBatch = true;
  
  // 페이징 처리하여 데이터 추출
  while (hasMoreData) {
    const { data, error } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .gte('date', START_DATE)
      .lte('date', END_DATE)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('데이터 조회 오류:', error);
      break;
    }
    
    if (data.length === 0) {
      hasMoreData = false;
      break;
    }
    
    // 데이터 행 작성
    for (const row of data) {
      if (!isFirstBatch) {
        writeStream.write(',\n');
      }
      
      const values = columns.map(col => formatValue(row[col.name], col.type));
      writeStream.write(`${isFirstBatch ? '' : '  '}(${values.join(', ')})`);
      
      isFirstBatch = false;
    }
    
    page++;
    console.log(`daily_sales_summary: ${page * PAGE_SIZE} 건 처리 완료`);
  }
  
  // SQL 종료
  writeStream.write(';\n');
  writeStream.end();
  
  console.log(`daily_sales_summary 테이블 덤프 파일 생성 완료: ${outputFile}`);
}

// CSV 파일로 내보내기
async function exportToCsv() {
  console.log('데이터를 CSV 형식으로도 내보내는 중...');
  
  const receiptCsvFile = path.join(OUTPUT_DIR, 'receipt_sales_detail.csv');
  const summaryCsvFile = path.join(OUTPUT_DIR, 'daily_sales_summary.csv');
  
  // receipt_sales_detail 테이블
  const receiptHeader = "id,date,pos_number,receipt_number,payment_type,table_name,first_order,payment_time,product_code,barcode,product_name,quantity,total_sales,erp_mapping_code,note,discount_amount,discount_type,actual_sales,price,vat,created_at,store_name\n";
  
  const receiptStream = fs.createWriteStream(receiptCsvFile);
  receiptStream.write(receiptHeader);
  
  // daily_sales_summary 테이블
  const summaryHeader = "id,date,no,pos_number,receipt_number,payment_time,payment_type,total_sales,total_discount,actual_sales,price,vat,created_at,store_name\n";
  
  const summaryStream = fs.createWriteStream(summaryCsvFile);
  summaryStream.write(summaryHeader);
  
  // Fetch and write receipt_sales_detail data
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMoreData = true;
  
  while (hasMoreData) {
    const { data, error } = await supabase
      .from('receipt_sales_detail')
      .select('*')
      .gte('date', START_DATE)
      .lte('date', END_DATE)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('데이터 조회 오류:', error);
      break;
    }
    
    if (data.length === 0) {
      hasMoreData = false;
      break;
    }
    
    for (const row of data) {
      const csvLine = [
        row.id,
        row.date,
        row.pos_number ? `"${row.pos_number.replace(/"/g, '""')}"` : '',
        row.receipt_number ? `"${row.receipt_number.replace(/"/g, '""')}"` : '',
        row.payment_type ? `"${row.payment_type.replace(/"/g, '""')}"` : '',
        row.table_name ? `"${row.table_name.replace(/"/g, '""')}"` : '',
        row.first_order || '',
        row.payment_time || '',
        row.product_code ? `"${row.product_code.replace(/"/g, '""')}"` : '',
        row.barcode ? `"${row.barcode.replace(/"/g, '""')}"` : '',
        row.product_name ? `"${row.product_name.replace(/"/g, '""')}"` : '',
        row.quantity !== null ? row.quantity : '',
        row.total_sales !== null ? row.total_sales : '',
        row.erp_mapping_code ? `"${row.erp_mapping_code.replace(/"/g, '""')}"` : '',
        row.note ? `"${row.note.replace(/"/g, '""')}"` : '',
        row.discount_amount !== null ? row.discount_amount : '',
        row.discount_type ? `"${row.discount_type.replace(/"/g, '""')}"` : '',
        row.actual_sales !== null ? row.actual_sales : '',
        row.price !== null ? row.price : '',
        row.vat !== null ? row.vat : '',
        row.created_at || '',
        row.store_name ? `"${row.store_name.replace(/"/g, '""')}"` : ''
      ].join(',');
      
      receiptStream.write(csvLine + '\n');
    }
    
    page++;
    console.log(`receipt_sales_detail CSV: ${page * PAGE_SIZE} 건 처리 완료`);
  }
  
  receiptStream.end();
  
  // Fetch and write daily_sales_summary data
  page = 0;
  hasMoreData = true;
  
  while (hasMoreData) {
    const { data, error } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .gte('date', START_DATE)
      .lte('date', END_DATE)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('데이터 조회 오류:', error);
      break;
    }
    
    if (data.length === 0) {
      hasMoreData = false;
      break;
    }
    
    for (const row of data) {
      const csvLine = [
        row.id,
        row.date,
        row.no !== null ? row.no : '',
        row.pos_number ? `"${row.pos_number.replace(/"/g, '""')}"` : '',
        row.receipt_number ? `"${row.receipt_number.replace(/"/g, '""')}"` : '',
        row.payment_time || '',
        row.payment_type ? `"${row.payment_type.replace(/"/g, '""')}"` : '',
        row.total_sales !== null ? row.total_sales : '',
        row.total_discount !== null ? row.total_discount : '',
        row.actual_sales !== null ? row.actual_sales : '',
        row.price !== null ? row.price : '',
        row.vat !== null ? row.vat : '',
        row.created_at || '',
        row.store_name ? `"${row.store_name.replace(/"/g, '""')}"` : ''
      ].join(',');
      
      summaryStream.write(csvLine + '\n');
    }
    
    page++;
    console.log(`daily_sales_summary CSV: ${page * PAGE_SIZE} 건 처리 완료`);
  }
  
  summaryStream.end();
  
  console.log(`CSV 파일 생성 완료:`);
  console.log(`- ${receiptCsvFile}`);
  console.log(`- ${summaryCsvFile}`);
}

// 데이터베이스 스키마 스크립트 생성
async function createSchemaScript() {
  const outputFile = path.join(OUTPUT_DIR, '00_create_schema.sql');
  const schemaScript = `-- LePain 대시보드 데이터베이스 스키마
-- 생성 시간: ${new Date().toISOString()}

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
`;

  fs.writeFileSync(outputFile, schemaScript);
  console.log(`스키마 스크립트 파일 생성 완료: ${outputFile}`);
}

// README 파일 생성
async function createReadme() {
  const readmeFile = path.join(OUTPUT_DIR, 'README.md');
  const readmeContent = `# LePain 대시보드 데이터 덤프

## 데이터 정보
- 기간: ${START_DATE} ~ ${END_DATE}
- 테이블: receipt_sales_detail, daily_sales_summary
- 생성 일시: ${new Date().toISOString()}

## 파일 목록
- \`00_create_schema.sql\`: 데이터베이스 스키마 생성 스크립트
- \`receipt_sales_detail_dump.sql\`: 영수증 판매 상세 데이터
- \`daily_sales_summary_dump.sql\`: 일일 판매 요약 데이터
- \`receipt_sales_detail.csv\`: 영수증 판매 상세 데이터 (CSV 형식)
- \`daily_sales_summary.csv\`: 일일 판매 요약 데이터 (CSV 형식)

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
`;

  fs.writeFileSync(readmeFile, readmeContent);
  console.log(`README 파일 생성 완료: ${readmeFile}`);
}

// 메인 함수
async function main() {
  try {
    console.log(`Supabase 데이터 다운로드 시작 (${START_DATE} ~ ${END_DATE})`);
    console.log(`출력 경로: ${OUTPUT_DIR}`);
    
    // 스키마 스크립트 생성
    await createSchemaScript();
    
    // 데이터 다운로드 및 SQL 덤프 파일 생성
    await downloadReceiptSalesDetail();
    await downloadDailySalesSummary();
    
    // CSV 파일 생성
    await exportToCsv();
    
    // README 생성
    await createReadme();
    
    console.log('\n모든 작업이 완료되었습니다.');
    console.log(`출력 디렉토리: ${OUTPUT_DIR}`);
    console.log('사용 방법은 README.md 파일을 참조하세요.');
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 스크립트 실행
main();
