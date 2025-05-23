## ai_service.py

import os
import json
import httpx
import logging
import traceback
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta

from app.core.config import settings

# 로거 설정
logger = logging.getLogger("ai_service")

class AIService:
    """AI 분석 서비스 - Claude API를 활용한 데이터 분석"""
    
    def __init__(self):
        """서비스 초기화"""
        # 설정에서 API 키 가져오기
        self.api_key = settings.ANTHROPIC_API_KEY
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY 설정이 비어 있습니다.")
        else:
            masked_key = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
            logger.info(f"API 키 로드됨: {masked_key}")
    
    async def analyze_chart_data(
        self, 
        chart_type: str, 
        chart_data: List[Dict[str, Any]], 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        차트 데이터를 AI로 분석합니다.
        
        Args:
            chart_type: 차트 유형 (dailySales, hourlySales, productSales, productDistribution)
            chart_data: 분석할 차트 데이터
            context: 추가 컨텍스트 정보 (날짜 범위, 매장, 기타 메타데이터)
                - userPrompt: 사용자 정의 프롬프트 (선택 사항)
            
        Returns:
            분석 결과 텍스트
        """
        # API 키 확인
        if not self.api_key:
            error_msg = "API 키가 설정되지 않아 AI 분석을 수행할 수 없습니다."
            logger.error(error_msg)
            return f"분석 오류: {error_msg}"
        
        # 로깅
        logger.info(f"차트 분석 시작: 차트 타입={chart_type}, 데이터 개수={len(chart_data)}")
        
        # 차트 타입에 따른 한글 레이블 설정
        chart_type_label = self._get_chart_type_label(chart_type)
        
        # 기본 컨텍스트 정보
        chart_context = {
            "chartType": chart_type_label,
            "dataPoints": chart_data[:300],  # 최대 300개 데이터 포인트 전송으로 수정
            **(context or {})
        }
        
        # 시스템 프롬프트 준비
        system = """당신은 프랜차이즈 매출 데이터 분석 전문가입니다. 깊이있는 사고를 통해 차트 데이터를 분석하고 경영진에게 전문적이고 통찰력 있는 해석을 제공합니다.

분석 시 다음 사항을 고려하세요:
1. 데이터의 주요 패턴과 추세 파악
2. 이상치나 특이점 식별
3. 프랜차이즈 지점운영 관점에서의 실용적인 시사점
4. 누락된 데이터는 무시하고 제공된 데이터를 바탕으로 분석해주세요.

주어진 데이터를 그대로 사용하기보단 다양한 방식으로 교차분석하거나, 더 심도있는 분석을 시도한 후 답변을 제공해주세요.

답변은 마크다운과 블렛포인트를 사용하여 가독성 높게 구성하되, 분석내용은 500자 미만으로 설정해주세요.
결과와 인사이트 중심으로 답변을 제공하세요.
응답은 항상 한국어로 제공하세요."""
        
        # 차트 유형별 기본 프롬프트 정의
        chart_type_prompts = {
            "dailySales": """일별 매출 데이터를 분석하여 다음 사항을 중점적으로 파악해주세요:
- 매출 증감 추세와 성장률
- 요일별/주간별 매출 패턴
- 이상치 발생 일자와 가능한 원인
- 계절성 및 주기성 패턴
- 특별한 이벤트/할인의 효과 추정""",
            
            "hourlySales": """시간대별 매출 데이터를 분석하여 다음 사항을 중점적으로 파악해주세요:
- 피크 시간대와 저조한 시간대
- 시간대별 운영 효율성 개선 기회
- 인력 배치 최적화 제안
- 시간대별 매출 변동 패턴
- 운영 시간 조정 검토 필요성""",
            
            "productSales": """상품별 매출 데이터를 분석하여 다음 사항을 중점적으로 파악해주세요:
- 주요 수익 기여 상품과 비중
- 저성과 상품 파악
- 상품 간 판매 상관관계
- 상품 믹스 최적화 제안
- 추가 마케팅/프로모션이 필요한 상품군""",
            
            "productDistribution": """상품 판매 비율 데이터를 분석하여 다음 사항을 중점적으로 파악해주세요:
- 상품 포트폴리오 균형도 평가
- 매출과 마진 기여도 측면의 상품 분석
- 상품 믹스 최적화 방안
- 교차판매 및 업셀링 기회
- 재고 및 발주 최적화 제안""",
            
            "productAnalysis": """상품별 판매 데이터를 종합 분석하여 다음 사항을 중점적으로 파악해주세요:
- 매출 상위 제품과 판매량 상위 제품 비교 분석
- 가격대별 제품 성과 및 수익성 분석
- 제품 포트폴리오 다양성 및 균형도 평가
- 고수익 제품과 인기 제품 간의 상관관계
- 제품별 평균 단가와 판매 전략 최적화 방안
- 추가 프로모션이나 마케팅이 필요한 제품군 식별""",
            
            "timeAnalysis": """요일별/시간대별/상품 판매 패턴을 종합 분석하여 다음 사항을 중점적으로 파악해주세요:
- 요일별 매출 및 주문 패턴 분석 (주중 vs 주말)
- 시간대별 피크 시간과 저조 시간 식별
- 시간대별 인기 제품 변화와 고객 선호도 패턴
- 운영 효율성 및 인력 배치 최적화 방안
- 시간대별 마케팅 전략 및 프로모션 기회
- 재고 관리 및 상품 진열 최적화 제안"""
        }
        
        # 사용자 정의 프롬프트 또는 차트 유형별 기본 프롬프트 사용
        user_prompt_template = context.get('userPrompt') if context and 'userPrompt' in context else chart_type_prompts.get(chart_type, "")
        
        # 기본 프롬프트 템플릿 준비
        default_prompt_template = f"""다음 {chart_context['chartType']} 차트의 데이터를 분석해주세요:

차트 제목: {context.get('chartTitle', chart_context['chartType'])}
기간: {context.get('dateRange', '최근 데이터') if context else '최근 데이터'}
매장 정보: {context.get('selectedStores', '전체 매장') if context else '전체 매장'}
{context.get('movingAverageEnabled', '') and '이동평균 활성화됨' or ''}

{user_prompt_template}

데이터 포인트:
{json.dumps(chart_context['dataPoints'], ensure_ascii=False, indent=2)}

이 데이터에 대한 전문적인 분석과 경영 의사결정에 도움이 될 인사이트를 제공해주세요."""
        
        try:
            logger.info(f"Claude API 호출 시작 - 모델: claude-3-7-sonnet-20250219")
            
            # API 요청 페이로드 로깅 (민감한 정보는 마스킹)
            request_payload = {
                "model": "claude-3-7-sonnet-20250219",
                "max_tokens": 10000,
                "temperature": 1,
                "system": "시스템 프롬프트 (내용 마스킹)",
                "thinking": { "type": "enabled", "budget_tokens": 4000 },
                "messages": [
                    { "role": "user", "content": "사용자 프롬프트 (내용 마스킹)" }
                ]
            }
            logger.debug(f"API 요청 페이로드: {json.dumps(request_payload, ensure_ascii=False)}")
            
            # Claude API 호출
            async with httpx.AsyncClient(timeout=300.0) as client:
                logger.debug("API 요청 전송 중...")
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-3-7-sonnet-20250219",
                        "max_tokens": 10000,
                        "temperature": 1,
                        "system": system,
                        "thinking": { "type": "enabled", "budget_tokens": 4000 },
                        "messages": [
                            { "role": "user", "content": default_prompt_template }
                        ]
                    }
                )
                
                # 응답 상태 코드 로깅
                logger.info(f"API 응답 상태 코드: {response.status_code}")
                
                # 응답 처리
                if response.status_code != 200:
                    response_text = response.text
                    error_msg = f"API 오류 응답: 상태 코드={response.status_code}, 응답={response_text}"
                    logger.error(error_msg)
                    return f"분석 중 오류가 발생했습니다: API 호출 실패 ({response.status_code})"
                
                # 응답 내용 파싱
                try:
                    result = response.json()
                    logger.info(f"API 응답 받음: ID={result.get('id')}")
                    
                    # 응답 구조 디버깅
                    content_list = result.get("content", [])
                    logger.debug(f"응답 콘텐츠 구조: {json.dumps([{'type': c.get('type')} for c in content_list], ensure_ascii=False)}")
                    
                    # 응답 텍스트 추출
                    analysis_text = ""
                    for content in content_list:
                        if content.get("type") == "text":
                            analysis_text = content.get("text", "")
                            break
                    
                    if not analysis_text:
                        logger.warning("API 응답에서 텍스트를 찾을 수 없습니다.")
                        analysis_text = "분석 결과를 생성할 수 없습니다."
                    
                    logger.info(f"분석 완료: 결과 길이={len(analysis_text)} 자")
                    return analysis_text
                    
                except Exception as json_error:
                    error_msg = f"API 응답 파싱 오류: {str(json_error)}"
                    logger.error(error_msg)
                    logger.debug(f"원시 응답: {response.text[:500]}...")
                    return f"분석 중 오류가 발생했습니다: 응답 파싱 실패"
                
        except httpx.TimeoutException:
            error_msg = "API 요청 시간 초과"
            logger.error(error_msg)
            return f"분석 중 오류가 발생했습니다: {error_msg}"
            
        except httpx.ConnectError as conn_error:
            error_msg = f"API 연결 오류: {str(conn_error)}"
            logger.error(error_msg)
            return f"분석 중 오류가 발생했습니다: API 서버에 연결할 수 없습니다"
            
        except Exception as e:
            error_msg = f"차트 분석 중 예외 발생: {str(e)}"
            error_traceback = traceback.format_exc()
            logger.error(f"{error_msg}\n{error_traceback}")
            return f"분석 중 오류가 발생했습니다: {str(e)}"
            
    def _get_chart_type_label(self, chart_type: str) -> str:
        """차트 타입을 한글 레이블로 변환"""
        labels = {
            "dailySales": "일별 매출 추이",
            "hourlySales": "시간대별 매출",
            "productSales": "상품별 매출", 
            "productDistribution": "상품 판매 비율",
            "productAnalysis": "상품별 판매 데이터 종합 분석",
            "timeAnalysis": "요일별/시간대별/상품 판매 패턴"
        }
        return labels.get(chart_type, chart_type)

    async def _send_to_claude(self, system: str, user_prompt: str) -> str:
        """
        시스템 프롬프트와 사용자 프롬프트를 사용해 Claude API를 호출하고 텍스트 응답을 반환합니다.
        """
        # API 키 확인
        if not self.api_key:
            msg = "API 키가 설정되지 않아 Claude API를 호출할 수 없습니다."
            logger.error(msg)
            return f"분석 오류: {msg}"
        
        try:
            logger.debug("커스텀 Claude 호출 - 시스템 프롬프트와 사용자 프롬프트 전송")
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-3-7-sonnet-20250219",
                        "max_tokens": 10000,
                        "temperature": 1,
                        "system": system,
                        "thinking": { "type": "enabled", "budget_tokens": 4000 },
                        "messages": [
                            { "role": "user", "content": user_prompt }
                        ]
                    }
                )

                logger.info(f"Claude 응답 상태 코드: {response.status_code}")
                if response.status_code != 200:
                    logger.error(f"Claude API 오류: {response.status_code}, {response.text}")
                    return f"분석 중 오류: Claude API 호출 실패 ({response.status_code})"

                result = response.json()
                # content 배열에서 텍스트 추출
                analysis_text = ""
                for content in result.get("content", []):
                    if content.get("type") == "text":
                        analysis_text = content.get("text", "")
                        break
                if not analysis_text:
                    logger.warning("응답에서 텍스트를 찾을 수 없습니다.")
                    return "분석 결과를 생성할 수 없습니다."
                return analysis_text
        except Exception as e:
            err = str(e)
            logger.error(f"Claude API 호출 중 예외: {err}")
            return f"분석 중 오류가 발생했습니다: {err}"

# 서비스 인스턴스 생성 (의존성 주입용)
ai_service = AIService()
