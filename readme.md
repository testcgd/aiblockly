# AIBlockly

这是一个使用 Blockly 来搭建工作流的应用。

## 项目结构

- `doc/` - 文档，包含相关的设计文档
- `ui/` - 前端 UI（React + Blockly）
- `api/` - 后台接口（Node.js + Express）

## 开发环境设置

### 快速开始

1. 安装所有依赖：
```bash
npm run install:all
```

2. 启动开发服务器（同时启动前端和后端）：
```bash
npm run dev
```

前端应用将在 http://localhost:3000 运行
后端 API 将在 http://localhost:3001 运行

### 单独运行

如果需要单独运行前端或后端，可以使用以下命令：

#### 后端设置

1. 进入 api 目录：
```bash
cd api
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

#### 前端设置

1. 进入 ui 目录：
```bash
cd ui
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

## 功能特性

- 基于 Blockly 的可视化编程界面
- 支持逻辑、循环和数学运算块
- 实时代码生成
- RESTful API 后端
- 前后端完全分离架构
- 集成开发环境，一键启动前后端服务
