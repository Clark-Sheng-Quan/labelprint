#!/bin/bash

# labelprint 后端部署脚本 - 参考 miketea 部署方式

set -e

echo "=========================================="
echo "开始部署 labelprint 后端到 EC2"
echo "=========================================="

# 配置
BACKEND_DIR="/Users/pcm/Desktop/labelprint/backend"
SSH_KEY="/Users/pcm/Desktop/labelprint/Clark.pem"
SSH_USER="ec2-user"
EC2_HOST="54.90.180.79"
EC2_BACKEND_DIR="/home/ec2-user/labelprint/backend"

# 检查文件
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ 后端目录不存在: $BACKEND_DIR"
    exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH 密钥不存在: $SSH_KEY"
    exit 1
fi

echo "✓ 配置检查通过"
echo "  - 后端源目录: $BACKEND_DIR"
echo "  - SSH 密钥: $SSH_KEY"
echo "  - 目标: $SSH_USER@$EC2_HOST:$EC2_BACKEND_DIR"
echo ""

# 设置 SSH 密钥权限
chmod 600 "$SSH_KEY"

# 0. 在 EC2 上创建目录
echo "📁 在 EC2 上创建目录结构..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "mkdir -p $EC2_BACKEND_DIR"

# 1. 上传后端代码（排除 node_modules 和 .git）
echo "📤 上传后端代码到 EC2..."
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='dist' \
    -e "ssh -i $SSH_KEY" \
    "$BACKEND_DIR/" \
    "$SSH_USER@$EC2_HOST:$EC2_BACKEND_DIR/"

echo "✓ 代码上传完成"
echo ""

# 2. 在 EC2 上执行部署命令
echo "🚀 在 EC2 上启动部署..."

ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'DEPLOY_SCRIPT'

set -e

echo "=========================================="
echo "EC2 上的部署步骤"
echo "=========================================="

# 进入后端目录
EC2_BACKEND_DIR="/home/ec2-user/labelprint/backend"
cd "$EC2_BACKEND_DIR"
echo "✓ 进入目录: $(pwd)"

# 停止旧容器
echo "📛 停止旧容器..."
docker stop labelprint-backend-prod labelprint-nginx-prod 2>/dev/null || true
docker rm labelprint-backend-prod labelprint-nginx-prod 2>/dev/null || true

# 构建后端镜像
echo "🔨 构建后端镜像..."
docker build -t labelprint-backend .

# 创建网络
echo "🌐 创建 Docker 网络..."
docker network create labelprint-network 2>/dev/null || true

# 启动后端容器
echo "▶️  启动后端容器..."
docker run -d --name labelprint-backend-prod \
  --network labelprint-network \
  -p 3080:3080 \
  --env-file .env \
  labelprint-backend

# 启动 Nginx 容器
echo "▶️  启动 Nginx 容器..."
docker run -d --name labelprint-nginx-prod \
  --network labelprint-network \
  -p 80:80 \
  -p 443:443 \
  -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$(pwd)/certs:/etc/nginx/certs:ro" \
  nginx:alpine

# 等待容器启动
echo "⏳ 等待容器启动（5秒）..."
sleep 5

# 检查状态
echo ""
echo "=========================================="
echo "容器运行状态:"
echo "=========================================="
docker ps | grep labelprint

echo ""
echo "=========================================="
echo "后端容器日志:"
echo "=========================================="
docker logs --tail=20 labelprint-backend-prod

echo ""
echo "=========================================="
echo "Nginx 容器日志:"
echo "=========================================="
docker logs --tail=10 labelprint-nginx-prod

DEPLOY_SCRIPT

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "验证方式:"
echo "  ✓ 访问健康检查: curl -k https://54.90.180.79/label/health"
echo "  ✓ 检查运行状态: docker ps | grep labelprint"
echo "  ✓ 查看后端日志: docker logs -f labelprint-backend-prod"
echo "  ✓ 查看 nginx 日志: docker logs -f labelprint-nginx-prod"
echo ""
