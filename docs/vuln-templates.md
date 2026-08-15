# 漏洞挖掘模板库

> 内置 **27 个**常用资产/漏洞检索模板，每个模板给出 FOFA / 鹰图 Hunter / Quake 360 / ZoomEye 四引擎**可直接执行**的查询语句。AI 通过 `spacesearch_syntax` 工具按关键词（如 `weblogic`、`shiro`、`OA`、`redis`）检索后代入 `spacesearch` 执行。
>
> ⚠️ 所有模板仅提供检索线索，仅限用于**已获授权**的资产测绘与安全研究。

## 中间件 / 应用框架

| # | 模板 | 关键词 | 说明 | FOFA | Hunter | Quake | ZoomEye |
|---|---|---|---|---|---|---|---|
| 1 | WebLogic | `weblogic` | 反序列化/未授权等高危漏洞 | `app="WebLogic-Server"` | `web.app="WebLogic"` | `app:"Oracle WebLogic Server"` | `app:"WebLogic"` |
| 2 | Struts2 | `struts2` | S2 系列 RCE | `app="Struts2"` | `web.app="Struts2"` | `app:"Apache Struts"` | `app:"Struts"` |
| 3 | Tomcat | `tomcat` | 弱口令/后台部署与历史 CVE | `app="Apache-Tomcat"` | `web.app="Apache Tomcat"` | `app:"Apache Tomcat"` | `app:"Tomcat"` |
| 4 | Spring Boot | `spring` | actuator 暴露/信息泄露 | `app="SpringBoot"` | `web.app="SpringBoot"` | `app:"Spring Boot"` | `app:"Spring Boot"` |
| 5 | Apache Shiro | `shiro` | rememberMe 反序列化/密钥硬编码 | `header="rememberMe=deleteMe"` | `web.header="rememberMe=deleteMe"` | `response:"rememberMe=deleteMe"` | `banner:"rememberMe=deleteMe"` |
| 6 | Fastjson | `fastjson` | 反序列化 RCE | `header="fastjson" \|\| body="fastjson"` | `web.body="fastjson"` | `response:"fastjson"` | `banner:"fastjson"` |
| 7 | ThinkPHP | `thinkphp` | RCE 漏洞历史多 | `app="ThinkPHP"` | `web.app="ThinkPHP"` | `app:"ThinkPHP"` | `app:"ThinkPHP"` |

## 开发 / 运维组件

| # | 模板 | 关键词 | 说明 | FOFA | Hunter | Quake | ZoomEye |
|---|---|---|---|---|---|---|---|
| 8 | Nacos | `nacos` | 未授权访问/密钥泄露 | `app="Nacos" && port="8848"` | `web.app="Nacos"` | `app:"Nacos"` | `app:"Nacos"` |
| 9 | Jenkins | `jenkins` | 未授权脚本控制台 | `title="Jenkins"` | `web.title="Jenkins"` | `title:"Jenkins"` | `title:"Jenkins"` |
| 10 | GitLab | `gitlab` | 认证绕过/SSRF | `title="GitLab"` | `web.app="GitLab"` | `app:"GitLab"` | `app:"GitLab"` |
| 11 | Grafana | `grafana` | 文件读取/SSRF | `title="Grafana"` | `web.title="Grafana"` | `title:"Grafana"` | `title:"Grafana"` |
| 12 | Kibana | `kibana` | 历史 RCE | `title="Kibana"` | `web.title="Kibana"` | `title:"Kibana"` | `title:"Kibana"` |
| 13 | Elasticsearch | `elasticsearch` | 未授权访问高发 | `app="Elasticsearch"` | `web.app="Elasticsearch"` | `app:"Elasticsearch"` | `app:"Elasticsearch"` |
| 14 | MinIO | `minio` | 信息泄露/SSRF | `title="MinIO"` | `web.title="MinIO"` | `app:"MinIO"` | `app:"MinIO"` |
| 15 | JumpServer | `jumpserver` | 历史未授权访问 | `app="JumpServer" \|\| title="JumpServer"` | `web.app="JumpServer"` | `app:"JumpServer"` | `app:"JumpServer"` |

## 数据库 / 基础服务

| # | 模板 | 关键词 | 说明 | FOFA | Hunter | Quake | ZoomEye |
|---|---|---|---|---|---|---|---|
| 16 | Redis | `redis` | 未授权访问/写公钥 | `protocol="redis"` | `protocol="redis"` | `service:"redis"` | `service:"redis"` |
| 17 | MySQL | `mysql` | 弱口令爆破面 | `protocol="mysql"` | `protocol="mysql"` | `service:"mysql"` | `service:"mysql"` |
| 18 | MSSQL | `mssql` | 弱口令/xp_cmdshell | `protocol="mssql"` | `protocol="mssql"` | `service:"mssql"` | `service:"mssql"` |
| 19 | Docker API | `docker` | 2375 未授权访问 | `protocol="docker" \|\| app="Docker"` | `protocol="docker"` | `service:"docker"` | `service:"docker"` |
| 20 | phpMyAdmin | `phpmyadmin` | 数据库管理面板 | `title="phpMyAdmin"` | `web.title="phpMyAdmin"` | `title:"phpMyAdmin"` | `title:"phpMyAdmin"` |
| 21 | phpStudy | `phpstudy` | 集成环境默认页/探针 | `body="phpstudy" \|\| header="phpstudy"` | `web.body="phpstudy"` | `response:"phpstudy"` | `banner:"phpstudy"` |

## 管理平台 / OA / 邮件

| # | 模板 | 关键词 | 说明 | FOFA | Hunter | Quake | ZoomEye |
|---|---|---|---|---|---|---|---|
| 22 | Zabbix | `zabbix` | SQL 注入/RCE | `title="Zabbix"` | `web.app="Zabbix"` | `app:"Zabbix"` | `app:"Zabbix"` |
| 23 | VMware vCenter | `vcenter` | 历史 RCE 多发 | `title="vSphere Client" \|\| body="vSphere"` | `web.title="vSphere"` | `app:"VMware vSphere"` | `app:"vSphere"` |
| 24 | Exchange | `exchange` | ProxyLogon 等系列漏洞 | `app="Microsoft-Exchange"` | `web.app="Exchange"` | `app:"Microsoft Exchange"` | `app:"Exchange"` |
| 25 | 致远 OA | `seeyon` | RCE/任意文件上传 | `app="致远OA" \|\| body="seeyon"` | `web.app="致远OA"` | `app:"Seeyon"` | `app:"Seeyon"` |
| 26 | 通达 OA | `tongda` | 任意文件上传/包含 | `app="通达OA" \|\| title="通达OA"` | `web.title="通达OA"` | `app:"Tongda"` | `app:"Tongda"` |
| 27 | 蓝凌 OA | `landray` | SSRF/RCE | `app="Landray" \|\| body="landray"` | `web.app="蓝凌OA"` | `app:"Landray"` | `app:"Landray"` |

> 关键词列即 `spacesearch_syntax` 工具 `keyword` 参数可检索的标签，也可使用中文名（如 `OA`、`后台`）匹配模板名称与描述。
