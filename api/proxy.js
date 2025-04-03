export default async (req, res) => {
    // 处理CORS预检请求
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
  
    try {
      const { targetUrl, payload } = JSON.parse(req.body);
      
      // 验证目标地址格式
      if (!/^https?:\/\/[^\/]+(:[0-9]+)?\/api\//.test(targetUrl)) {
        return res.status(400).json({ error: 'Invalid API address format' });
      }
  
      const apiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      const data = await apiResponse.json();
      
      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', 'https://cs.haoqiyun.tk');
      res.status(200).json(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy server error' });
    }
  };
  