## main.py

from fastapi import FastAPI
import logging
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
# from app.core.database import supabase  # 로컬 모드에서는 사용하지 않음

from app.core.config import settings
from app.api.router import api_router
from app.services.notice_service import notice_service
from app.services.store_service import store_service

# 로거 설정
logger = logging.getLogger("main")
# 전체 로그 수준 설정
logging_level = logging.DEBUG if settings.DEBUG else logging.getLevelName(settings.LOG_LEVEL)
logging.basicConfig(
    level=logging_level,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 서드파티 라이브러리 로그 수준 조정
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("asyncio").setLevel(logging.WARNING)
# HTTP/2 관련 로그 레벨 조정 (백엔드 로그 과도 방지)
logging.getLogger("hpack").setLevel(logging.ERROR)
logging.getLogger("hpack.hpack").setLevel(logging.ERROR)
logging.getLogger("hpack.table").setLevel(logging.ERROR)
logging.getLogger("h2").setLevel(logging.WARNING)
logging.getLogger("h2.connection").setLevel(logging.WARNING)

# FastAPI 앱 인스턴스 생성
app = FastAPI(
    title=settings.APP_NAME,
    description="LePain Store Dashboard API",
    debug=settings.DEBUG,
)

# CORS 미들웨어 설정 - 모든 origin 허용 (MVP용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 method 허용
    allow_headers=["*"],  # 모든 header 허용
)

# API 라우터 등록
app.include_router(api_router, prefix=settings.API_PREFIX)

# 서버 시작 시 샘플 데이터 초기화 및 환경 설정
@app.on_event("startup")
async def startup_event():
    """서버 시작 이벤트 핸들러"""
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Log level: {logging_level}")
    logger.info(f"Using Local DB: {settings.USE_LOCAL_DB}")
    
    # API 키 로깅 (마스킹)
    anthropic_key = settings.ANTHROPIC_API_KEY
    if anthropic_key:
        masked_key = f"{anthropic_key[:8]}...{anthropic_key[-4:]}" if len(anthropic_key) > 12 else "***"
        logger.info(f"Anthropic API Key loaded: {masked_key}")
    else:
        logger.warning("Anthropic API Key not set!")
    
    # 샘플 공지사항 초기화 (로컬 DB 모드에서는 스킵)
    if not settings.USE_LOCAL_DB:
        await notice_service.initialize_sample_notices()
    
    # 서버 시작 시간 기록
    app.state.start_time = datetime.now()
    app.state.uptime = 0
    
    # 매장 API 초기화 로깅
    logger.info("매장 API 초기화 완료")
    
    # 추가 초기화 작업
    logger.info("Server initialization complete")

# 루트 경로 헬스체크 엔드포인트 (확장)
@app.get("/")
def health_check():
    """
    서버 상태 확인을 위한 헬스체크 엔드포인트
    """
    # 서버 가동 시간 업데이트
    if hasattr(app.state, 'start_time'):
        app.state.uptime = (datetime.now() - app.state.start_time).total_seconds()
    
    return {
        "status": "healthy", 
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": getattr(app.state, 'uptime', 0),
        "started_at": getattr(app.state, 'start_time', datetime.now()).isoformat()
    }
    
# 환경 설정 정보 확인 엔드포인트 (개발 환경용)
@app.get("/info")
def get_app_info():
    """
    애플리케이션 정보 및 환경 설정을 확인하는 엔드포인트 (개발 환경용)
    """
    if not settings.DEBUG:
        return {"message": "This endpoint is only available in debug mode"}
    
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "api_prefix": settings.API_PREFIX,
        "database_url": "***REDACTED***",  # 보안상 실제 URL은 노출하지 않음
    }