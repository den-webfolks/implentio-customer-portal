/* Planning kit behaviour — inlined into each file's script block with
   id="kit" by sync-kit.mjs (never write a closing script tag in this file).

   [data-tabs]          container; its [data-tab="x"] buttons show the matching
                        [data-panel="x"] inside the same container (nearest).
   [data-toggle="grp"]  buttons with data-value; sets data-<grp>="value" on the
                        element named by data-target (default: <body>) and
                        aria-pressed on the buttons. CSS/JS react to it.
   window.kit.money(n)  "$1,234.56"
*/
(function () {
  const money = (n) =>
    (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function initTabs(root) {
    root.querySelectorAll('[data-tabs]').forEach((box) => {
      const own = (el) => el.closest('[data-tabs]') === box
      const tabs = [...box.querySelectorAll('[data-tab]')].filter(own)
      const panels = [...box.querySelectorAll('[data-panel]')].filter(own)
      const show = (key) => {
        tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === key)))
        panels.forEach((p) => (p.hidden = p.dataset.panel !== key))
        box.dispatchEvent(new CustomEvent('tabchange', { detail: key }))
      }
      tabs.forEach((t) => {
        t.setAttribute('role', 'tab')
        t.addEventListener('click', () => show(t.dataset.tab))
      })
      const first = tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0]
      if (first) show(first.dataset.tab)
    })
  }

  function initToggles(root) {
    const groups = new Map()
    root.querySelectorAll('[data-toggle]').forEach((b) => {
      const g = b.dataset.toggle
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g).push(b)
    })
    groups.forEach((btns, g) => {
      const set = (v) => {
        btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)))
        const targetSel = btns[0].dataset.target
        const target = targetSel ? document.querySelector(targetSel) : document.body
        if (target) target.dataset[g] = v
        document.dispatchEvent(new CustomEvent('toggle:' + g, { detail: v }))
      }
      btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.value)))
      const first = btns.find((b) => b.getAttribute('aria-pressed') === 'true') ?? btns[0]
      set(first.dataset.value)
    })
  }

  window.kit = { money, initTabs, initToggles }
  document.addEventListener('DOMContentLoaded', () => {
    initTabs(document)
    initToggles(document)
  })
})()
