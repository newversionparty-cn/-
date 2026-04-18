"""
ENCORE 数据解析服务
解析行业 - 生态系统服务依赖/影响矩阵
"""
import pandas as pd
import os
from typing import Tuple, List, Dict


class EncoreService:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.dependency_df = None
        self.pressure_df = None
        self._load_data()
    
    def _load_data(self):
        """加载 ENCORE CSV 数据"""
        dependency_path = os.path.join(
            self.data_dir,
            "Updated ENCORE knowledge base September 2025/ENCORE files/03. Dependency links.csv"
        )
        pressure_path = os.path.join(
            self.data_dir,
            "Updated ENCORE knowledge base September 2025/ENCORE files/05. Pressure links.csv"
        )
        
        self.dependency_df = pd.read_csv(dependency_path)
        self.pressure_df = pd.read_csv(pressure_path)
    
    def get_sector_profile(self, isic_code: str) -> Tuple[List[Dict], List[Dict]]:
        """
        获取某个行业的依赖度和影响度画像
        
        Args:
            isic_code: ISIC 行业代码（如 A_1_14_141）
        
        Returns:
            (dependencies, impacts) 两个列表
        """
        # 查找该行业的依赖关系
        dep_row = self.dependency_df[
            self.dependency_df["ISIC Unique code"] == isic_code
        ]
        
        if dep_row.empty:
            # 尝试模糊匹配（行业大类）
            sector_prefix = isic_code.split("_")[0]
            dep_row = self.dependency_df[
                self.dependency_df["ISIC Unique code"].str.startswith(sector_prefix)
            ]
        
        if dep_row.empty:
            return [], []
        
        # 解析依赖度（高/中/低）
        dependencies = []
        for col in dep_row.columns:
            if col not in ["ISIC Unique code", "ISIC level used for analysis"]:
                value = dep_row[col].values[0]
                if pd.notna(value) and str(value).strip():
                    dependencies.append({
                        "ecosystem_service": col,
                        "dependency_level": self._parse_dependency_level(str(value)),
                        "description": str(value)[:200]  # 截断描述
                    })
        
        # 解析影响度
        pressure_row = self.pressure_df[
            self.pressure_df["ISIC Unique code"] == isic_code
        ]
        impacts = []
        if not pressure_row.empty:
            for col in pressure_row.columns:
                if col not in ["ISIC Unique code"]:
                    value = pressure_row[col].values[0]
                    if pd.notna(value) and str(value).strip():
                        impacts.append({
                            "impact_driver": col,
                            "impact_level": self._parse_impact_level(str(value)),
                            "description": str(value)[:200]
                        })
        
        return dependencies, impacts
    
    def _parse_dependency_level(self, text: str) -> str:
        """从文本中提取依赖等级"""
        text_lower = text.lower()
        if "high" in text_lower or "critical" in text_lower:
            return "high"
        elif "medium" in text_lower or "moderate" in text_lower:
            return "medium"
        elif "low" in text_lower:
            return "low"
        return "unknown"
    
    def _parse_impact_level(self, text: str) -> str:
        """从文本中提取影响等级"""
        return self._parse_dependency_level(text)
    
    def list_sectors(self) -> List[Dict]:
        """列出所有可用行业"""
        return self.dependency_df[[
            "ISIC Unique code",
            "ISIC Division",
            "ISIC Group"
        ]].drop_duplicates().to_dict("records")
