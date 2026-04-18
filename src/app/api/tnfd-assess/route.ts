import { NextRequest, NextResponse } from 'next/server'

const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || ''
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, model = 'qwen-turbo', max_tokens = 1000 } = body

    if (!QWEN_API_KEY) {
      // Return mock response when no API key
      return NextResponse.json({
        content: `## TNFD 自然相关风险评估（示例）

**行业**: 制造业

### 1. 物理风险

**慢性风险**:
- 水资源压力：该行业依赖淡水资源进行生产冷却，预计面临水资源可用性下降风险
- 气候适应成本：需要投资于气候适应性基础设施

### 2. 转型风险

**政策法规**:
- 生态环境监管趋严，生态保护红线约束增强
- 碳排放核算与报告要求提升

**市场风险**:
- 绿色供应链采购趋势影响原材料供应
- 投资者 ESG 要求提高融资成本

### 3. 潜在机遇

- 生态补偿机制参与
- 绿色信贷与可持续发展挂钩融资
- 碳汇项目开发`,
      })
    }

    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content })
  } catch (error) {
    console.error('TNFD Assessment Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
