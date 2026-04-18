"""
空间分析服务
处理 WDPA 保护区、水风险等地理空间数据
"""
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, Polygon
from typing import List, Dict, Optional
import os


class SpatialAnalysisService:
    def __init__(self):
        self.protected_areas_gdf = None
        self.water_risk_gdf = None
        # 懒加载：第一次调用时才加载大数据集
    
    def _load_protected_areas(self):
        """加载保护区数据（WDPA）"""
        if self.protected_areas_gdf is not None:
            return
        
        # 尝试加载本地 GeoJSON（预处理后的）
        processed_path = "data/processed/wdpa_china.geojson"
        if os.path.exists(processed_path):
            self.protected_areas_gdf = gpd.read_file(processed_path)
        else:
            # 没有数据时返回空 GeoDataFrame
            self.protected_areas_gdf = gpd.GeoDataFrame()
    
    def _load_water_risk(self):
        """加载水风险数据（WRI Aqueduct）"""
        # TODO: 实现水风险数据加载
        pass
    
    def find_nearby_protected_areas(
        self,
        point: Point,
        radius_km: float = 50
    ) -> List[Dict]:
        """
        查找某点附近指定半径内的保护区
        
        Args:
            point: Shapely Point 对象 (lng, lat)
            radius_km: 搜索半径（公里）
        
        Returns:
            保护区列表，按距离排序
        """
        self._load_protected_areas()
        
        if self.protected_areas_gdf.empty:
            return []
        
        # 创建缓冲区
        point_gdf = gpd.GeoDataFrame(
            {"geometry": [point]},
            crs="EPSG:4326"
        )
        # 转换到投影坐标系以计算准确的缓冲距离
        point_gdf = point_gdf.to_crs("EPSG:3857")
        buffered = point_gdf.buffer(radius_km * 1000)  # 米为单位
        buffered = buffered.to_crs("EPSG:4326")
        
        # 空间连接：找出缓冲区内的保护区
        protected_areas = self.protected_areas_gdf[
            self.protected_areas_gdf.intersects(buffered.iloc[0])
        ]
        
        # 计算距离并排序
        results = []
        for _, row in protected_areas.iterrows():
            distance = point.distance(row["geometry"].centroid) * 111  # 度转公里近似
            results.append({
                "name": row.get("NAME", "Unknown"),
                "type": row.get("IUCN_CAT", "Unknown"),
                "distance_km": round(distance, 2),
                "area_km2": row.get("REP_AREA", 0)
            })
        
        # 按距离排序
        results.sort(key=lambda x: x["distance_km"])
        return results
    
    def get_water_risk(self, lat: float, lng: float) -> str:
        """
        获取某位置的水风险等级
        
        Args:
            lat: 纬度
            lng: 经度
        
        Returns:
            风险等级："low" / "medium" / "high"
        """
        # TODO: 实现水风险查询
        # 目前返回默认值
        return "medium"
    
    def calculate_overlap(
        self,
        asset_point: Point,
        buffer_km: float = 10
    ) -> Dict:
        """
        计算资产点与各类生态区域的叠加情况
        
        Args:
            asset_point: 资产位置
            buffer_km: 缓冲区半径
        
        Returns:
            叠加分析结果
        """
        protected_nearby = self.find_nearby_protected_areas(
            asset_point, radius_km=buffer_km
        )
        
        return {
            "protected_areas_count": len(protected_nearby),
            "nearest_protected_km": (
                protected_nearby[0]["distance_km"] if protected_nearby else None
            ),
            "water_risk": self.get_water_risk(
                asset_point.y, asset_point.x
            )
        }
    
    def load_custom_geojson(self, filepath: str) -> gpd.GeoDataFrame:
        """
        加载自定义 GeoJSON 数据
        
        Args:
            filepath: GeoJSON 文件路径
        
        Returns:
            GeoDataFrame
        """
        return gpd.read_file(filepath)
