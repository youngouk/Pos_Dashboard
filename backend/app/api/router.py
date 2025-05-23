## router.py

from fastapi import APIRouter
from app.api.endpoints import sales, kpi, analytics, compare, trends, notice, store, ai, summary

# 메인 API 라우터
api_router = APIRouter()

# 기능별 라우터 등록
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(kpi.router, prefix="/kpi", tags=["kpi"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(compare.router, prefix="/compare", tags=["compare"])
api_router.include_router(trends.router, prefix="/trends", tags=["trends"])
api_router.include_router(notice.router, prefix="/notice", tags=["notice"])
api_router.include_router(store.router, prefix="/stores", tags=["stores"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(summary.router, prefix="/summary", tags=["summary"])
