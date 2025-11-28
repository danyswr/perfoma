"""Tools API endpoints"""
from fastapi import APIRouter
try:
    from tools import ALLOWED_TOOLS, get_allowed_tools_by_category, ALL_ALLOWED_TOOLS
except ImportError:
    ALLOWED_TOOLS = {}
    ALL_ALLOWED_TOOLS = set()
    def get_allowed_tools_by_category(): return {}

router = APIRouter()

@router.get("/tools")
async def get_tools():
    return {"status": "success", "total_tools": len(ALL_ALLOWED_TOOLS), "categories": get_allowed_tools_by_category()}

@router.get("/tools/categories")
async def get_categories():
    cats = get_allowed_tools_by_category()
    return {"status": "success", "categories": list(cats.keys()), "total": len(cats)}

@router.get("/tools/category/{category}")
async def get_by_category(category: str):
    cats = get_allowed_tools_by_category()
    if category not in cats:
        return {"status": "error", "message": f"Category '{category}' not found"}
    return {"status": "success", "category": category, "tools": sorted(list(cats[category])), "total": len(cats[category])}
