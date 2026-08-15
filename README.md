# dsh-spacesearch · 空间搜索引擎聚合插件

> 面向 **DeepSeek Harness (DSH)** 的动态 Cordis 插件：聚合 **FOFA / 鹰图 Hunter / Quake 360 / ZoomEye** 四大网络空间测绘引擎，提供统一搜索、API 凭据管理、内置语法与漏洞挖掘模板，以及 **AI 可自动调度**的模型工具。同时以 Host 服务形式暴露，为后续安全插件（漏洞挖掘、资产测绘工作流）提供基础能力。

![license](https://img.shields.io/badge/license-MIT-blue)
![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness%20%2F%20Cordis-brightgreen)
![engines](https://img.shields.io/badge/engines-FOFA%20%7C%20Hunter%20%7C%20Quake%20%7C%20ZoomEye-orange)

---

## 目录

- [功能特性](#功能特性)
- [架构总览](#架构总览)
- [快速开始](#快速开始)
- [引擎与凭据配置](#引擎与凭据配置)
- [AI 自动调度工具](#ai-自动调度工具)
- [使用示例](#使用示例)
- [配置持久化](#配置持久化)
- [目录结构](#目录结构)
- [为后续安全插件提供基础](#为后续安全插件提供基础)
- [安全声明](#安全声明)
- [许可证](#许可证)

---

## 功能特性

| 特性 | 说明 |
|---|---|
| 🧭 多引擎聚合 | FOFA、鹰图 Hunter、Quake 360、ZoomEye 四引擎统一接入，可单引擎或 `auto` 全引擎检索 |
| 🔧 自由配置 | 每个引擎独立配置 API 凭据、自定义接口基地址（支持私有/镜像部署）、启用开关 |
| 📚 内嵌语法 | 内置各引擎字段速查表、运算符说明、示例语句，AI 无需记忆即可构造查询 |
| 🎯 漏洞挖掘模板 | 内置 27 个常用资产/漏洞模板（WebLogic、Shiro、Nacos、各 OA 系统、数据库、中间件等），每模板含四引擎可直接执行的查询语句 |
| 🤖 AI 自动调度 | 注册 3 个模型工具（`spacesearch` / `spacesearch_config` / `spacesearch_syntax`），AI 可自主完成"配置 → 查语法 → 执行测绘"全流程 |
| 🧩 扩展基础 | 以 Host 服务 `spacesearch` 对外提供，后续安全插件 `inject: ['spacesearch']` 即可复用 |
| 💾 配置持久化 | API 凭据持久化到工作区 `spacesearch.config.json`，插件重启自动加载；密钥永不回显 |
| 🖥️ 可视化界面 | 设置面板（设置 → 空间引擎）：引擎配置 / 资产查询 / 语法模板浏览器，模板可一键"带入"查询 |

## 架构总览

```
┌─────────────────────────── 浏览器（Client 半区）───────────────────────────┐
│  设置页 settings.section       运行卡片状态条 tool.view.cordis              │
│  (useWorkspaces 提供工作区路径 ──┐                                           │
└───────────────────────────────┼───────────────────────────────────────────┘
                                 │ host.call RPC (state/saveConfig/test/run/syntax)
┌───────────────────────────────▼───────────────────────────────────────────┐
│                          Host 半区（Node 进程）                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ 引擎注册表    │  │  HTTP 传输层  │  │  配置存储（工作区） │  │  对外服务 API  │ │
│  │ fofa/hunter │  │ web + curl   │  │ spacesearch.     │  │ ctx.provide   │ │
│  │ quake/zoomeye│  │ (POST/Header)│  │ config.json      │  │ 'spacesearch' │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘ │
│         └────────────────┴─────────┬──────────┴───────────────────┘         │
│                                    │                                        │
│  模型工具：spacesearch / spacesearch_config / spacesearch_syntax             │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     ▼
                        FOFA / Hunter / Quake / ZoomEye 官方 API
```

**传输策略**：无头 GET 请求走 `web` 服务；需要自定义 Header 或 POST Body 的请求（Quake 的 `X-QuakeToken`、ZoomEye 的 `API-KEY`）经 `subprocess` + `curl.exe`（Windows 10+ 自带）发起，双通道自动切换。

## 快速开始

> 前置：DeepSeek Harness 环境（动态 Cordis 插件机制）。`src/host.js` 与 `src/client.js` 即插件的两个半区源码，将其内容分别作为 `cordis_define` 的 `code.host` / `code.client` 提交。

```text
1. 在会话中向 AI 提出：创建空间搜索引擎聚合插件（引用本仓库 src 代码）
2. AI 调用 cordis_define 定义插件 → cordis_run 激活（客户端 UI 需批准）
3. 运行卡片上显示四个引擎的状态条
4. 打开 设置 → 空间引擎，填入各引擎 API 凭据 → 保存 → 测试连接
5. 直接向 AI 下达测绘指令，或在界面手动查询
```

### 各引擎凭据获取

| 引擎 | 需要 | 获取入口 |
|---|---|---|
| FOFA | 邮箱 + API Key | https://fofa.info/userInfo |
| 鹰图 Hunter | API Key | https://hunter.qianxin.com （个人中心 → API 配置） |
| Quake 360 | API Key | https://quake.360.net/quake （个人中心 → API 管理） |
| ZoomEye | API Key | https://www.zoomeye.hk （个人中心 → API Key） |

## 引擎与凭据配置

可通过三种方式配置（效果一致，凭据都会持久化）：

**① 设置界面**：设置 → 空间引擎 → 每个引擎卡片填写邮箱/Key、API 基地址（可选）、启用开关 → 保存 → 测试连接。

**② 直接告诉 AI**：例如 `帮我配置 FOFA（邮箱 xxx，key xxx）`，AI 会自动调用 `spacesearch_config` 工具完成。

**③ 手工编辑配置文件**（与界面等价，注意 `.gitignore` 已排除真实配置）：

```jsonc
// spacesearch.config.json（工作区根目录，插件自动加载）
{
  "version": 1,
  "engines": {
    "fofa":    { "enabled": true, "creds": { "email": "...", "key": "..." }, "base": "" },
    "hunter":  { "enabled": true, "creds": { "key": "..." },                "base": "" },
    "quake":   { "enabled": true, "creds": { "key": "..." },                "base": "" },
    "zoomeye": { "enabled": true, "creds": { "key": "..." },                "base": "" }
  }
}
```

`base` 留空使用官方接口地址；可填写自定义/镜像地址（如自建 FOFA 实例）。

## AI 自动调度工具

插件注册以下 3 个模型工具，AI 在对话中可直接调用：

| 工具 | 作用 | 关键参数 |
|---|---|---|
| `spacesearch` | 统一资产搜索，返回归一化数据（IP/端口/协议/标题/指纹/归属） | `query`（引擎原生语法）、`engines`（auto/单引擎/多引擎）、`page`、`size` |
| `spacesearch_config` | 引擎 API 配置管理 | `action`（list/set/test）、`engine`、`creds`、`base`、`enabled` |
| `spacesearch_syntax` | 字段语法速查 + 漏洞挖掘模板检索 | `engine`、`keyword`（如 weblogic / shiro / OA） |

归一化结果字段：`engine, ip, port, protocol, title, domain, banner, app, version, os, country, region, city, org, icp, url, time`。

## 使用示例

```text
# 全引擎检索国内 Tomcat 资产
用 spacesearch 搜 app="Apache-Tomcat" && country="CN"，四个引擎都跑

# 指定引擎
只查 Quake：app:"Nginx" AND country:"CN"

# 用模板挖掘（AI 自动完成 查模板 → 代入 → 执行）
查一下国内暴露的 Nacos 配置中心

# 配置管理
帮我测试一下 FOFA 的 API 是否可用
把 Hunter 停用
```

## 配置持久化

- 凭据保存于**会话工作区**根目录 `spacesearch.config.json`（Host 通过 `agent.session.cwd` 或客户端 `useWorkspaces` 定位工作区，并显式传入 `sandboxPolicy` 保证写回正确位置）。
- 插件重启后自动从该文件加载配置。
- 密钥安全：设置界面使用密码输入框且不回显；`spacesearch_config list` 只返回"已配置/未配置"；Git 仓库通过 `.gitignore` 排除真实配置，仅提供 `spacesearch.config.example.json` 模板。

## 目录结构

```
spacesearch-plugin/
├── README.md                     # 本文件
├── LICENSE                       # MIT
├── package.json                  # 项目元信息
├── .gitignore                    # 排除真实密钥配置等
├── spacesearch.config.example.json  # 配置模板（无真实密钥）
├── src/
│   ├── host.js                   # Host 半区源码（引擎适配器/传输/持久化/服务/工具/RPC）
│   └── client.js                 # Client 半区源码（设置页 UI / 运行卡片状态条）
└── docs/
    ├── engines-syntax.md         # 四引擎字段语法速查表
    ├── vuln-templates.md         # 27 个漏洞挖掘模板（各引擎语法）
    └── development.md            # 基于本插件扩展安全插件的开发指南
```

## 为后续安全插件提供基础

插件通过 `ctx.provide('spacesearch', api)` 暴露 Host 服务，后续安全插件声明 `inject: ['spacesearch']` 即可复用：

| 服务方法 | 说明 |
|---|---|
| `engines()` | 引擎配置状态（脱敏） |
| `search({ query, engine, page, size })` | 统一搜索，返回归一化结果数组 |
| `syntax({ engine, keyword })` | 语法速查与模板检索 |
| `configure({ engine, creds, base, enabled })` | 保存引擎配置 |
| `test(engineId)` | 测试引擎连通性 |

详细的扩展指引见 [docs/development.md](docs/development.md)。

## 安全声明

- 本插件仅用于**已获授权**的资产测绘与安全研究，请遵守当地法律法规与目标资产的使用条款。
- API 凭据仅保存在本机工作区，仅用于调用各测绘引擎官方接口，不经过任何第三方传输。
- 内置模板仅提供检索线索，实际利用与验证请在授权范围内进行。

## 许可证

[MIT](LICENSE)
