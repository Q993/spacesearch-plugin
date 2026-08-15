/**
 * dsh-spacesearch — Client 半区（浏览器 UI）
 *
 * 用法：把本文件内容作为 cordis_define 的 code.client 提交（或作为插件源码参考）。
 * 纯 JavaScript（无 JSX / TypeScript），代码体求值结果必须是 `{ apply(ctx) { ... } }`。
 *
 * 提供：
 *  1. 设置页（settings.section id=spacesearch，标签"空间引擎"）：引擎配置 / 资产查询 / 语法与模板
 *  2. 运行卡片状态条（tool.view.cordis key=self）：各引擎配置状态一览
 * 所有数据经 host.call RPC 与 Host 半区通信；工作区路径通过 useWorkspaces 标准 props 获取并随 RPC 传递。
 */
const h = React.createElement
const errText = (e) => String((e && e.message) || e)

const CSS_TEXT = `
.ss-root { --ss-bg: #ffffff; --ss-fg: #1f2328; --ss-muted: #6e7781; --ss-border: #d0d7de; --ss-accent: #2563eb; --ss-ok: #16a34a; --ss-err: #dc2626; font-family: inherit; font-size: 13px; color: var(--ss-fg); }
@media (prefers-color-scheme: dark) { .ss-root { --ss-bg: #161b22; --ss-fg: #e6edf3; --ss-muted: #8b949e; --ss-border: #30363d; --ss-accent: #58a6ff; --ss-ok: #3fb950; --ss-err: #f85149; } }
.ss-root * { box-sizing: border-box; }
.ss-strip { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 4px 2px; font-size: 12px; }
.ss-strip-title { font-weight: 600; margin-right: 2px; }
.ss-strip-hint { color: var(--ss-muted, #888); }
.ss-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.ss-tab { padding: 4px 12px; border: 1px solid var(--ss-border, #ddd); border-radius: 6px; cursor: pointer; background: transparent; color: var(--ss-fg, #222); font-size: 13px; }
.ss-tab.active { background: var(--ss-accent, #2563eb); border-color: var(--ss-accent, #2563eb); color: #fff; }
.ss-card { border: 1px solid var(--ss-border, #ddd); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
.ss-card-title { font-weight: 600; margin-bottom: 6px; }
.ss-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.ss-field { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--ss-muted, #666); margin-bottom: 6px; }
.ss-input { padding: 5px 8px; border: 1px solid var(--ss-border, #ddd); border-radius: 6px; background: var(--ss-bg, #fff); color: var(--ss-fg, #222); font-size: 13px; min-width: 140px; }
.ss-num { min-width: 60px; width: 70px; }
.ss-query { width: 100%; min-height: 60px; font-family: ui-monospace, Consolas, monospace; }
.ss-btn { padding: 5px 12px; border: 1px solid var(--ss-border, #ddd); border-radius: 6px; background: var(--ss-bg, #fff); color: var(--ss-fg, #222); cursor: pointer; font-size: 13px; }
.ss-btn:hover { border-color: var(--ss-accent, #2563eb); }
.ss-btn:disabled { opacity: 0.6; cursor: default; }
.ss-primary { background: var(--ss-accent, #2563eb); border-color: var(--ss-accent, #2563eb); color: #fff; }
.ss-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 12px; }
.ss-ok { background: rgba(22, 163, 74, 0.15); color: var(--ss-ok, #16a34a); }
.ss-off { background: rgba(110, 118, 129, 0.15); color: var(--ss-muted, #888); }
.ss-desc { color: var(--ss-muted, #666); font-size: 12px; margin: 4px 0 8px; }
.ss-note, .ss-hint { color: var(--ss-muted, #888); font-size: 12px; }
.ss-msg { color: var(--ss-ok, #16a34a); font-size: 12px; margin-bottom: 8px; }
.ss-err { color: var(--ss-err, #dc2626); font-size: 12px; margin: 4px 0; }
.ss-summary { font-weight: 600; margin: 8px 0 4px; }
.ss-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
.ss-table th, .ss-table td { border-bottom: 1px solid var(--ss-border, #eee); padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-all; }
.ss-table th { color: var(--ss-muted, #666); font-weight: 500; white-space: nowrap; }
.ss-td-title { max-width: 220px; }
.ss-engine-head { font-weight: 600; margin: 10px 0 2px; }
.ss-ops { color: var(--ss-muted, #666); font-size: 12px; margin-top: 6px; }
.ss-mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
.ss-pre { white-space: pre-wrap; word-break: break-all; background: rgba(127, 127, 127, 0.1); padding: 4px 6px; border-radius: 4px; flex: 1; }
.ss-tpl { border: 1px solid var(--ss-border, #eee); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
.ss-tpl-row { margin-bottom: 4px; }
`

function StatusStrip() {
  const [state, setState] = React.useState(null)
  React.useEffect(() => {
    host.call('state').then(setState).catch(() => {})
  }, [])
  if (!state || !state.engines) {
    return h('div', { className: 'ss-strip' }, '空间引擎加载中…')
  }
  const badges = state.engines.map((e) =>
    h('span', { key: e.id, className: 'ss-badge ' + (e.configured ? 'ss-ok' : 'ss-off') },
      e.name + (e.configured ? ' ✓' : ' 未配置')))
  return h('div', { className: 'ss-strip' },
    h('span', { className: 'ss-strip-title' }, '空间引擎'),
    ...badges,
    h('span', { className: 'ss-strip-hint' }, '· 配置入口：设置 → 空间引擎'))
}

function SettingsPage(props) {
  const [tab, setTab] = React.useState('config')
  const [state, setState] = React.useState(null)
  const [drafts, setDrafts] = React.useState({})
  const [busy, setBusy] = React.useState({})
  const [testMsg, setTestMsg] = React.useState({})
  const [globalMsg, setGlobalMsg] = React.useState('')
  const [qEngines, setQEngines] = React.useState('auto')
  const [qQuery, setQQuery] = React.useState('')
  const [qPage, setQPage] = React.useState('1')
  const [qSize, setQSize] = React.useState('10')
  const [qLoading, setQLoading] = React.useState(false)
  const [qResult, setQResult] = React.useState(null)
  const [qError, setQError] = React.useState('')
  const [sEngine, setSEngine] = React.useState('fofa')
  const [sKeyword, setSKeyword] = React.useState('')
  const [sLoading, setSLoading] = React.useState(false)
  const [sData, setSData] = React.useState(null)
  // 当前工作区路径：通过 settings.section 标准 props 提供，随 RPC 传给 Host 用于持久化
  const workspacePath = props && props.useWorkspaces
    ? props.useWorkspaces((s) => {
        const rec = s && s.recentWorkspaceId
        const found = s && s.items ? s.items.find((w) => w.workspaceId === rec) : undefined
        return found ? found.path : ''
      })
    : ''
  const withWs = (payload) => Object.assign({}, payload, { workspace: workspacePath })

  React.useEffect(() => {
    host.call('state', withWs({})).then((s) => {
      setState(s)
      const d = {}
      for (const e of s.engines) d[e.id] = { creds: {}, base: e.base || '', enabled: !!e.enabled }
      setDrafts(d)
    }).catch((e) => setGlobalMsg('加载失败: ' + errText(e)))
  }, [])

  const setDraft = (id, patch) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  const setTest = (id, ok, text) => setTestMsg((prev) => ({ ...prev, [id]: { ok, text } }))

  const save = async (id) => {
    const d = drafts[id] || {}
    setBusy((b) => ({ ...b, [id]: 'save' }))
    try {
      const res = await host.call('saveConfig', withWs({ engine: id, creds: d.creds || {}, base: d.base || '', enabled: !!d.enabled }))
      setState((s) => ({ ...s, engines: res.engines }))
      setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], creds: {} } }))
      setGlobalMsg('✓ ' + id + ' 配置已保存')
    } catch (e) {
      setGlobalMsg('保存失败: ' + errText(e))
    }
    setBusy((b) => ({ ...b, [id]: '' }))
  }

  const test = async (id) => {
    setBusy((b) => ({ ...b, [id]: 'test' }))
    setTest(id, false, '测试中…')
    try {
      const res = await host.call('test', withWs({ engine: id }))
      setTest(id, !!res.ok, res.ok ? ('✓ ' + res.message) : ('✗ ' + res.message))
    } catch (e) {
      setTest(id, false, '✗ ' + errText(e))
    }
    setBusy((b) => ({ ...b, [id]: '' }))
  }

  const run = async () => {
    if (!qQuery.trim()) { setQError('请输入查询语句'); return }
    setQLoading(true)
    setQError('')
    setQResult(null)
    try {
      const res = await host.call('run', withWs({ engines: qEngines, query: qQuery, page: parseInt(qPage, 10) || 1, size: parseInt(qSize, 10) || 10 }))
      setQResult(res)
    } catch (e) {
      setQError('查询失败: ' + errText(e))
    }
    setQLoading(false)
  }

  const loadSyntax = async () => {
    setSLoading(true)
    try {
      const res = await host.call('syntax', withWs({ engine: sEngine, keyword: sKeyword }))
      setSData(res)
    } catch (e) {
      setGlobalMsg('语法查询失败: ' + errText(e))
    }
    setSLoading(false)
  }

  if (!state) {
    return h('div', { className: 'ss-root' }, globalMsg || '加载中…')
  }

  const tabs = [
    ['config', '引擎配置'],
    ['query', '资产查询'],
    ['syntax', '语法与模板'],
  ]
  const tabBar = h('div', { className: 'ss-tabs' },
    tabs.map(([id, label]) =>
      h('button', { key: id, className: 'ss-tab' + (tab === id ? ' active' : ''), onClick: () => setTab(id) }, label)))

  const engineCards = state.engines.map((e) => {
    const d = drafts[e.id] || { creds: {}, base: '', enabled: false }
    const flag = busy[e.id]
    const inputs = e.auth.map((a) =>
      h('label', { key: a.key, className: 'ss-field' },
        h('span', null, a.label),
        h('input', {
          className: 'ss-input', type: a.secret ? 'password' : 'text',
          placeholder: a.configured ? '已配置（留空保持不变）' : '未配置',
          value: d.creds[a.key] || '',
          onChange: (ev) => setDraft(e.id, { creds: { ...d.creds, [a.key]: ev.target.value } }),
        })))
    return h('div', { key: e.id, className: 'ss-card' },
      h('div', { className: 'ss-row' },
        h('strong', null, e.name),
        h('span', { className: 'ss-badge ' + (e.configured ? 'ss-ok' : 'ss-off') }, e.configured ? '已配置' : '未配置'),
        h('span', { className: 'ss-badge ' + (d.enabled ? 'ss-ok' : 'ss-off') }, d.enabled ? '启用' : '停用'),
        h('label', { className: 'ss-hint' },
          h('input', { type: 'checkbox', checked: !!d.enabled, onChange: (ev) => setDraft(e.id, { enabled: ev.target.checked }) }),
          ' 启用')),
      h('div', { className: 'ss-desc' }, e.desc),
      ...inputs,
      h('label', { className: 'ss-field' },
        h('span', null, 'API 基地址'),
        h('input', {
          className: 'ss-input', placeholder: '留空使用官方地址 (' + e.site + ')',
          value: d.base || '',
          onChange: (ev) => setDraft(e.id, { base: ev.target.value }),
        })),
      h('div', { className: 'ss-row' },
        h('button', { className: 'ss-btn ss-primary', disabled: !!flag, onClick: () => save(e.id) }, flag === 'save' ? '保存中…' : '保存配置'),
        h('button', { className: 'ss-btn', disabled: !!flag, onClick: () => test(e.id) }, flag === 'test' ? '测试中…' : '测试连接'),
        testMsg[e.id] ? h('span', { className: testMsg[e.id].ok ? 'ss-ok' : 'ss-err' }, testMsg[e.id].text) : null))
  })

  const queryPanel = h('div', { className: 'ss-card' },
    h('div', { className: 'ss-row' },
      h('label', { className: 'ss-field' },
        h('span', null, '目标引擎'),
        h('select', { className: 'ss-input', value: qEngines, onChange: (ev) => setQEngines(ev.target.value) },
          h('option', { value: 'auto' }, '全部已启用引擎'),
          state.engines.map((e) => h('option', { key: e.id, value: e.id }, e.name)))),
      h('label', { className: 'ss-field' },
        h('span', null, '页码'),
        h('input', { className: 'ss-input ss-num', type: 'number', min: 1, value: qPage, onChange: (ev) => setQPage(ev.target.value) })),
      h('label', { className: 'ss-field' },
        h('span', null, '每页条数'),
        h('input', { className: 'ss-input ss-num', type: 'number', min: 1, max: 100, value: qSize, onChange: (ev) => setQSize(ev.target.value) }))),
    h('label', { className: 'ss-field' },
      h('span', null, '查询语句（引擎原生语法，可在“语法与模板”页复制）'),
      h('textarea', { className: 'ss-input ss-query', rows: 3, value: qQuery, onChange: (ev) => setQQuery(ev.target.value), placeholder: '例: app="Apache-Tomcat" && country="CN"' })),
    h('div', { className: 'ss-row' },
      h('button', { className: 'ss-btn ss-primary', disabled: qLoading, onClick: run }, qLoading ? '查询中…' : '执行查询'),
      h('span', { className: 'ss-hint' }, '也可直接让 AI 助手调用 spacesearch 工具')),
    qError ? h('div', { className: 'ss-err' }, qError) : null,
    qResult ? renderResults(qResult) : null)

  const syntaxPanel = h('div', null,
    h('div', { className: 'ss-card' },
      h('div', { className: 'ss-row' },
        h('label', { className: 'ss-field' },
          h('span', null, '引擎'),
          h('select', { className: 'ss-input', value: sEngine, onChange: (ev) => { setSEngine(ev.target.value); setSData(null) } },
            state.engines.map((e) => h('option', { key: e.id, value: e.id }, e.name)))),
        h('label', { className: 'ss-field' },
          h('span', null, '模板关键词'),
          h('input', { className: 'ss-input', placeholder: '如 weblogic / shiro / OA / redis', value: sKeyword, onChange: (ev) => setSKeyword(ev.target.value) })),
        h('button', { className: 'ss-btn ss-primary', disabled: sLoading, onClick: loadSyntax }, sLoading ? '查询中…' : '查询'))),
    sData ? h('div', null,
      h('div', { className: 'ss-card' },
        h('div', { className: 'ss-card-title' }, '字段速查 · ' + (sData.engines[sEngine] ? sData.engines[sEngine].name : sEngine)),
        sData.engines[sEngine] ? h('table', { className: 'ss-table' },
          h('thead', null, h('tr', null, h('th', null, '字段'), h('th', null, '含义'), h('th', null, '示例'))),
          h('tbody', null, sData.engines[sEngine].fields.map((f) =>
            h('tr', { key: f[0] }, h('td', { className: 'ss-mono' }, f[0]), h('td', null, f[1]), h('td', { className: 'ss-mono' }, f[2]))))) : null,
        sData.engines[sEngine] ? h('div', { className: 'ss-ops' }, '运算符: ' + sData.engines[sEngine].ops) : null,
        sData.engines[sEngine] ? h('div', { className: 'ss-ops' }, '示例: ' + sData.engines[sEngine].examples.join(' ｜ ')) : null),
      h('div', { className: 'ss-card' },
        h('div', { className: 'ss-card-title' }, '漏洞挖掘模板（' + sData.templates.length + ' 个）'),
        sData.templates.length === 0 ? h('div', { className: 'ss-hint' }, '无匹配模板，试试其他关键词') :
          sData.templates.map((t) =>
            h('div', { key: t.id, className: 'ss-tpl' },
              h('div', { className: 'ss-row' }, h('strong', null, t.name), h('span', { className: 'ss-hint' }, (t.tags || []).join(' / '))),
              h('div', { className: 'ss-desc' }, t.desc),
              Object.entries(t.queries).filter((entry) => entry[1]).map((entry) => {
                const eid = entry[0]
                const q = entry[1]
                const ename = sData.engines[eid] ? sData.engines[eid].name : eid
                return h('div', { key: eid, className: 'ss-row ss-tpl-row' },
                  h('span', { className: 'ss-badge ss-ok' }, ename),
                  h('code', { className: 'ss-mono ss-pre' }, q),
                  h('button', { className: 'ss-btn', onClick: () => { setTab('query'); setQEngines(eid); setQQuery(q) } }, '带入'))
              }))),
        h('div', { className: 'ss-note' }, sData.note))
    ) : null)

  const body = tab === 'config'
    ? h('div', null,
        globalMsg ? h('div', { className: 'ss-msg' }, globalMsg) : null,
        h('div', { className: 'ss-note' }, (state && state.note) || ''),
        engineCards)
    : tab === 'query' ? queryPanel : syntaxPanel

  return h('div', { className: 'ss-root' }, tabBar, body)
}

function renderResults(res) {
  return h('div', null,
    h('div', { className: 'ss-summary' }, res.summary),
    res.engines.map((r) => {
      if (!r.ok) {
        return h('div', { key: r.engine, className: 'ss-err' }, r.name + ': ' + r.reason)
      }
      const head = h('div', { className: 'ss-engine-head' }, r.name + ' · 共 ' + r.total + ' 条（第 ' + r.page + ' 页 / ' + r.size + ' 条/页）')
      if (!r.results || r.results.length === 0) {
        return h('div', { key: r.engine }, head, h('div', { className: 'ss-hint' }, '无结果'))
      }
      const cols = ['IP', '端口', '协议', '标题', '域名', '指纹/服务', '组织', '归属']
      return h('div', { key: r.engine },
        head,
        h('table', { className: 'ss-table' },
          h('thead', null, h('tr', null, cols.map((c) => h('th', { key: c }, c)))),
          h('tbody', null, r.results.map((row, i) =>
            h('tr', { key: i },
              h('td', { className: 'ss-mono' }, row.ip || '—'),
              h('td', null, row.port || '—'),
              h('td', null, row.protocol || '—'),
              h('td', { className: 'ss-td-title' }, row.title || '—'),
              h('td', null, row.domain || '—'),
              h('td', null, (row.app || row.banner || '').slice(0, 60) || '—'),
              h('td', null, row.org || '—'),
              h('td', null, [row.country, row.region, row.city].filter(Boolean).join('/') || '—'))))))
    }))
}

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    styles.insert(CSS_TEXT)
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'spacesearch', order: 30, label: () => '空间引擎' },
      (props) => React.createElement(SettingsPage, { useWorkspaces: props.useWorkspaces }),
    ))
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      () => React.createElement(StatusStrip, null),
    ))
  },
}
