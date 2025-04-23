const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();

// 增强CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  credentials: true
}));

app.options('*', cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// 新增视频流代理中间件
app.get('/proxy/video', async (req, res) => {
  try {
      const { url, token } = req.query;
      const targetUrl = new URL(url);
      
      // 添加token参数
      targetUrl.searchParams.append('apptoken', token);

      const response = await axios({
        method: req.method,
        url: targetUrl.toString(),
        data: params,
        httpsAgent,
        timeout: 5000, // 增加5秒超时
        headers: {
          ...req.headers, // 保留原始请求头
          host: new URL(targetUrl).host, // 显式设置目标Host头
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': req.headers.authorization || ''
        }
      });
      

      response.data.pipe(res);
  } catch (error) {
      console.error('视频代理错误:', error);
      res.status(500).send('视频加载失败');
  }
});

// 代理请求中间件（统一处理错误）
const proxyRequest = async (req, res, targetUrl, params = {}) => {
  try {
    console.log('[PROXY] 请求参数:', {
      query: req.query,
      body: req.body,
      headers: req.headers
    });

    const httpsAgent = new https.Agent({ 
      rejectUnauthorized: false,
      keepAlive: true // 启用keep-alive
    });
    
    const response = await axios({
      method: req.method,
      url: targetUrl.toString(),
      data: params,
      httpsAgent,
      headers: {
        ...req.headers, // 保留原始请求头
        host: new URL(targetUrl).host, // 显式设置目标Host头
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': req.headers.authorization || ''
      }
    });



    res.json(response.data);
  } catch (error) {
    console.error('[PROXY] 代理错误:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    res.status(500).json({
      resCode: '500',
      message: `代理错误: ${error.response?.data?.message || error.message}`,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 视频列表接口（增强搜索功能）
app.get('/api/findVideos', async (req, res) => {
  const { 
    serverUrl,
    token,
    pageNo = 1,
    pageSize = 12,
    searchQuery,
    videoplatform
  } = req.query;

  // 参数验证
  if (!serverUrl || !token) {
    return res.status(400).json({
      resCode: '400',
      message: '缺少必要参数: serverUrl 或 token'
    });
  }

  try {
    const targetUrl = new URL(`${serverUrl}/api/findVideos`);
    
    // 基础参数
    targetUrl.searchParams.append('token', token);
    targetUrl.searchParams.append('pageNo', pageNo);
    targetUrl.searchParams.append('pageSize', pageSize);

    // 搜索参数处理
    if (searchQuery && searchQuery.trim()) {
      console.log(`[SEARCH] 搜索关键词: "${searchQuery}"`);
      
      // 根据后端API要求调整参数名（此处示例使用videoname和videodesc）
      targetUrl.searchParams.append('videoname', searchQuery);
      targetUrl.searchParams.append('videodesc', searchQuery);
      
      // 如果后端支持模糊搜索可添加：
      // targetUrl.searchParams.append('fuzzySearch', 'true');
    }

    // 平台过滤
    if (videoplatform) {
      // 平台名称映射表（根据实际后端需求调整）
      const platformMap = {
        '抖音': '抖音',
        '哔哩': '哔哩',
        'twitter': 'twitter',
        'YouTube': 'YouTube',
        'instagram': 'instagram'
      };
      
      const mappedPlatform = platformMap[videoplatform] || videoplatform;
      targetUrl.searchParams.append('videoplatform', mappedPlatform);
    }

    console.log('[PROXY] 目标URL:', targetUrl.toString());
    await proxyRequest(req, res, targetUrl);

  } catch (error) {
    console.error('[ROUTE] 路由处理错误:', error);
    res.status(500).json({
      resCode: '500',
      message: '服务器内部错误'
    });
  }
});

// 视频提交接口（保持不变）
app.post('/api/processingVideos', async (req, res) => {
  const { serverUrl, token, videoUrl } = req.body;
  
  if (!serverUrl || !token || !videoUrl) {
    return res.status(400).json({
      resCode: '400',
      message: '缺少必要参数'
    });
  }

  const targetUrl = new URL(`${serverUrl}/api/processingVideos`);
  const params = new URLSearchParams({ token, video: videoUrl });

  console.log('[SUBMIT] 提交视频:', videoUrl);
  await proxyRequest(req, res, targetUrl, params.toString());
});

// 播放页路由
app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('调试模式:', process.env.NODE_ENV || 'development');
});
