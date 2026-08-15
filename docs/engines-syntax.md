# 引擎字段语法速查

> 四引擎统一接入，查询语句需使用各引擎**原生语法**。以下为插件内置的字段速查表与运算符说明，AI 可通过 `spacesearch_syntax` 工具实时获取。

---

## FOFA

**认证**：邮箱（email）+ API Key

**运算符**：`&&` 与 / `||` 或 / `!` 非；字符串用双引号精确匹配（默认包含匹配）；括号 `()` 分组；支持 IP 网段 `ip="1.2.3.0/24"`。

| 字段 | 含义 | 示例 |
|---|---|---|
| `title` | 页面标题 | `title="管理后台"` |
| `body` | 页面正文内容 | `body="phpstudy"` |
| `header` | HTTP 响应头 | `header="rememberMe=deleteMe"` |
| `banner` | 协议 banner（SSH/RDP 等） | `banner="OpenSSH"` |
| `host` | 域名或 IP:端口 | `host="example.com"` |
| `ip` | IP 地址（支持网段） | `ip="1.2.3.0/24"` |
| `port` | 端口 | `port="443"` |
| `protocol` | 协议 | `protocol="https"` |
| `domain` | 根域名 | `domain="example.com"` |
| `cert` | TLS 证书内容 | `cert="example.com"` |
| `icp` | ICP 备案号 | `icp="京ICP备123456号"` |
| `server` | 服务器软件 | `server="nginx"` |
| `app` | 应用指纹 | `app="Apache-Tomcat"` |
| `version` | 应用版本 | `app="Tomcat" && version="8.5"` |
| `os` | 操作系统 | `os="Linux"` |
| `status_code` | HTTP 状态码 | `status_code="200"` |
| `country` | 国家 | `country="CN"` |
| `region` | 省/州 | `region="Zhejiang"` |
| `city` | 城市 | `city="Hangzhou"` |
| `org` | 组织机构 | `org="China Telecom"` |
| `is_web` | 仅 Web 资产 | `is_web=true` |
| `is_domain` | 仅域名资产 | `is_domain=true` |
| `after` / `before` | 更新时间范围 | `after="2024-01-01"` |

**示例**：`app="Apache-Tomcat" && country="CN"`、`title="后台" && is_web=true`、`protocol="redis" && port="6379"`

---

## 鹰图 Hunter

**认证**：API Key；检索自动携带近 30 天时间范围。

**运算符**：`&&` 与 / `||` 或 / `!` 非；字符串用双引号精确匹配；`web.` 前缀限定 Web 资产字段。

| 字段 | 含义 | 示例 |
|---|---|---|
| `web.title` | Web 页面标题 | `web.title="后台"` |
| `web.body` | Web 页面正文 | `web.body="phpstudy"` |
| `web.header` | Web 响应头 | `web.header="rememberMe=deleteMe"` |
| `web.icon_hash` | favicon 哈希 | `web.icon_hash="1157785173"` |
| `web.app` | Web 应用指纹 | `web.app="Weblogic"` |
| `ip` | IP 地址 | `ip="1.2.3.4"` |
| `port` | 端口 | `port="8080"` |
| `protocol` | 协议 | `protocol="https"` |
| `domain` | 域名 | `domain="example.com"` |
| `cert` | 证书 | `cert="example.com"` |
| `country` | 国家 | `country="CN"` |
| `region` | 省 | `region="浙江"` |
| `city` | 城市 | `city="杭州"` |
| `os` | 操作系统 | `os="Linux"` |
| `status_code` | 状态码 | `status_code="200"` |

**示例**：`web.app="SpringBoot" && country="CN"`、`web.title="后台" && status_code="200"`、`protocol="redis"`

---

## Quake 360

**认证**：API Key（请求头 `X-QuakeToken`，POST JSON）。

**运算符**：`AND`/`OR`/`NOT`（或 `&&` `||` `!`）；`字段:值` 形式，字符串加双引号；支持通配与多值。

| 字段 | 含义 | 示例 |
|---|---|---|
| `title` | HTTP 标题 | `title:"管理后台"` |
| `response` | 响应内容 | `response:"phpstudy"` |
| `header` | 响应头 | `header:"rememberMe=deleteMe"` |
| `ip` | IP 地址 | `ip:"1.2.3.4"` |
| `port` | 端口 | `port:"8080"` |
| `service` | 服务类型 | `service:"http"` |
| `protocol` | 协议 | `protocol:"https"` |
| `hostname` | 主机名/域名 | `hostname:"example.com"` |
| `cert` | 证书 | `cert:"example.com"` |
| `app` | 应用指纹 | `app:"Nginx"` |
| `version` | 版本 | `version:"1.18"` |
| `os` | 操作系统 | `os:"Linux"` |
| `country` | 国家 | `country:"CN"` |
| `province` | 省份 | `province:"Zhejiang"` |
| `city` | 城市 | `city:"Hangzhou"` |
| `org` | 组织机构 | `org:"China Telecom"` |
| `status_code` | HTTP 状态码 | `status_code:"200"` |

**示例**：`app:"Oracle WebLogic Server"`、`title:"后台" AND status_code:"200"`、`service:"redis"`

---

## ZoomEye

**认证**：API Key（请求头 `API-KEY`）。

**语法**：`字段:"值"`；多个条件以空格分隔为 AND；双引号内可含空格。

| 字段 | 含义 | 示例 |
|---|---|---|
| `app` | 应用指纹 | `app:"Nginx"` |
| `title` | 标题 | `title:"后台"` |
| `banner` | Banner 内容 | `banner:"OpenSSH"` |
| `service` | 服务类型 | `service:"http"` |
| `port` | 端口 | `port:"8080"` |
| `ip` | IP 地址 | `ip:"1.2.3.4"` |
| `os` | 操作系统 | `os:"Linux"` |
| `country` | 国家 | `country:"CN"` |
| `city` | 城市 | `city:"Hangzhou"` |
| `org` | 组织 | `org:"China Telecom"` |

**示例**：`app:"Tomcat"`、`service:"redis"`、`title:"login" port:"443"`
