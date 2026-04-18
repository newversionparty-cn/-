"""
TNFD Backend API - 自然相关财务披露自动化平台
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
import json

from services.encore_parser import EncoreService
from services.spatial_analysis import SpatialAnalysisService

app = FastAPI(
    title="TNFD Disclosure API",
    description="TNFD LEAP 框架自动化披露平台后端",
    version="0.1.0"
)

# CORS 配置（前端 Next.js 开发用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 服务初始化
encore_service = EncoreService("data/raw/encore/")
spatial_service = SpatialAnalysisService()


class AssetPoint(BaseModel):
    name: str
    lat: float
    lng: float
    asset_type: Optional[str] = "factory"


class LocateRequest(BaseModel):
    assets: List[AssetPoint]


class LocateResponse(BaseModel):
    assets: List[dict]
    protected_areas_nearby: List[dict]
    water_risk_level: str


class EvaluateRequest(BaseModel):
    isic_code: str  # 行业代码


class EvaluateResponse(BaseModel):
    dependencies: List[dict]
    impacts: List[dict]


@app.get("/")
def root():
    return {"status": "ok", "service": "TNFD API"}


@app.get("/health")
def health_check():
    """健康检查 - 部署验证用"""
    return {"status": "healthy"}


@app.post("/api/locate", response_model=LocateResponse)
async def locate_assets(request: LocateRequest):
    """
    LEAP - Locate 阶段
    输入：资产坐标列表
    输出：每个资产的空间风险分析（保护区距离、水风险等）
    """
    try:
        # 空间分析：计算每个资产到保护区的距离
        results = []
        for asset in request.assets:
            point = Point(asset.lng, asset.lat)
            
            # 调用空间分析服务
            nearby_protected = spatial_service.find_nearby_protected_areas(
                point, radius_km=50
            )
            water_risk = spatial_service.get_water_risk(asset.lat, asset.lng)
            
            results.append({
                "name": asset.name,
                "lat": asset.lat,
                "lng": asset.lng,
                "nearest_protected_area": nearby_protected[0] if nearby_protected else None,
                "distance_to_protected_km": nearby_protected[0]["distance_km"] if nearby_protected else None,
                "water_risk_level": water_risk,
                "risk_level": _calculate_risk_level(
                    nearby_protected, water_risk
                )
            })
        
        return LocateResponse(
            assets=results,
            protected_areas_nearby=[],
            water_risk_level="medium"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/evaluate", response_model=EvaluateResponse)
async def evaluate_sector(request: EvaluateRequest):
    """
    LEAP - Evaluate 阶段
    输入：行业代码（ISIC）
    输出：该行业的生态系统依赖度和影响度
    """
    try:
        dependencies, impacts = encore_service.get_sector_profile(
            request.isic_code
        )
        return EvaluateResponse(
            dependencies=dependencies,
            impacts=impacts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/assess")
async def assess_risks(locate_data: dict, evaluate_data: dict):
    """
    LEAP - Assess 阶段
    输入：Locate + Evaluate 的结果
    输出：LLM 生成的自然相关风险分析报告
    """
    # TODO: 调用 Qwen API 生成风险分析
    return {"status": "todo"}


@app.post("/api/prepare")
async def prepare_report(all_data: dict):
    """
    LEAP - Prepare 阶段
    输入：全部阶段数据
    输出：TNFD 披露报告（Markdown/PDF）
    """
    # TODO: 生成报告
    return {"status": "todo"}


def _calculate_risk_level(protected_areas: list, water_risk: str) -> str:
    """计算综合风险等级"""
    if protected_areas and protected_areas[0]["distance_km"] < 5:
        return "high"
    if water_risk == "high":
        return "high"
    if protected_areas and protected_areas[0]["distance_km"] < 20:
        return "medium"
    return "low"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
