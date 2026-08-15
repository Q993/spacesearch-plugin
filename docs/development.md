# 扩展开发指南

> 本插件定位为**安全插件的基础层**：后续基于 DSH 开发的漏洞挖掘、资产测绘插件，可通过官方服务接口直接复用四引擎能力，无需重复对接各引擎 API、签名与数据归一化。

---

## 1. 复用 `spacesearch` 服务

插件通过 `ctx.provide('spacesearch', api)` 在 Host 注册了服务。你的插件声明 `inject: ['spacesearch']` 后即可调用：

```js
// 你的新插件 Host 半区
return {
  inject: ['spacesearch'],
  apply(ctx) {
    const ss = ctx.spacesearch

    // 查看引擎配置状态（脱敏）
    const status = ss.engines()

    // 统一搜索（返回归一化结果数组）
    const results = await ss.search({
      query: 'app="Apache-Tomcat" && country="CN"',
      engine: 'auto',   // 或 'fofa' / 'fofa,quake'
      page: 1,
      size: 10,
    })

    // 语法速查 / 模板检索
    const syntax = ss.syntax({ engine: 'fofa', keyword: 'shiro' })

    // 配置引擎凭据（供管理界面/AI 使用）
    await ss.configure({ engine: 'fofa', creds: { email: '...', key: '...' } })

    // 测试连接
    const test = await ss.test('fofa')
  },
}
```

### 服务方法签名

| 方法 | 签名 | 返回 |
|---|---|---|
| `engines` | `() => EngineStatus[]` | 引擎配置状态（密钥脱敏） |
| `search` | `({ query, engine?, page?, size? }) => Promise<SearchResult[]>` | 每引擎一个结果对象 |
| `syntax` | `({ engine?, keyword? }) => { engines, templates, note }` | 字段速查 + 模板 |
| `configure` | `({ engine, creds?, base?, enabled? }) => Promise<void>` | 保存配置（持久化） |
| `test` | `(engineId) => Promise<{ ok, message }>` | 连接测试 |

### 归一化结果字段

每个引擎的搜索结果统一为：

```
engine, ip, port, protocol, title, domain, banner, app, version,
os, country, region, city, org, icp, url, time
```

后续插件无需关心各引擎原始响应结构的差异。

---

## 2. 新增引擎适配器

在 Host 半区 `ENGINES` 注册表中追加一项，即可让新引擎获得全套能力（搜索 / 测试 / 语法 / 模板）。

```js
newengine: {
  id: 'newengine', name: '新引擎', site: 'https://example.com',
  desc: '引擎描述',
  auth: [{ key: 'key', label: 'API Key', secret: true }],
  base: 'https://api.example.com',
  fields: [
    ['title', '标题', 'title:"xxx"'],
    // ... 字段速查表（三元组: 字段名 / 含义 / 示例）
  ],
  ops: '运算符说明',
  examples: ['示例语句'],
  buildRequest(conf, { query, page, size }) {
    // 返回 { url, method, headers, body }，由 httpJson 统一发送
    return { url: `${conf.base}/search?q=${encodeURIComponent(query)}`, method: 'GET', headers: {} }
  },
  parse(parsed) {
    // 校验错误 → throw；成功 → 返回 { total, results: [归一化行] }
    return { total: parsed.total, results: parsed.items.map(...) }
  },
  testQuery: 'port:80',            // 测试连接用最小查询（无 testRequest 时）
  // testRequest(conf) / testParse(parsed) 可选：覆盖默认测试（如 FOFA 的账户信息接口）
}
```

注意：引擎 id 加入 `ENGINE_ORDER` 数组即出现在状态列表、工具枚举与 UI 中。

---

## 3. 新增漏洞挖掘模板

向 `TEMPLATES` 数组追加条目，AI 与界面即可检索到：

```js
{ id: 'myapp', name: '某应用', tags: ['app', 'cve'], desc: '说明',
  queries: { fofa: 'app="MyApp"', hunter: 'web.app="MyApp"', quake: 'app:"MyApp"', zoomeye: 'app:"MyApp"' } }
```

- `tags` 用于 `spacesearch_syntax` 关键词匹配；
- `queries` 中不支持的引擎可省略（置空），界面与工具会自动过滤。

---

## 4. 扩展 Client UI

- 设置页注册在 `settings.section`（id `spacesearch`），如需在其它位置增加入口可参考 `tool.view.cordis`（运行卡片状态条）的注册方式。
- 所有 Client → Host 通信走 `harness.handle` / `host.call` 私有 RPC，参数与返回值必须是纯 JSON。

---

## 5. 注意事项

- **沙箱约束**：Host 代码运行在受限沙箱，无 `process`/`Buffer`/`fetch`/`require`；HTTP 请走 `web` 服务或 `subprocess` + `curl`（本插件已封装为 `httpJson`，新引擎直接复用）。
- **生命周期**：所有注册（服务、工具、RPC、Slot）必须挂在插件 Fiber 上（`ctx.effect` / `slots.inject`），停止或更新插件时自动清理。
- **密钥安全**：对外返回的引擎状态必须脱敏；真实凭据只写入工作区 `spacesearch.config.json`。
- **合规**：所有测绘与验证行为仅限已获授权范围。

---

## 6. 常见扩展场景

| 场景 | 做法 |
|---|---|
| 批量资产测绘 | `ss.search({ query, engine: 'auto', size: 100 })` 循环翻页，落盘结果 |
| 指纹 → 漏洞线索 | `ss.syntax({ keyword: 'nacos' })` 取模板，逐引擎执行后聚合去重 |
| 结果导出 | 解析归一化结果写入工作区 CSV/JSON |
| 定时监控 | 用 Cordis `timer` 服务周期性调用 `ss.search`，变化告警 |
