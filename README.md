# TNFD LEAP Framework

> 自然相关财务信息披露自动化工作台

[![GitHub stars](https://img.shields.io/github/stars/newversionparty-cn/-)](https://github.com/newversionparty-cn/-)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 项目简介

TNFD LEAP 是基于 **TNFD v1.0 框架** 和 **LEAP 方法论**（Locate → Evaluate → Assess → Prepare）构建的自动化披露工具，帮助中国 NGO 和中小企业快速完成自然相关财务信息披露。

## 核心功能

| 步骤 | 模块 | 说明 |
|------|------|------|
| **L** | 定位资产 | CSV 批量上传 / 地图搜索 / 点击选点，自动识别保护区（WDPA） |
| **E** | 行业评价 | 基于 ENCORE 数据库，分析行业自然资本依赖度与影响驱动因素 |
| **A** | AI 评估 | Qwen 大模型推理，输出 TNFD 风险与机遇分析报告 |
| **P** | 报告生成 | 一键导出符合 TNFD v1.0 框架的 PDF 披露报告 |

## 技术栈

- **前端框架**: Next.js 16 + TypeScript + App Router
- **样式**: Tailwind CSS + 自定义设计系统（森林绿 + 暖米色）
- **状态管理**: Zustand
- **地图**: react-leaflet + OpenStreetMap / ESRI 底图
- **数据**: ENCORE (2025 Sep) + WDPA API
- **AI**: Qwen（阿里云百炼兼容 OpenAI SDK）
- **PDF**: html2pdf.js

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/newversionparty-cn/-.git
cd -

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开 http://localhost:3000
```

## 数据来源

- **自然资本依赖与影响**: [ENCORE Database](https://encoreforcapital.org/) (Sep 2025)
- **保护区交叉验证**: [WDPA - World Database on Protected Areas](https://www.protectedplanet.net/)
- **地图底图**: [ESRI World Imagery / World Topo Map](https://www.esri.com/)

## 数据说明

本工具处理的所有数据均在本地浏览器中完成，不会上传至任何第三方服务器。

## 免责声明

风险评估结果由 AI 模型生成，仅供参考。实际披露前建议咨询专业 ESG 顾问。

## 致谢

- [TNFD](https://tnfd.global/) - Taskforce on Nature-related Financial Disclosures
- [ENCORE](https://encoreforcapital.org/) - Exploring Natural Capital Opportunities, Risks and Exposure
- [Protected Planet](https://www.protectedplanet.net/) - UNEP-WCMC

---

MIT License · 用爱开发，为地球所用
