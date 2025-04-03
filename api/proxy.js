export default async (req, res) => {
    console.log('收到请求头:', req.headers);
    console.log('原始请求体:', req.body);
  
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      console.log('处理OPTIONS预检请求');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
  
    try {
      console.log('开始处理POST请求');
      
      // 解析请求体
      const body = JSON.parse(req.body);
      console.log('解析后的请求体:', body);
  
      // 验证目标地址格式
      const targetUrl = body.targetUrl;
      console.log('目标地址:', targetUrl);
      
      if (!/^https?:\/\/[^/]+(:[0-9]+)?\/api\//.test(targetUrl)) {
        console.error('非法地址格式:', targetUrl);
        return res.status(400).json({ error: 'API地址格式错误，请使用类似：example.com:8080 的格式' });
      }
  
      // 发起代理请求
      console.log('开始转发请求到:', targetUrl);
      const apiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload),
        timeout: 10000 // 10秒超时
      });
  
      console.log('收到响应状态:', apiResponse.status);
      const data = await apiResponse.json();
      console.log('收到响应数据:', data);
  
      // 返回结果
      res.setHeader('Access-Control-Allow-Origin', 'https://cs.haoqiyun.tk');
      res.status(200).json(data);
  
    } catch (error) {
      console.error('完整错误堆栈:', error.stack || error);
      res.status(500).json({ 
        error: '代理服务异常',
        details: {
          message: error.message,
          type: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  };
  