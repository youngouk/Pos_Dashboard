-- 20240513_add_query_functions.sql
-- RUN_QUERY 함수 생성 : 관리자 권한으로 SQL 쿼리를 안전하게 실행할 수 있는 함수
CREATE OR REPLACE FUNCTION public.run_query(query text, params jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- 함수 소유자 권한으로 실행
AS $$
DECLARE
    result jsonb;
BEGIN
    -- 쿼리 실행 및 결과를 JSON으로 변환
    EXECUTE query INTO result;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- 오류 발생 시 오류 정보 반환
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'query', query
    );
END;
$$;

-- 테이블별 DISTINCT 함수 생성
-- 매장 목록을 조회하는 함수
CREATE OR REPLACE FUNCTION public.get_distinct_stores()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- 고유한 매장 목록 조회
    SELECT jsonb_agg(distinct_stores)
    INTO result
    FROM (
        SELECT jsonb_build_object('store_name', store_name) as distinct_stores
        FROM daily_sales_summary
        WHERE store_name IS NOT NULL
        GROUP BY store_name
        ORDER BY store_name
    ) subquery;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- 오류 발생 시 오류 정보 반환
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- 권한 설정
GRANT EXECUTE ON FUNCTION public.run_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_query TO anon;
GRANT EXECUTE ON FUNCTION public.get_distinct_stores TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distinct_stores TO anon; 