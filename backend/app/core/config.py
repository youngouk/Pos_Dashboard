## config.py

import os
from typing import List, Union
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

# 환경 설정 가능한 변수들을 Config 클래스로 정의
class Settings(BaseSettings):
    # 기본 앱 설정
    APP_NAME: str = "LePain Dashboard"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # 데이터베이스 모드
    USE_LOCAL_DB: bool = True
    
    # Supabase 설정 (로컬 모드에서는 사용하지 않음)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # CORS 설정 - MVP를 위해 간소화
    CORS_ORIGINS: List[str] = ["*"]
    
    # 로깅 설정
    LOG_LEVEL: str = "INFO"
    
    # AI API 설정
    ANTHROPIC_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# settings 객체 생성 (앱 내에서 사용할 환경 설정)
settings = Settings()
