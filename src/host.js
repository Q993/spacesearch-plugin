/**
 * dsh-spacesearch — Host 半区
 *
 * 用法：把本文件内容作为 cordis_define 的 code.host 提交（或作为插件源码参考）。
 * 代码体是一个"函数体"：求值结果必须是 `{ apply(ctx) { ... } }` 形式的插件对象。
 *
 * 能力：
 *  1. 四大空间测绘引擎适配器（FOFA / 鹰图 Hunter / Quake / ZoomEye）
 *  2. HTTP 传输层：无头 GET 走 web 服务，其余（POST / 带 Header）走 subprocess + curl
 *  3. 配置持久化：会话工作区 spacesearch.config.json（显式传入 sandboxPolicy）
 *  4. 对外服务 `spacesearch`（供后续安全插件 inject 复用）
 *  5. Client RPC（state / saveConfig / test / run / syntax）
 *  6. AI 可调度工具（spacesearch / spacesearch_config / spacesearch_syntax）
 */
return {
  async apply(ctx) {
    // ============ 基础工具函数 ============
    const pad2 = (n) => String(n).padStart(2, '0')
    const fmtTime = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    const str = (v) => (v === undefined || v === null ? '' : String(v))
    const clampInt = (v, min, max) => {
      const n = parseInt(v, 10)
      if (!Number.isFinite(n)) return min
      return Math.min(max, Math.max(min, n))
    }
    const buildQs = (params) => Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    const appOf = (component) => {
      if (Array.isArray(component)) return component.map((c) => {
        const base = str(c && c.name ? c.name : c)
        const ver = c && c.version ? ' ' + str(c.version) : ''
        return base + ver
      }).filter(Boolean).join(', ')
      return str(component)
    }
    const joinPath = (root, name) => (root.endsWith('/') || root.endsWith('\\') ? root + name : root + '/' + name)

    // ============ 引擎注册表 ============
    const ENGINE_ORDER = ['fofa', 'hunter', 'quake', 'zoomeye']
    const ENGINES = {
      fofa: {
        id: 'fofa', name: 'FOFA', site: 'https://fofa.info',
        desc: 'FOFA 网络空间测绘（华顺信安），全球资产测绘与漏洞线索检索，字段丰富。',
        auth: [
          { key: 'email', label: '邮箱 (email)', secret: false },
          { key: 'key', label: 'API Key', secret: true },
        ],
        base: 'https://fofa.info',
        fields: [
          ['title', '页面标题', 'title="管理后台"'],
          ['body', '页面正文内容', 'body="phpstudy"'],
          ['header', 'HTTP 响应头', 'header="rememberMe=deleteMe"'],
          ['banner', '协议 banner（SSH/RDP 等）', 'banner="OpenSSH"'],
          ['host', '域名或 IP:端口', 'host="example.com"'],
          ['ip', 'IP 地址（支持网段）', 'ip="1.2.3.0/24"'],
          ['port', '端口', 'port="443"'],
          ['protocol', '协议', 'protocol="https"'],
          ['domain', '根域名', 'domain="example.com"'],
          ['cert', 'TLS 证书内容', 'cert="example.com"'],
          ['icp', 'ICP 备案号', 'icp="京ICP备123456号"'],
          ['server', '服务器软件', 'server="nginx"'],
          ['app', '应用指纹', 'app="Apache-Tomcat"'],
          ['version', '应用版本', 'app="Tomcat" && version="8.5"'],
          ['os', '操作系统', 'os="Linux"'],
          ['status_code', 'HTTP 状态码', 'status_code="200"'],
          ['country', '国家', 'country="CN"'],
          ['region', '省/州', 'region="Zhejiang"'],
          ['city', '城市', 'city="Hangzhou"'],
          ['org', '组织机构', 'org="China Telecom"'],
          ['is_web', '仅 Web 资产', 'is_web=true'],
          ['is_domain', '仅域名资产', 'is_domain=true'],
          ['after', '更新时间之后', 'after="2024-01-01"'],
          ['before', '更新时间之前', 'before="2025-01-01"'],
        ],
        ops: '逻辑: && 与 / || 或 / ! 非；字符串用双引号精确匹配，默认包含匹配；括号 () 分组；支持 ip 网段、域名字段等。',
        examples: ['app="Apache-Tomcat" && country="CN"', 'title="后台" && is_web=true', 'protocol="redis" && port="6379"'],
        buildRequest(conf, { query, page, size }) {
          const qs = buildQs({
            email: conf.creds.email, key: conf.creds.key,
            qbase64: btoa(query), size, page, full: false,
            fields: 'host,ip,port,protocol,title,domain,server,banner,cert,icp,country,region,city,org,os,app,version,lastupdatetime',
          })
          return { url: `${conf.base}/api/v1/search/all?${qs}`, method: 'GET', headers: {} }
        },
        parse(parsed) {
          if (!parsed || parsed.error) throw new Error(`FOFA 返回错误: ${(parsed && (parsed.errmsg || parsed.message)) || '未知'}`)
          const FIELDS = ['host', 'ip', 'port', 'protocol', 'title', 'domain', 'server', 'banner', 'cert', 'icp', 'country', 'region', 'city', 'org', 'os', 'app', 'version', 'lastupdatetime']
          const rows = Array.isArray(parsed.results) ? parsed.results.map((arr) => {
            const o = {}
            FIELDS.forEach((f, i) => { o[f] = arr && i < arr.length ? str(arr[i]) : '' })
            return o
          }) : []
          return { total: typeof parsed.size === 'number' ? parsed.size : rows.length, results: rows }
        },
        testRequest(conf) {
          return { url: `${conf.base}/api/v1/info/my?${buildQs({ email: conf.creds.email, key: conf.creds.key })}`, method: 'GET', headers: {} }
        },
        testParse(parsed) {
          if (!parsed || parsed.error) throw new Error((parsed && (parsed.errmsg || parsed.message)) || 'FOFA 认证失败')
          return `认证成功，账号 ${parsed.email || '未知'}，F币 ${parsed.fcoin != null ? parsed.fcoin : '未知'}`
        },
      },
      hunter: {
        id: 'hunter', name: '鹰图 Hunter', site: 'https://hunter.qianxin.com',
        desc: '奇安信鹰图网络资产测绘，国内资产覆盖广，适合 Web 资产与指纹检索。',
        auth: [{ key: 'key', label: 'API Key', secret: true }],
        base: 'https://hunter.qianxin.com',
        fields: [
          ['web.title', 'Web 页面标题', 'web.title="后台"'],
          ['web.body', 'Web 页面正文', 'web.body="phpstudy"'],
          ['web.header', 'Web 响应头', 'web.header="rememberMe=deleteMe"'],
          ['web.icon_hash', 'favicon 哈希', 'web.icon_hash="1157785173"'],
          ['web.app', 'Web 应用指纹', 'web.app="Weblogic"'],
          ['ip', 'IP 地址', 'ip="1.2.3.4"'],
          ['port', '端口', 'port="8080"'],
          ['protocol', '协议', 'protocol="https"'],
          ['domain', '域名', 'domain="example.com"'],
          ['cert', '证书', 'cert="example.com"'],
          ['country', '国家', 'country="CN"'],
          ['region', '省', 'region="浙江"'],
          ['city', '城市', 'city="杭州"'],
          ['os', '操作系统', 'os="Linux"'],
          ['status_code', 'HTTP 状态码', 'status_code="200"'],
        ],
        ops: '逻辑: && 与 / || 或 / ! 非；字符串用双引号精确匹配；web. 前缀限定 Web 资产字段；检索自动取近 30 天时间范围。',
        examples: ['web.app="SpringBoot" && country="CN"', 'web.title="后台" && status_code="200"', 'protocol="redis"'],
        buildRequest(conf, { query, page, size }) {
          const now = new Date()
          const start = new Date(now.getTime() - 30 * 86400000)
          const qs = buildQs({
            'api-key': conf.creds.key,
            search: query,
            page,
            page_size: size,
            is_web: 3,
            start_time: fmtTime(start),
            end_time: fmtTime(now),
            port_filter: false,
          })
          return { url: `${conf.base}/openApi/search?${qs}`, method: 'GET', headers: {} }
        },
        parse(parsed) {
          if (!parsed || parsed.code !== 200) throw new Error(`鹰图返回错误: ${(parsed && (parsed.message || parsed.msg)) || '未知'} (code=${parsed && parsed.code})`)
          const arr = parsed.data && Array.isArray(parsed.data.arr) ? parsed.data.arr : []
          const rows = arr.map((r) => ({
            ip: str(r.ip), port: str(r.port), protocol: str(r.protocol), title: str(r.web_title),
            domain: str(r.domain), banner: '', app: appOf(r.component), version: '',
            os: str(r.os), country: str(r.country), region: str(r.province || r.region), city: str(r.city),
            org: str(r.company), icp: '', url: str(r.url), time: str(r.verify_time || r.updated_at),
          }))
          return { total: parsed.data && typeof parsed.data.total === 'number' ? parsed.data.total : rows.length, results: rows }
        },
        testQuery: 'port="80"',
      },
      quake: {
        id: 'quake', name: 'Quake 360', site: 'https://quake.360.net',
        desc: '360 Quake 网络空间测绘，资产与指纹数据丰富，语法精细。',
        auth: [{ key: 'key', label: 'API Key', secret: true }],
        base: 'https://quake.360.net',
        fields: [
          ['title', 'HTTP 标题', 'title:"管理后台"'],
          ['response', '响应内容', 'response:"phpstudy"'],
          ['header', '响应头', 'header:"rememberMe=deleteMe"'],
          ['ip', 'IP 地址', 'ip:"1.2.3.4"'],
          ['port', '端口', 'port:"8080"'],
          ['service', '服务类型', 'service:"http"'],
          ['protocol', '协议', 'protocol:"https"'],
          ['hostname', '主机名/域名', 'hostname:"example.com"'],
          ['cert', '证书', 'cert:"example.com"'],
          ['app', '应用指纹', 'app:"Nginx"'],
          ['version', '版本', 'version:"1.18"'],
          ['os', '操作系统', 'os:"Linux"'],
          ['country', '国家', 'country:"CN"'],
          ['province', '省份', 'province:"Zhejiang"'],
          ['city', '城市', 'city:"Hangzhou"'],
          ['org', '组织机构', 'org:"China Telecom"'],
          ['status_code', 'HTTP 状态码', 'status_code:"200"'],
        ],
        ops: '逻辑: AND/OR/NOT（或 && || !）；字段:值 形式，字符串加双引号；支持通配与多值。',
        examples: ['app:"Oracle WebLogic Server"', 'title:"后台" AND status_code:"200"', 'service:"redis"'],
        buildRequest(conf, { query, page, size }) {
          const body = JSON.stringify({ query, start: (page - 1) * size, size, ignore_cache: false, latest: true })
          return { url: `${conf.base}/api/v3/search/quake_service`, method: 'POST', headers: { 'X-QuakeToken': conf.creds.key, 'Content-Type': 'application/json' }, body }
        },
        parse(parsed) {
          if (!parsed || parsed.code !== 0) throw new Error(`Quake 返回错误: ${(parsed && (parsed.message || parsed.error)) || '未知'} (code=${parsed && parsed.code})`)
          const items = parsed.data && Array.isArray(parsed.data.items) ? parsed.data.items : []
          const rows = items.map((r) => {
            const svc = r.service || {}
            const http = svc.http || {}
            return {
              ip: str(r.ip), port: str(r.port), protocol: str(r.protocol),
              title: str(http.title || http.response_title),
              domain: str(r.hostname), banner: str(http.response),
              app: str(r.app_name), version: str(r.version), os: str(r.os_name),
              country: str(r.country), region: str(r.province), city: str(r.city),
              org: str(r.org), icp: '', url: http.host ? 'http://' + http.host + (http.path || '') : '', time: str(r.time),
            }
          })
          return { total: parsed.data && typeof parsed.data.total === 'number' ? parsed.data.total : rows.length, results: rows }
        },
        testQuery: 'port:80',
      },
      zoomeye: {
        id: 'zoomeye', name: 'ZoomEye', site: 'https://www.zoomeye.hk',
        desc: '知道创宇 ZoomEye 网络空间测绘，服务与设备指纹数据。',
        auth: [{ key: 'key', label: 'API Key', secret: true }],
        base: 'https://api.zoomeye.hk',
        fields: [
          ['app', '应用指纹', 'app:"Nginx"'],
          ['title', '标题', 'title:"后台"'],
          ['banner', 'Banner 内容', 'banner:"OpenSSH"'],
          ['service', '服务类型', 'service:"http"'],
          ['port', '端口', 'port:"8080"'],
          ['ip', 'IP 地址', 'ip:"1.2.3.4"'],
          ['os', '操作系统', 'os:"Linux"'],
          ['country', '国家', 'country:"CN"'],
          ['city', '城市', 'city:"Hangzhou"'],
          ['org', '组织', 'org:"China Telecom"'],
        ],
        ops: '语法: 字段:"值"；多个条件以空格分隔为 AND；双引号内可含空格。',
        examples: ['app:"Tomcat"', 'service:"redis"', 'title:"login" port:"443"'],
        buildRequest(conf, { query, page, size }) {
          const qs = buildQs({ query, page, pagesize: size })
          return { url: `${conf.base}/host/search?${qs}`, method: 'GET', headers: { 'API-KEY': conf.creds.key } }
        },
        parse(parsed) {
          if (!parsed || typeof parsed.total !== 'number') throw new Error(`ZoomEye 返回错误: ${(parsed && (parsed.error || parsed.message)) || '响应格式异常'}`)
          const matches = Array.isArray(parsed.matches) ? parsed.matches : []
          const cn = (o) => {
            const v = o && o.names
            if (!v) return ''
            return str(v['zh-CN'] || v['en'] || Object.values(v)[0])
          }
          const rows = matches.map((r) => {
            const pi = r.portinfo || {}
            const gi = r.geoinfo || {}
            return {
              ip: str(r.ip), port: str(pi.port), protocol: str(pi.service), title: str(pi.title),
              domain: str(r.domain), banner: str(pi.banner), app: str(pi.app), version: str(pi.version),
              os: str(pi.os), country: cn(gi.country), region: '', city: cn(gi.city),
              org: str(gi.org), icp: '', url: '', time: str(r.timestamp),
            }
          })
          return { total: parsed.total, results: rows }
        },
        testQuery: 'port:80',
      },
    }

    // ============ 漏洞挖掘模板库（含各引擎语法） ============
    const TEMPLATES = [
      { id: 'weblogic', name: 'WebLogic 中间件', tags: ['java', 'weblogic', 'cve'], desc: 'Oracle WebLogic，历史反序列化/未授权等高危漏洞', queries: { fofa: 'app="WebLogic-Server"', hunter: 'web.app="WebLogic"', quake: 'app:"Oracle WebLogic Server"', zoomeye: 'app:"WebLogic"' } },
      { id: 'struts2', name: 'Struts2 框架', tags: ['java', 'struts2', 'rce'], desc: 'Apache Struts2，S2 系列 RCE 漏洞多发', queries: { fofa: 'app="Struts2"', hunter: 'web.app="Struts2"', quake: 'app:"Apache Struts"', zoomeye: 'app:"Struts"' } },
      { id: 'tomcat', name: 'Tomcat', tags: ['java', 'tomcat'], desc: 'Apache Tomcat，弱口令/后台部署与历史 CVE', queries: { fofa: 'app="Apache-Tomcat"', hunter: 'web.app="Apache Tomcat"', quake: 'app:"Apache Tomcat"', zoomeye: 'app:"Tomcat"' } },
      { id: 'springboot', name: 'Spring Boot', tags: ['java', 'spring'], desc: 'Spring Boot 应用，关注 actuator 暴露/信息泄露', queries: { fofa: 'app="SpringBoot"', hunter: 'web.app="SpringBoot"', quake: 'app:"Spring Boot"', zoomeye: 'app:"Spring Boot"' } },
      { id: 'shiro', name: 'Apache Shiro', tags: ['java', 'shiro', 'rememberme'], desc: 'Apache Shiro，rememberMe 反序列化/密钥硬编码', queries: { fofa: 'header="rememberMe=deleteMe"', hunter: 'web.header="rememberMe=deleteMe"', quake: 'response:"rememberMe=deleteMe"', zoomeye: 'banner:"rememberMe=deleteMe"' } },
      { id: 'fastjson', name: 'Fastjson', tags: ['java', 'fastjson', 'rce'], desc: 'Fastjson 反序列化 RCE 漏洞频发', queries: { fofa: 'header="fastjson" || body="fastjson"', hunter: 'web.body="fastjson"', quake: 'response:"fastjson"', zoomeye: 'banner:"fastjson"' } },
      { id: 'thinkphp', name: 'ThinkPHP', tags: ['php', 'thinkphp', 'rce'], desc: 'ThinkPHP 框架，RCE 漏洞历史多', queries: { fofa: 'app="ThinkPHP"', hunter: 'web.app="ThinkPHP"', quake: 'app:"ThinkPHP"', zoomeye: 'app:"ThinkPHP"' } },
      { id: 'phpstudy', name: 'phpStudy 环境', tags: ['php', 'phpstudy'], desc: 'phpStudy 集成环境默认页/探针', queries: { fofa: 'body="phpstudy" || header="phpstudy"', hunter: 'web.body="phpstudy"', quake: 'response:"phpstudy"', zoomeye: 'banner:"phpstudy"' } },
      { id: 'phpmyadmin', name: 'phpMyAdmin', tags: ['php', 'db'], desc: 'phpMyAdmin 数据库管理面板，弱口令与漏洞', queries: { fofa: 'title="phpMyAdmin"', hunter: 'web.title="phpMyAdmin"', quake: 'title:"phpMyAdmin"', zoomeye: 'title:"phpMyAdmin"' } },
      { id: 'nacos', name: 'Nacos', tags: ['java', 'nacos', 'unauth'], desc: 'Nacos 配置中心，未授权访问/密钥泄露', queries: { fofa: 'app="Nacos" && port="8848"', hunter: 'web.app="Nacos"', quake: 'app:"Nacos"', zoomeye: 'app:"Nacos"' } },
      { id: 'jenkins', name: 'Jenkins', tags: ['ci', 'java'], desc: 'Jenkins CI，未授权脚本控制台等', queries: { fofa: 'title="Jenkins"', hunter: 'web.title="Jenkins"', quake: 'title:"Jenkins"', zoomeye: 'title:"Jenkins"' } },
      { id: 'gitlab', name: 'GitLab', tags: ['devops', 'git'], desc: 'GitLab 代码托管，认证绕过/SSRF 历史漏洞', queries: { fofa: 'title="GitLab"', hunter: 'web.app="GitLab"', quake: 'app:"GitLab"', zoomeye: 'app:"GitLab"' } },
      { id: 'grafana', name: 'Grafana', tags: ['monitor', 'dashboard'], desc: 'Grafana 监控面板，文件读取/SSRF 漏洞', queries: { fofa: 'title="Grafana"', hunter: 'web.title="Grafana"', quake: 'title:"Grafana"', zoomeye: 'title:"Grafana"' } },
      { id: 'kibana', name: 'Kibana', tags: ['es', 'monitor'], desc: 'Kibana 可视化面板，历史 RCE 漏洞', queries: { fofa: 'title="Kibana"', hunter: 'web.title="Kibana"', quake: 'title:"Kibana"', zoomeye: 'title:"Kibana"' } },
      { id: 'elasticsearch', name: 'Elasticsearch', tags: ['es', 'search'], desc: 'Elasticsearch 集群，未授权访问高发', queries: { fofa: 'app="Elasticsearch"', hunter: 'web.app="Elasticsearch"', quake: 'app:"Elasticsearch"', zoomeye: 'app:"Elasticsearch"' } },
      { id: 'redis', name: 'Redis 服务', tags: ['redis', 'unauth'], desc: 'Redis 服务，未授权访问/写公钥等', queries: { fofa: 'protocol="redis"', hunter: 'protocol="redis"', quake: 'service:"redis"', zoomeye: 'service:"redis"' } },
      { id: 'mysql', name: 'MySQL 服务', tags: ['db', 'mysql'], desc: 'MySQL 数据库，弱口令爆破面', queries: { fofa: 'protocol="mysql"', hunter: 'protocol="mysql"', quake: 'service:"mysql"', zoomeye: 'service:"mysql"' } },
      { id: 'mssql', name: 'MSSQL 服务', tags: ['db', 'mssql'], desc: 'Microsoft SQL Server，弱口令/xp_cmdshell', queries: { fofa: 'protocol="mssql"', hunter: 'protocol="mssql"', quake: 'service:"mssql"', zoomeye: 'service:"mssql"' } },
      { id: 'docker', name: 'Docker API', tags: ['docker', 'unauth'], desc: 'Docker 远程 API，2375 未授权访问', queries: { fofa: 'protocol="docker" || app="Docker"', hunter: 'protocol="docker"', quake: 'service:"docker"', zoomeye: 'service:"docker"' } },
      { id: 'zabbix', name: 'Zabbix', tags: ['monitor', 'zabbix'], desc: 'Zabbix 监控系统，历史 SQL 注入/RCE', queries: { fofa: 'title="Zabbix"', hunter: 'web.app="Zabbix"', quake: 'app:"Zabbix"', zoomeye: 'app:"Zabbix"' } },
      { id: 'vcenter', name: 'VMware vCenter', tags: ['vmware', 'vcenter'], desc: 'vCenter 管理端，历史 RCE 漏洞多发', queries: { fofa: 'title="vSphere Client" || body="vSphere"', hunter: 'web.title="vSphere"', quake: 'app:"VMware vSphere"', zoomeye: 'app:"vSphere"' } },
      { id: 'exchange', name: 'Microsoft Exchange', tags: ['exchange', 'mail'], desc: 'Exchange 邮件服务器，ProxyLogon 等系列漏洞', queries: { fofa: 'app="Microsoft-Exchange"', hunter: 'web.app="Exchange"', quake: 'app:"Microsoft Exchange"', zoomeye: 'app:"Exchange"' } },
      { id: 'seeyon', name: '致远 OA', tags: ['oa', 'seeyon'], desc: '致远 OA 协同办公，历史 RCE/任意文件上传', queries: { fofa: 'app="致远OA" || body="seeyon"', hunter: 'web.app="致远OA"', quake: 'app:"Seeyon"', zoomeye: 'app:"Seeyon"' } },
      { id: 'tongda', name: '通达 OA', tags: ['oa', 'tongda'], desc: '通达 OA，历史任意文件上传/包含漏洞', queries: { fofa: 'app="通达OA" || title="通达OA"', hunter: 'web.title="通达OA"', quake: 'app:"Tongda"', zoomeye: 'app:"Tongda"' } },
      { id: 'landray', name: '蓝凌 OA', tags: ['oa', 'landray'], desc: '蓝凌 OA，历史 SSRF/RCE 漏洞', queries: { fofa: 'app="Landray" || body="landray"', hunter: 'web.app="蓝凌OA"', quake: 'app:"Landray"', zoomeye: 'app:"Landray"' } },
      { id: 'minio', name: 'MinIO', tags: ['storage', 's3'], desc: 'MinIO 对象存储，信息泄露/SSRF', queries: { fofa: 'title="MinIO"', hunter: 'web.title="MinIO"', quake: 'app:"MinIO"', zoomeye: 'app:"MinIO"' } },
      { id: 'jumpserver', name: 'JumpServer', tags: ['bastion', 'jumpserver'], desc: 'JumpServer 堡垒机，历史未授权访问', queries: { fofa: 'app="JumpServer" || title="JumpServer"', hunter: 'web.app="JumpServer"', quake: 'app:"JumpServer"', zoomeye: 'app:"JumpServer"' } },
    ]

    // ============ 配置存储（会话工作区持久化） ============
    const CONFIG_NAME = 'spacesearch.config.json'
    const cfg = {}
    for (const id of ENGINE_ORDER) cfg[id] = { enabled: true, creds: {}, base: '' }
    // 会话工作区根：优先由工具执行的 agent.session 或客户端 RPC 传入；未知时不落盘（仅内存）。
    let sessionRoot
    const rememberRoot = (root) => {
      if (root && typeof root === 'string' && root.trim()) sessionRoot = root.trim().replace(/[\\/]+$/, '')
    }
    const currentRoot = () => sessionRoot
    const rootOfExec = (exec) => (exec && exec.agent && exec.agent.session && exec.agent.session.header ? exec.agent.session.header.cwd : undefined)
    async function resolveConfigTarget() {
      const fs = ctx.get('fs')
      if (!fs) return undefined
      const root = currentRoot()
      if (!root) return undefined
      return fs.resolve(joinPath(root, CONFIG_NAME))
    }
    async function loadConfig() {
      try {
        const fs = ctx.get('fs')
        if (!fs) return
        const target = await resolveConfigTarget()
        if (!target) return
        const info = await fs.stat(target)
        if (!info) return
        const text = await fs.readText(target)
        const loaded = JSON.parse(text)
        const saved = loaded && loaded.engines
        if (saved && typeof saved === 'object') {
          for (const id of ENGINE_ORDER) {
            const s = saved[id]
            if (s && typeof s === 'object') cfg[id] = { enabled: s.enabled !== false, creds: s.creds || {}, base: s.base || '' }
          }
        }
      } catch (e) {
        console.log('spacesearch: 读取配置文件失败，使用内存配置', String((e && e.message) || e))
      }
    }
    async function persist() {
      try {
        const fs = ctx.get('fs')
        if (!fs) return
        const root = currentRoot()
        if (!root) return
        const target = await fs.resolve(joinPath(root, CONFIG_NAME))
        await fs.writeText(target, JSON.stringify({ version: 1, engines: cfg }, null, 2), undefined, undefined, { mode: 'workspace-write', workspaceRoot: root })
      } catch (e) {
        console.log('spacesearch: 保存配置失败（配置保留在内存中）', String((e && e.message) || e))
      }
    }

    // ============ HTTP 传输层 ============
    async function httpJson(req, signal, timeoutMs) {
      const simple = req.method === 'GET' && Object.keys(req.headers || {}).length === 0
      if (simple) {
        const web = ctx.get('web')
        if (web !== undefined) {
          try {
            const res = await web.fetch({ url: req.url }, signal)
            if (res.statusCode >= 400) throw new Error('HTTP ' + res.statusCode)
            return res.body.content
          } catch (e) { /* 落到 curl */ }
        }
      }
      const sub = ctx.get('subprocess')
      if (sub === undefined) throw new Error('当前环境缺少 subprocess/curl 传输，无法发起该请求（web 仅支持无头 GET）')
      const secs = String(Math.ceil((timeoutMs || 20000) / 1000))
      const argv = ['curl.exe', '-sS', '-m', secs, '-L', '-X', req.method || 'GET']
      for (const entry of Object.entries(req.headers || {})) argv.push('-H', entry[0] + ': ' + entry[1])
      if (req.body !== undefined && req.body !== null) argv.push('--data-raw', req.body)
      argv.push(req.url)
      const handle = sub.spawn({
        argv,
        cwd: currentRoot() || '.',
        stdio: {
          stdin: 'ignore',
          stdout: { collect: { maxBytes: 8 * 1024 * 1024 } },
          stderr: { collect: { maxBytes: 1024 * 1024 } },
        },
        graceMs: 3000,
        signal,
      })
      const outcome = await handle.done
      const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
      const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
      if (outcome.exitCode !== 0) {
        const msg = (err || '').trim() || (out || '').slice(0, 300)
        throw new Error('HTTP ' + (req.method || 'GET') + ' ' + req.url + ' 失败 (exit ' + outcome.exitCode + '): ' + msg.slice(0, 500))
      }
      return out
    }

    // ============ 核心业务 ============
    const confFor = (id) => {
      const c = cfg[id] || {}
      return { enabled: c.enabled !== false, creds: c.creds || {}, base: ((c.base || '').replace(/\/+$/, '')) || ENGINES[id].base }
    }
    const missingAuth = (id) => ENGINES[id].auth.filter((a) => !str(confFor(id).creds[a.key]))
    const resolveEngines = (spec) => {
      const enabled = ENGINE_ORDER.filter((id) => confFor(id).enabled)
      if (!spec || spec === 'auto') return enabled
      const ids = String(spec).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      const known = ids.filter((id) => ENGINES[id])
      return known.length ? known : enabled
    }
    async function searchOne(id, { query, page, size, signal }) {
      const def = ENGINES[id]
      const conf = confFor(id)
      if (!conf.enabled) return { engine: id, name: def.name, ok: false, reason: '引擎未启用' }
      const missing = missingAuth(id)
      if (missing.length) return { engine: id, name: def.name, ok: false, reason: '缺少凭据: ' + missing.map((a) => a.label).join('、') }
      try {
        const req = def.buildRequest(conf, { query: String(query || ''), page, size })
        const text = await httpJson(req, signal, 20000)
        const parsed = JSON.parse(text)
        const out = def.parse(parsed)
        return { engine: id, name: def.name, ok: true, total: out.total, page, size, results: out.results }
      } catch (e) {
        return { engine: id, name: def.name, ok: false, reason: String((e && e.message) || e) }
      }
    }
    async function testOne(id, signal) {
      const def = ENGINES[id]
      if (!def) return { engine: id, name: String(id), ok: false, message: '未知引擎' }
      const conf = confFor(id)
      if (!conf.enabled) return { engine: id, name: def.name, ok: false, message: '引擎未启用' }
      const missing = missingAuth(id)
      if (missing.length) return { engine: id, name: def.name, ok: false, message: '缺少凭据: ' + missing.map((a) => a.label).join('、') }
      try {
        let message
        if (def.testRequest) {
          const text = await httpJson(def.testRequest(conf), signal, 15000)
          message = def.testParse(JSON.parse(text))
        } else {
          const req = def.buildRequest(conf, { query: def.testQuery || 'port:80', page: 1, size: 1 })
          const text = await httpJson(req, signal, 15000)
          const r = def.parse(JSON.parse(text))
          message = '连接成功，命中 ' + r.total + ' 条'
        }
        return { engine: id, name: def.name, ok: true, message }
      } catch (e) {
        return { engine: id, name: def.name, ok: false, message: String((e && e.message) || e) }
      }
    }
    const statusList = () => ENGINE_ORDER.map((id) => {
      const def = ENGINES[id]
      const conf = confFor(id)
      return {
        id, name: def.name, site: def.site, desc: def.desc, enabled: !!conf.enabled,
        base: conf.base, configured: missingAuth(id).length === 0,
        auth: def.auth.map((a) => ({ key: a.key, label: a.label, secret: !!a.secret, configured: !!str(conf.creds[a.key]) })),
      }
    })
    const syntaxData = (opts) => {
      const engine = opts && opts.engine
      const keyword = String((opts && opts.keyword) || '').trim().toLowerCase()
      const ids = engine && engine !== 'auto' ? [String(engine)] : ENGINE_ORDER
      const engines = {}
      for (const id of ids) {
        const def = ENGINES[id]
        engines[id] = { name: def.name, fields: def.fields, ops: def.ops, examples: def.examples }
      }
      let templates = TEMPLATES
      if (keyword) {
        templates = TEMPLATES.filter((t) =>
          t.id.toLowerCase().includes(keyword) ||
          t.name.toLowerCase().includes(keyword) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(keyword)))
      }
      return { engines, templates, note: '所有模板与查询仅限用于已获授权的资产测绘与安全研究。' }
    }
    const saveEngineConfig = async (args) => {
      const id = String((args && args.engine) || '')
      if (!ENGINES[id]) throw new Error('未知引擎: ' + id)
      const conf = cfg[id]
      const creds = (args && args.creds) || {}
      for (const entry of Object.entries(creds)) {
        if (ENGINES[id].auth.some((a) => a.key === entry[0]) && str(entry[1])) conf.creds[entry[0]] = String(entry[1])
      }
      if (args && args.base !== undefined) conf.base = String(args.base || '')
      if (args && args.enabled !== undefined) conf.enabled = !!args.enabled
      await persist()
    }
    const runSearch = async (args, signal) => {
      const query = String((args && args.query) || '').trim()
      if (!query) throw new Error('查询语句不能为空')
      const page = clampInt((args && args.page) || 1, 1, 10000)
      const size = clampInt((args && args.size) || 10, 1, 100)
      const ids = resolveEngines(args && args.engines)
      const out = []
      for (const id of ids) out.push(await searchOne(id, { query, page, size, signal }))
      const summary = out.map((r) => r.name + ': ' + (r.ok ? r.total + ' 条' : r.reason)).join(' | ')
      return { query, page, size, engines: out, summary }
    }

    // ============ 对外基础服务（供后续安全插件复用） ============
    const api = {
      engines: () => statusList(),
      search: async ({ query, engine, page, size, signal }) => {
        const ids = engine && engine !== 'auto' ? [String(engine)] : ENGINE_ORDER.filter((id) => confFor(id).enabled)
        const out = []
        for (const id of ids) out.push(await searchOne(id, { query: String(query || ''), page: clampInt(page || 1, 1, 10000), size: clampInt(size || 10, 1, 100), signal }))
        return out
      },
      syntax: (opts) => syntaxData(opts || {}),
      configure: (args) => saveEngineConfig(args || {}),
      test: (id, signal) => testOne(String(id || ''), signal),
    }
    ctx.effect(() => ctx.provide('spacesearch', api))

    // ============ Client RPC ============
    ctx.effect(() => harness.handle('state', async (args) => {
      rememberRoot(args && args.workspace)
      return {
        engines: statusList(),
        templateCount: TEMPLATES.length,
        root: currentRoot(),
        note: 'API 凭据保存在本机工作区 spacesearch.config.json 中，仅用于调用对应测绘引擎官方接口。',
      }
    }))
    ctx.effect(() => harness.handle('saveConfig', async (args) => {
      rememberRoot(args && args.workspace)
      await saveEngineConfig(args || {})
      return { ok: true, engines: statusList() }
    }))
    ctx.effect(() => harness.handle('test', async (args) => {
      rememberRoot(args && args.workspace)
      return testOne(String((args && args.engine) || ''))
    }))
    ctx.effect(() => harness.handle('run', async (args) => {
      rememberRoot(args && args.workspace)
      return runSearch(args || {})
    }))
    ctx.effect(() => harness.handle('syntax', async (args) => {
      rememberRoot(args && args.workspace)
      return syntaxData(args || {})
    }))

    // ============ AI 可调度工具 ============
    const renderJson = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
    ctx.effect(() => harness.registerTool(ctx, harness.defineTool({
      name: 'spacesearch',
      description: '统一调用网络空间测绘搜索引擎（FOFA / 鹰图 Hunter / Quake / ZoomEye）执行资产搜索，返回归一化资产数据（IP、端口、协议、标题、指纹、归属、国家城市等），是漏洞挖掘资产测绘的基础能力。engines 默认 auto（全部已启用且已配置的引擎），也可指定单个或逗号分隔多个引擎 id。query 需使用对应引擎的原生语法（字段速查与内置漏洞挖掘模板请先用 spacesearch_syntax 获取）。仅限用于已获授权的资产测绘与安全研究。',
      parameters: {
        query: { type: 'string', required: true, description: '引擎原生查询语句，如 fofa: app="Apache-Tomcat"；quake: app:"Nginx"；hunter: web.title="后台"；zoomeye: title:"登录"。不确定语法时先用 spacesearch_syntax 查字段与模板' },
        engines: { type: 'string', description: '目标引擎：auto（全部已启用引擎，默认）| 单个引擎 id（fofa/hunter/quake/zoomeye）| 逗号分隔多个' },
        page: { type: 'integer', description: '页码，默认 1' },
        size: { type: 'integer', description: '每页条数，默认 10，最大 100' },
      },
      output: { schema: { type: 'json' }, render: renderJson },
      async execute(args, exec) {
        try {
          rememberRoot(rootOfExec(exec))
          return await runSearch(args || {}, exec.signal)
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e) }
        }
      },
    })))
    ctx.effect(() => harness.registerTool(ctx, harness.defineTool({
      name: 'spacesearch_config',
      description: '管理空间搜索引擎的 API 配置与连接状态：list 查看各引擎配置状态（不泄露密钥）；set 保存/更新某个引擎的 API 凭据与开关（fofa 需 email+key，hunter/quake/zoomeye 只需 key；creds 只传要设置的字段，未传的保留原值；base 可自定义接口地址）；test 测试指定引擎连通性。凭据持久化到工作区 spacesearch.config.json。',
      parameters: {
        action: { type: 'string', enum: ['list', 'set', 'test'], description: '操作：list（默认，查看状态）/ set（保存配置）/ test（测试连接）' },
        engine: { type: 'string', description: '引擎 id：fofa / hunter / quake / zoomeye（set、test 必填）' },
        creds: { type: 'json', description: 'set 时提供凭据对象，如 fofa: {"email":"you@example.com","key":"xxx"}；hunter/quake/zoomeye: {"key":"xxx"}' },
        base: { type: 'string', description: 'set 时自定义 API 基地址，留空使用官方默认' },
        enabled: { type: 'boolean', description: 'set 时是否启用该引擎' },
      },
      output: { schema: { type: 'json' }, render: renderJson },
      async execute(args, exec) {
        const action = String((args && args.action) || 'list')
        try {
          rememberRoot(rootOfExec(exec))
          if (action === 'list') return { ok: true, engines: statusList() }
          if (action === 'set') {
            await saveEngineConfig(args || {})
            return { ok: true, engine: String((args && args.engine) || ''), message: '已保存', engines: statusList() }
          }
          if (action === 'test') return await testOne(String((args && args.engine) || ''), exec.signal)
          return { ok: false, error: '未知操作: ' + action }
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e) }
        }
      },
    })))
    ctx.effect(() => harness.registerTool(ctx, harness.defineTool({
      name: 'spacesearch_syntax',
      description: '查询网络空间搜索引擎（FOFA / 鹰图 Hunter / Quake / ZoomEye）的字段语法速查表与内置漏洞挖掘模板库。engine 指定引擎时只返回该引擎字段/运算符/示例；keyword 可按关键词匹配模板（如 weblogic、shiro、nacos、tomcat、OA、redis）。模板中每个引擎都有可直接使用的查询语句，可代入 spacesearch 工具执行。',
      parameters: {
        engine: { type: 'string', description: '引擎 id：fofa / hunter / quake / zoomeye，留空返回全部' },
        keyword: { type: 'string', description: '模板匹配关键词，如 "weblogic"、"shiro"、"OA"、"redis"' },
      },
      output: { schema: { type: 'json' }, render: renderJson },
      async execute(args) {
        return syntaxData(args || {})
      },
    })))

    console.log('spacesearch 插件已就绪，引擎:', ENGINE_ORDER.join(', '), '，模板数:', TEMPLATES.length)
  },
}
