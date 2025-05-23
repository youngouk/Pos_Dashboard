## ai.py

from fastapi import APIRouter, HTTPException, Body, Request
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import traceback
import json

from app.services.ai_service import ai_service
from app.services.page_analysis_service import page_analysis_service

# 로거 설정
logger = logging.getLogger("ai_endpoints")

# 요청 모델 정의
class ChartAnalysisRequest(BaseModel):
    """차트 분석 요청 모델"""
    chart_type: str
    chart_data: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = None

class PageAnalysisRequest(BaseModel):
    page_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

# 응답 모델 정의
class ChartAnalysisResponse(BaseModel):
    """차트 분석 응답 모델"""
    analysis: str

class PageAnalysisResponse(BaseModel):
    analysis: str

# 라우터 설정
router = APIRouter()

@router.post("/analyze-chart", response_model=ChartAnalysisResponse)
async def analyze_chart(
    request: Request,
    req_data: ChartAnalysisRequest = Body(...)
):
    """
    차트 데이터를 AI로 분석합니다.
    
    Request Body:
    - **chart_type**: 차트 유형 (dailySales, hourlySales, productSales, productDistribution)
    - **chart_data**: 분석할 차트 데이터
    - **context**: 추가 컨텍스트 정보 (날짜 범위, 매장, 기타 메타데이터)
    """
    try:
        # 상세 로깅 추가
        client_host = request.client.host
        logger.info(f"차트 분석 요청 받음: 클라이언트={client_host}, 차트타입={req_data.chart_type}")
        logger.debug(f"분석 컨텍스트: {json.dumps(req_data.context or {}, ensure_ascii=False)}")
        logger.debug(f"데이터 샘플(최대 3개): {json.dumps(req_data.chart_data[:3] if req_data.chart_data else [], ensure_ascii=False)}")
        
        # AI 서비스 호출
        analysis_result = await ai_service.analyze_chart_data(
            req_data.chart_type,
            req_data.chart_data,
            req_data.context
        )
        
        # 성공 로깅
        logger.info(f"차트 분석 성공: 클라이언트={client_host}, 차트타입={req_data.chart_type}")
        
        return ChartAnalysisResponse(analysis=analysis_result)
        
    except Exception as e:
        # 상세 오류 로깅
        error_traceback = traceback.format_exc()
        logger.error(f"차트 분석 오류: {str(e)}\n{error_traceback}")
        
        # 오류 세부 정보를 포함한 응답
        raise HTTPException(
            status_code=500,
            detail=f"차트 분석 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/analyze-page", response_model=PageAnalysisResponse)
async def analyze_page(
    request: Request,
    req_data: PageAnalysisRequest = Body(...)
):
    """
    대시보드 전체 페이지 데이터를 AI로 분석합니다.
    """
    try:
        client_host = request.client.host
        logger.info(f"페이지 분석 요청 받음: 클라이언트={client_host}")
        logger.debug(f"페이지 데이터 샘플: {json.dumps(req_data.page_data, ensure_ascii=False)[:200]}")
        analysis_result = await page_analysis_service.analyze_full_page_data(
            req_data.page_data,
            req_data.context
        )
        logger.info(f"페이지 분석 성공: 클라이언트={client_host}")
        return PageAnalysisResponse(analysis=analysis_result)
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"페이지 분석 오류: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"페이지 분석 중 오류가 발생했습니다: {str(e)}")
