from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import os

router = APIRouter()

class SummaryContent(BaseModel):
    content: str

# Determine project root and summaries directory
FILE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(FILE_DIR, '..', '..', '..', '..'))
SUMMARIES_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'public', 'summaries')
os.makedirs(SUMMARIES_DIR, exist_ok=True)

@router.get('/{name}', response_class=PlainTextResponse)
async def get_summary(name: str):
    file_path = os.path.join(SUMMARIES_DIR, f"{name}.md")
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail='Summary not found')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return PlainTextResponse(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/{name}')
async def save_summary(name: str, summary: SummaryContent = Body(...)):
    file_path = os.path.join(SUMMARIES_DIR, f"{name}.md")
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(summary.content)
        return {'status': 'success', 'name': name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 