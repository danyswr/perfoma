"""Tools API endpoints for retrieving allowed tools information"""

from fastapi import APIRouter
from tools import ALLOWED_TOOLS, get_allowed_tools_by_category, ALL_ALLOWED_TOOLS

router = APIRouter()

@router.get("/tools")
async def get_allowed_tools():
    """Get all allowed tools organized by category"""
    return {
        "status": "success",
        "total_tools": len(ALL_ALLOWED_TOOLS),
        "categories": get_allowed_tools_by_category()
    }

@router.get("/tools/categories")
async def get_tool_categories():
    """Get list of tool categories"""
    categories = get_allowed_tools_by_category()
    return {
        "status": "success",
        "categories": list(categories.keys()),
        "total_categories": len(categories)
    }

@router.get("/tools/category/{category}")
async def get_tools_by_category(category: str):
    """Get tools in a specific category"""
    categories = get_allowed_tools_by_category()
    if category not in categories:
        return {
            "status": "error",
            "message": f"Category '{category}' not found",
            "available_categories": list(categories.keys())
        }
    
    return {
        "status": "success",
        "category": category,
        "tools": sorted(list(categories[category])),
        "total": len(categories[category])
    }

@router.get("/tools/search/{tool_name}")
async def search_tool(tool_name: str):
    """Search for a specific tool"""
    categories = get_allowed_tools_by_category()
    
    for category, tools in categories.items():
        if tool_name.lower() in [t.lower() for t in tools]:
            return {
                "status": "success",
                "tool": tool_name,
                "category": category,
                "found": True
            }
    
    return {
        "status": "error",
        "tool": tool_name,
        "found": False,
        "message": "Tool not found in allowed list"
    }
