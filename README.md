# 标签编辑器 - Label Printer Editor

基于 POS 标签打印机的 Web 编辑器，类似 PosPal 的标签管理系统。

## 快速开始

### 开发环境

```bash
# 后端（backend 目录）
npm install
npm run dev

# 前端（frontend 目录）
npm install
npm run dev
```

访问 `http://localhost:3003`

### Docker 开发

```bash
docker-compose up -d
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 功能特性

- ✅ 标签模板编辑器
- ✅ 文字、条形码、二维码元素
- ✅ DPI 和尺寸配置
- ✅ 实时预览
- ✅ 模板保存和管理

## API 端点

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/label/templates/:businessId` | 获取所有模板 |
| GET | `/label/template/:id` | 获取单个模板 |
| POST | `/label/template` | 创建模板 |
| PUT | `/label/template/:id` | 更新模板 |
| DELETE | `/label/template/:id` | 删除模板 |

## 集成到主网站

在公司的 Nginx 配置里添加：

```nginx
location /label {
    proxy_pass http://label-backend:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
}
```

## 技术栈

- **后端**: Node.js + Express + PostgreSQL
- **前端**: React + Vite + Antd
- **容器**: Docker + Docker Compose

## 开发路线图

- [ ] 完善元素编辑（位置、大小、旋转）
- [ ] 支持更多条形码格式
- [ ] 导入/导出模板
- [ ] 模板分享功能
- [ ] 批量编辑
