const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'build')));

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// SPA를 위한 catch-all 라우트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
}); 