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
# 전체 로그 수준 설정 - Railway 호환성 개선
if settings.DEBUG:
    logging_level = logging.DEBUG
else:
    # LOG_LEVEL이 문자열인 경우 정수로 변환
    if isinstance(settings.LOG_LEVEL, str):
        logging_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    else:
        logging_level = settings.LOG_LEVEL

logging.basicConfig(
    level=logging_level,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 서드파티 라이브러리 로그 수준 조정 - Railway 최적화
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

# Railway 환경에서 로그 레벨 강제 설정
import os
import signal
import sys

if os.getenv("RAILWAY_ENVIRONMENT"):
    # Railway에서는 INFO 레벨로 제한하여 로그 오분류 방지
    logging.getLogger().setLevel(logging.INFO)
    logger.setLevel(logging.INFO)

# 종료 시그널 무시 - Railway 강제 종료 방지
signal.signal(signal.SIGTERM, signal.SIG_IGN)  # SIGTERM 신호 무시
signal.signal(signal.SIGINT, signal.SIG_IGN)   # SIGINT 신호 무시 (Ctrl+C)

logger.info("Signal handlers set to ignore SIGTERM and SIGINT - Railway termination protection enabled")

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
    try:
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
        
        # 데이터베이스 파일 확인 (로컬 DB 모드)
        if settings.USE_LOCAL_DB:
            import os
            db_path = "lepain_local.db"
            if os.path.exists(db_path):
                logger.info(f"Local database found: {db_path}")
                logger.info(f"Database size: {os.path.getsize(db_path)} bytes")
            else:
                logger.error(f"Local database not found: {db_path}")
        
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
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        # Railway에서는 startup 실패시에도 서버가 시작되도록 함
        logger.warning("Continuing startup despite errors...")

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

# Railway 헬스체크 엔드포인트 - 비활성화
# @app.get("/health")
# def railway_health_check():
#     """
#     Railway 헬스체크를 위한 간단한 엔드포인트
#     """
#     try:
#         # 기본 상태 확인
#         status = {
#             "status": "ok", 
#             "timestamp": datetime.now().isoformat(),
#             "app_name": settings.APP_NAME,
#             "environment": settings.ENVIRONMENT
#         }
#         
#         # 데이터베이스 파일 확인 (로컬 DB 모드)
#         if settings.USE_LOCAL_DB:
#             import os
#             db_path = "lepain_local.db"
#             status["database"] = "found" if os.path.exists(db_path) else "missing"
#         
#         return status
#     except Exception as e:
#         # 헬스체크는 항상 성공해야 함
#         return {
#             "status": "ok", 
#             "timestamp": datetime.now().isoformat(),
#             "note": "basic health check"
#         }