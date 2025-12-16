# 快速开始指南

## 🚀 5 分钟快速启动

### 方式 1: Docker (推荐新手)

```bash
# 1. 配置环境变量
cp .env.example .env
vim .env  # 修改必要配置

# 2. 启动服务
make docker-up

# 3. 访问
# 后端: http://localhost:8000
# 前端: http://localhost:3000
```

### 方式 2: 本地开发

```bash
# 1. 配置环境变量
cp .env.example .env
vim .env

# 2. 同步前端环境变量
make sync-env

# 3. 启动后端（终端 1）
make dev-backend

# 4. 启动前端（终端 2）
make dev-frontend
```

## 📋 常用命令

```bash
# 环境变量
make sync-env              # 同步前端环境变量

# 开发服务器
make dev-backend           # 启动后端
make dev-frontend          # 启动前端（自动同步环境变量）

# Docker
make docker-up             # 启动 Docker 栈
make docker-down           # 停止 Docker 栈
make docker-logs           # 查看日志

# 依赖安装
make install               # 安装所有依赖
make install-backend       # 仅安装后端
make install-frontend      # 仅安装前端

# 测试与检查
make test-backend          # 运行后端测试
make lint-backend          # 检查代码风格
make format-backend        # 格式化代码

# 清理
make clean                 # 清理临时文件

# 帮助
make help                  # 显示所有命令
```

## 🔧 环境变量配置

### 必须配置的变量

```bash
# .env 文件

# 1. CORS 配置（前端地址）
CORS_ALLOW_ORIGINS=http://192.168.31.145:3000

# 2. 数据库
POSTGRES_HOST=192.168.31.145
POSTGRES_PASSWORD=your-password

# 3. Redis
REDIS_URL=redis://:your-password@192.168.31.145:36379/0

# 4. 密钥（使用 API 生成）
SECRET_KEY=your-secret-key
```

### 自动推断的变量

脚本会自动从 `CORS_ALLOW_ORIGINS` 推断:

```bash
# 输入
CORS_ALLOW_ORIGINS=http://192.168.31.145:3000

# 自动生成（frontend/.env.local）
NEXT_PUBLIC_API_BASE_URL=http://192.168.31.145:8000
```

## 📚 详细文档

- [完整环境配置](development/environment-setup.md)
- [图片域名配置](frontend/image-hostname-config.md)
- [更新日志](CHANGELOG-env-sync.md)
- [主 README](../README.md)

## ❓ 常见问题

### Q: 图片无法显示?

```bash
# 解决方法
make sync-env
cd frontend && bun run dev
```

### Q: 修改 .env 后没生效?

```bash
# 解决方法
make sync-env
cd frontend && bun run dev
```

### Q: 如何生成 SECRET_KEY?

```bash
# 方法 1: 使用 API
curl -X POST http://localhost:8000/system/secret-key/generate

# 方法 2: 使用 Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🎯 开发工作流

```bash
# 1. 克隆项目
git clone <repo-url>
cd AI-Higress-Gateway

# 2. 配置环境
cp .env.example .env
vim .env

# 3. 同步环境变量
make sync-env

# 4. 安装依赖
make install

# 5. 启动数据库（Docker）
make docker-up

# 6. 启动后端（终端 1）
make dev-backend

# 7. 启动前端（终端 2）
make dev-frontend

# 8. 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:8000
# API 文档（开发环境默认开启；生产环境 APP_ENV=production 默认关闭，可用 ENABLE_API_DOCS=true 临时开启）: http://localhost:8000/docs
```

## 🐛 故障排查

### 后端无法启动

```bash
# 检查数据库连接
docker compose -f docker-compose.develop.yml ps

# 查看日志
docker compose -f docker-compose.develop.yml logs postgres redis

# 重启数据库
make docker-down
make docker-up
```

### 前端无法启动

```bash
# 检查环境变量
cat frontend/.env.local

# 重新同步
make sync-env

# 清理缓存
make clean
cd frontend && bun install
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :8000  # 后端
lsof -i :3000  # 前端
lsof -i :25432 # PostgreSQL
lsof -i :36379 # Redis

# 修改端口（.env 文件）
# 然后重新启动服务
```

## 📞 获取帮助

- 查看详细文档: `docs/development/environment-setup.md`
- 查看所有命令: `make help`
- 提交 Issue: GitHub Issues
- 查看示例: `.env.example`

## 🎉 下一步

- [ ] 配置 OAuth 登录
- [ ] 添加 Provider
- [ ] 配置路由规则
- [ ] 设置积分系统
- [ ] 配置上游代理池

详见完整文档!
