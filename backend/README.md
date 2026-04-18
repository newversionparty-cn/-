# TNFD Backend - FastAPI + GeoPandas

## 技术栈
- FastAPI: API 框架
- GeoPandas: 空间数据处理
- Turf.py: 空间分析（可选）
- Qwen API: LLM 风险分析

## 目录结构
```
backend/
├── main.py
├── requirements.txt
├── services/
│   ├── encore_parser.py
│   └── spatial_analysis.py
└── data/
    ├── raw/
    └── processed/
```

## 快速启动
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
