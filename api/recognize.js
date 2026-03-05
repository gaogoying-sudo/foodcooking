// Vercel Serverless Function - 菜品识别 API 代理
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const prompt = `你是一位专业的菜品识别专家。请分析这张图片中的菜品，并严格按照以下 JSON 格式返回结果：

{
  "dish_name": "菜品名称（中文）",
  "confidence": 0.95,
  "cuisine_type": "菜系（如：川菜/湘菜/粤菜/家常菜等）",
  "cooking_method": "烹饪方式（如：炒/炖/蒸/炸/烤/红烧等）",
  "complexity": "复杂度（简单/中等/复杂）",
  "ingredients": ["主料 1", "主料 2", "辅料 1", "调料 1"],
  "dimensions": {
    "辣度": "低/中/高",
    "咸度": "低/中/高",
    "甜度": "低/中/高",
    "油量": "少/中/多",
    "锅气": "低/中/高",
    "嫩度": "低/中/高"
  },
  "description": "对菜品的详细描述（色泽、质感、摆盘等，50-100 字）"
}

要求：
1. 只返回 JSON，不要有其他文字
2. confidence 是 0-1 之间的数字
3. ingredients 列出能看到的主要食材（至少 3 个）
4. dimensions 根据菜品特征合理评估`;

    const payload = {
      model: 'qwen-vl-plus',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }
      ],
      max_tokens: 1024,
      temperature: 0.3
    };

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY || 'sk-c876ee3e50d64a72a53c8c5f09cc84fb'}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    const content = data.choices[0].message.content;
    res.status(200).json({ success: true, content });

  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
