# AIBlockly Docker 部署指南

本指南详细说明如何使用 Docker 部署 AIBlockly 应用。

---

## 📋 目录

- [快速开始](#快速开始)
- [构建选项](#构建选项)
- [部署模式](#部署模式)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存

### 最简单的启动方式

```bash
# 1. 克隆项目
git clone <repository-url>
cd aiblockly

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
open http://localhost:3001
```

---

## 🏗️ 构建选项

### 方式 1: 使用 Docker Compose（推荐）

```bash
# 开发模式（包含测试服务器）
docker-compose --profile development up -d

# 生产模式（包含 Nginx）
docker-compose --profile production up -d

# 仅主应用
docker-compose up -d
```

### 方式 2: 直接使用 Docker

```bash
# 构建镜像
docker build -t aiblockly:latest .

# 运行容器
docker run -d \
  --name aiblockly \
  -p 3001:3001 \
  -e NODE_ENV=production \
  aiblockly:latest
```

### 方式 3: 多阶段构建

```bash
# 构建优化的生产镜像
docker build \
  --target production \
  -t aiblockly:prod \
  .

# 查看镜像大小
docker images | grep aiblockly
```

---

## 🎯 部署模式

### 开发模式

包含测试 MCP 服务器和开发工具。

```bash
docker-compose --profile development up
```

**特点**:
- 包含测试 MCP 服务器
- 热重载（如果配置 volumes）
- 详细日志
- 端口映射到 localhost

### 测试模式

用于运行自动化测试。

```bash
docker-compose --profile test up
```

**特点**:
- 包含测试服务
- 测试数据库
- CI/CD 友好

### 生产模式

优化的生产部署，包含 Nginx 反向代理。

```bash
docker-compose --profile production up -d
```

**特点**:
- Nginx 反向代理
- 静态文件服务
- GZIP 压缩
- 健康检查
- 自动重启

---

## ⚙️ 配置说明

### 环境变量

在项目根目录创建 `.env` 文件：

```env
# API 配置
PORT=3001
NODE_ENV=production

# MCP 配置
MCP_TIMEOUT=10000
MCP_MAX_RETRIES=3

# 日志配置
LOG_LEVEL=info

# CORS 配置
CORS_ORIGIN=http://localhost:3000
```

### Docker Compose 配置

编辑 `docker-compose.yml` 以自定义配置：

```yaml
services:
  aiblockly:
    environment:
      - PORT=3001
      - NODE_ENV=production
      - LOG_LEVEL=debug  # 开发时设置为 debug
    volumes:
      - ./mcp-configs:/app/mcp-configs:ro  # 挂载 MCP 配置
      - ./logs:/app/logs  # 挂载日志目录
```

### Nginx 配置

编辑 `nginx.conf` 以自定义反向代理：

```nginx
# 修改 upstream
upstream api_backend {
    server aiblockly:3001;
    # 添加负载均衡
    server aiblockly-2:3001;
}

# 添加 SSL
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ...
}
```

---

## 📦 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 停止并删除容器、网络、卷
docker-compose down -v
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f aiblockly

# 查看最近 100 行日志
docker-compose logs --tail=100 aiblockly
```

### 进入容器

```bash
# 进入主应用容器
docker-compose exec aiblockly sh

# 进入测试服务器容器
docker-compose exec test-mcp-server sh
```

### 健康检查

```bash
# 检查容器健康状态
docker-compose ps

# 手动触发健康检查
docker exec aiblockly wget --spider http://localhost:3001/api/health
```

### 重新构建

```bash
# 重新构建镜像
docker-compose build

# 强制重新构建（不使用缓存）
docker-compose build --no-cache

# 重新构建并启动
docker-compose up -d --build
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

**症状**: 容器启动后立即退出

**解决方案**:
```bash
# 查看详细日志
docker-compose logs aiblockly

# 检查容器状态
docker-compose ps

# 检查容器配置
docker inspect aiblockly
```

### 问题 2: 端口冲突

**症状**: `Error starting userland proxy: listen tcp 0.0.0.0:3001: bind: address already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -ti:3001

# 停止占用端口的进程
kill -9 $(lsof -ti:3001)

# 或者修改 docker-compose.yml 中的端口映射
ports:
  - "3002:3001"  # 使用不同的主机端口
```

### 问题 3: MCP 连接失败

**症状**: 无法连接到 MCP 服务器

**解决方案**:
```bash
# 1. 检查网络连接
docker network inspect aiblockly-network

# 2. 验证测试服务器运行
docker-compose ps test-mcp-server

# 3. 检查日志
docker-compose logs -f aiblockly | grep MCP

# 4. 手动测试连接
docker-compose exec aiblockly sh -c "nc -zv test-mcp-server 3000"
```

### 问题 4: 内存不足

**症状**: 容器被 OOM killer 终止

**解决方案**:
```yaml
# 在 docker-compose.yml 中添加内存限制
services:
  aiblockly:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### 问题 5: 构建缓慢

**症状**: Docker build 耗时过长

**解决方案**:
```bash
# 使用 BuildKit
export DOCKER_BUILDKIT=1
docker-compose build

# 使用构建缓存
docker-compose build --parallel
```

---

## 📊 性能优化

### 镜像优化

```dockerfile
# 使用 multi-stage build
FROM node:18-alpine AS builder
# ... 构建阶段

FROM node:18-alpine
# 只复制必要文件
COPY --from=builder /app/dist ./dist
```

### 资源限制

```yaml
services:
  aiblockly:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 网络优化

```yaml
networks:
  aiblockly-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1450
```

---

## 🔐 安全最佳实践

### 1. 非 root 用户运行

```dockerfile
# 在 Dockerfile 中添加
RUN addgroup -g 1001 appuser && \
    adduser -D -u 1001 -G appuser appuser

USER appuser
```

### 2. 只读文件系统

```yaml
services:
  aiblockly:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

### 3. 限制 capabilities

```yaml
services:
  aiblockly:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### 4. 安全扫描

```bash
# 使用 Trivy 扫描镜像
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image aiblockly:latest
```

---

## 🚢 生产部署清单

- [ ] 使用环境变量而非硬编码配置
- [ ] 启用健康检查
- [ ] 配置资源限制
- [ ] 设置重启策略
- [ ] 配置日志轮转
- [ ] 使用 secrets 管理敏感信息
- [ ] 启用 HTTPS (使用 Nginx)
- [ ] 配置反向代理
- [ ] 设置监控和告警
- [ ] 定期备份数据卷

---

## 📚 参考资料

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Node.js Docker 最佳实践](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [AIBlockly 项目文档](./README.md)

---

## 🆘 获取帮助

遇到问题？

1. 查看 [故障排查](#故障排查) 部分
2. 检查 [GitHub Issues](https://github.com/your-repo/issues)
3. 查看应用日志: `docker-compose logs -f`

---

**文档版本**: 1.0.0
**最后更新**: 2025-11-16
