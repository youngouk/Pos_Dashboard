import json
import logging
import traceback
from typing import Any, Dict

from app.services.ai_service import AIService

logger = logging.getLogger("page_analysis_service")

class PageAnalysisService(AIService):
    """대시보드 전체 페이지 데이터를 AI로 분석하는 서비스"""
    def __init__(self):
        super().__init__()

    async def analyze_full_page_data(self, page_data: Dict[str, Any], context: Dict[str, Any] = None) -> str:
        """
        전체 대시보드 페이지 데이터를 분석합니다.
        Args:
            page_data: KPI, 차트 데이터, 비교 데이터 등 페이지 전체 데이터를 포함하는 딕셔너리
            context: 추가 설명 또는 메타데이터
        Returns:
            분석 결과 텍스트
        """
        if not self.api_key:
            msg = "API 키가 설정되지 않아 전체 페이지 분석을 수행할 수 없습니다."
            logger.error(msg)
            return f"분석 오류: {msg}"

        # 시스템 프롬프트: 전체 페이지 분석에 특화
        system_prompt = """

당신은 프랜차이즈 매장 대시보드 분석 전문가입니다. KPI, 일별/시간대별/상품별 매출 데이터, 매장 비교 정보를 종합하여 깊이있는 사고를 통해 차트 데이터를 분석하고 경영진에게 전문적이고 통찰력 있는 해석을 제공합니다.

# 분석 원칙
주어진 데이터를 상호 교차분석 하거나, 직접 추가 데이터 분석을 진행하여, 더 심도있는 분석을 바탕으로 답변합니다.

## 분석 시 다음 사항을 고려하세요:
1. 데이터의 주요 패턴과 추세 파악
2. 이상치나 특이점 식별
3. 프랜차이즈 지점운영 관점에서의 실용적인 시사점
4. 누락된 데이터는 무시하고 제공된 데이터를 바탕으로 분석해주세요.

- 주요 KPI 실적
- 주요 트렌드 및 패턴 (일별, 시간대별, 상품별)
- 상위/하위 매장 비교 인사이트
- 제언 및 최적화 방안

# 답변 원칙
* 마크다운과 블렛포인트, 들여쓰기 등을 모두 사용하여 가독성 높게 구성해 주세요.
* 인사이트 중심의 분석결과를 제공하고, 단순 요약 내용은 최대한 피하세요.
* 분석내용은 1000자 미만으로 설정해주세요.

결과와 인사이트 중심으로 답변을 제공하세요.
응답은 항상 한국어로 제공하세요.
"""
        
        # 기본 프롬프트 템플릿
        user_prompt = f"""다음 대시보드 전체 페이지 데이터를 분석해주세요:

페이지 데이터:
{json.dumps(page_data, ensure_ascii=False, indent=2)}

추가 컨텍스트:
{json.dumps(context or {}, ensure_ascii=False)}
"""
        
        try:
            logger.info("전체 페이지 분석 요청 - Claude API 호출 시작")
            # 페이지 분석 전용 호출 - 토큰과 예산을 2배로 늘림
            result = await self._send_fullpage_to_claude(system_prompt, user_prompt)
            return result
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"전체 페이지 분석 오류: {e}\n{tb}")
            return f"전체 페이지 분석 중 오류가 발생했습니다: {e}"

    async def _send_fullpage_to_claude(self, system: str, user_prompt: str) -> str:
        """
        페이지 분석 전용 Claude 호출 (max_tokens, budget_tokens 2배)
        """
        if not self.api_key:
            msg = "API 키가 설정되지 않아 전체 페이지 분석을 수행할 수 없습니다."
            logger.error(msg)
            return f"분석 오류: {msg}"
        try:
            logger.debug("페이지 분석 전용 Claude 호출 - 시스템/사용자 프롬프트 전송")
            import httpx
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-opus-4-20250514",
                        # 페이지 분석용 설정 (2배 증가)
                        "max_tokens": 32000,
                        "temperature": 1,
                        "system": system,
                        "thinking": { "type": "enabled", "budget_tokens": 18000 },
                        "messages": [
                            { "role": "user", "content": user_prompt }
                        ]
                    }
                )
                logger.info(f"Claude 응답 상태 코드: {response.status_code}")
                if response.status_code != 200:
                    logger.error(f"Claude API 오류: {response.status_code}, {response.text}")
                    return f"분석 중 오류: Claude API 호출 실패 ({response.status_code})"
                data = response.json()
                text = ""
                for c in data.get("content", []):
                    if c.get("type") == "text":
                        text = c.get("text", "")
                        break
                if not text:
                    logger.warning("페이지 분석 전용 응답에서 텍스트를 찾을 수 없습니다.")
                    return "분석 결과를 생성할 수 없습니다."
                return text
        except Exception as e:
            err = str(e)
            tb = traceback.format_exc()
            logger.error(f"페이지 분석 전용 호출 중 예외: {err}\n{tb}")
            return f"분석 중 오류가 발생했습니다: {err}"

page_analysis_service = PageAnalysisService() 