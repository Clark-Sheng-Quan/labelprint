# 建立独立模块指南

本文档描述如何创建类似 `miketea-machine` 和 `labelprint` 的独立功能模块，便于集成到公司主网站。

## 项目结构

```
your-module/
├── backend/
│   ├── src/
│   │   ├── index.js                 # 应用入口
│   │   ├── config/database.js       # 数据库配置
│   │   ├── models/                  # 数据模型
│   │   │   └── YourModel.js
│   │   ├── routes/                  # API 路由
│   │   │   └── yourRoutes.js
│   │   └── services/                # 业务逻辑
│   ├── package.json
│   ├── .env                         # 开发环境配置
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx           # 主布局（包含左侧边栏、Tab 导航）
│   │   ├── pages/
│   │   │   ├── Page1.jsx            # Tab 1 内容
│   │   │   └── Page2.jsx            # Tab 2 内容
│   │   ├── services/api.js          # API 客户端
│   │   ├── config/constants.js      # 常量配置
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── README.md
└── .gitignore
```

## 后端要求

### package.json
```json
{
  "name": "your-module-backend",
  "version": "1.0.0",
  "description": "Your Module Backend",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-promise": "^11.5.4",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "uuid": "^9.0.1",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### .env（开发环境）
```bash
NODE_ENV=development
PORT=3000  # 或其他端口，需避免与其他模块冲突

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_module_db
DB_USER=postgres
DB_PASSWORD=postgres123

# Optional: External API
API_BASE_URL=https://dev.vend88.com

# Logging
LOG_DIR=./logs
LOG_LEVEL=info
```

### src/index.js（基础模板）
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './config/database.js';
import { YourModel } from './models/YourModel.js';
import yourRoutes from './routes/yourRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup CORS
function setupCORS() {
  const corsOptions = {
    origin: function(origin, callback) {
      const allowedOrigins = [
        'https://www.vend88.com.au',
        'https://dev.vend88.com',
        'http://localhost:3001',
        'http://localhost:3003'  // 前端开发端口
      ];

      if (NODE_ENV === 'development') {
        return callback(null, true);
      }

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
}

setupCORS();
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/your_module', yourRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database
async function startServer() {
  try {
    await initializeDatabase();
    await YourModel.initializeTable();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
export default app;
```

### Dockerfile（后端）
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### docker-compose.yml（后端目录）
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: your_module_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: 5432
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - ./src:/app/src
    command: npm run dev

volumes:
  postgres_data:
    driver: local
```

## 前端要求

### package.json
```json
{
  "name": "your-module-frontend",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "antd": "^5.11.5",
    "@ant-design/icons": "^5.2.6",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,  // 注意：避免与其他模块端口冲突
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/your_module': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### .env.development
```
VITE_API_BASE_URL=http://localhost:3000
```

### .env.production
```
VITE_API_BASE_URL=https://dev.vend88.com
```

### src/services/api.js
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const yourAPI = {
  getData: (businessId) => client.get(`/your_module/data/${businessId}`),
  createData: (data) => client.post('/your_module/data', data),
  updateData: (id, data) => client.put(`/your_module/data/${id}`, data),
  deleteData: (id) => client.delete(`/your_module/data/${id}`)
};

export default client;
```

### src/components/Layout.jsx
主布局组件，包含：
- 左侧边栏（用户信息、退出登录）
- 顶部 Tab 导航
- Tab 内容区域

参考 `miketea-machine/frontend/src/components/Layout.jsx`

## 数据库（PostgreSQL）

### 初始化脚本（migrations）
```javascript
// migrations/runMigrations.js
import { db } from '../src/config/database.js';

async function migrate() {
  try {
    // 创建表
    await YourModel.initializeTable();
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

## 开发流程

```bash
# 1. 启动后端和数据库
cd your-module/backend
docker-compose up -d

# 2. 启动前端（另一个终端）
cd your-module/frontend
npm install
npm run dev

# 访问
http://localhost:3001
```

## 生产环境集成

### Nginx 配置
在公司主网站的 Nginx 配置中添加：

```nginx
server {
    listen 443 ssl;
    server_name dev.vend88.com;
    
    # 现有路由
    location /api {
        proxy_pass http://your-main-backend;
    }
    
    # 新模块（添加）
    location /your_module {
        proxy_pass http://your-module-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 部署步骤
1. 服务器创建模块目录
2. 上传代码
3. 配置 `.env`（生产数据库信息）
4. 构建并启动 Docker：`docker-compose -f docker-compose.prod.yml up -d`
5. 前端编译：`npm run build`，上传静态文件

## 检查清单

- [ ] 后端 API 路由前缀统一（如 `/your_module`）
- [ ] 后端数据库初始化脚本完成
- [ ] 前端 Layout 组件包含导航 Tab
- [ ] CORS 配置正确
- [ ] 环境变量配置（`.env`, `.env.development`, `.env.production`）
- [ ] Docker 配置（仅后端 + 数据库）
- [ ] 前端独立开发（`npm run dev`）
- [ ] Nginx 集成配置准备好

## 常用命令

```bash
# 开发
docker-compose up -d              # 启动后端数据库
npm run dev                        # 启动前端

# 查看日志
docker-compose logs -f backend
docker-compose logs -f postgres

# 停止
docker-compose down                # 保留数据
docker-compose down -v             # 删除数据

# 重启
docker-compose restart backend
```

## 参考项目

- `miketea-machine/` - 茶机模块（完整示例）
- `labelprint/` - 标签编辑器模块（完整示例）

按照这些步骤和结构创建新模块，确保一致性和可维护性。
