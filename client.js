/**
 * Browser half of dsh-full-throttle.
 *
 * Mounts the fullThrottle Remote contribution and registers the switch in
 * conversation.input.left, the composer toolbar's left control group, right
 * beside the permission and plan chips. The switch reads and flips the Host
 * state; the Host half turns that state into a system-prompt section.
 *
 * The theme compatibility contract: themes (PRTS in particular) restyle every
 * composer-card button with !important declarations, so the ON state is carried
 * by an id-scoped !important rule plus a status dot that is a child element no
 * theme targets. The result stays legible in stock themes and PRTS.
 */
window.__ModuleLoader__.load({
  id: 'dsh-full-throttle',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const PACKAGE = 'dsh-full-throttle'
    const NS = 'full-throttle'
    const SLOT = 'conversation.input.left'
    const ENTRY_ID = 'full-throttle-toggle'
    const BUTTON_ID = 'dsh-full-throttle-toggle'

    const DICTIONARY = {
      zh: {
        label: '火力全开',
        tipOff: '火力全开已关闭，点击开启：系统提示词将要求模型不保留算力、以高标准完成任务',
        tipOn: '火力全开已开启，点击关闭',
        loading: '正在读取火力全开状态…',
      },
      en: {
        label: 'Full Throttle',
        tipOff: 'Full Throttle is off. Click to inject a system-prompt instruction that spends the full budget on a high-standard result',
        tipOn: 'Full Throttle is on; click to turn it off',
        loading: 'Reading Full Throttle state…',
      },
    }

    /**
     * A strict codec placeholder for a direct Remote method. The browser never
     * executes parameter schemas and the Host validates every received field, so
     * this only satisfies the strict-input check that keeps source-mode calls
     * off the Client wire.
     */
    const codec = (name) => ({
      mode: 'strict',
      typeSymbol: PACKAGE + '#' + name,
      create: () => ({}),
    })

    const CONTRIBUTION = {
      package: PACKAGE,
      descriptors: [
        {
          id: PACKAGE + '#fullThrottle/getState',
          service: 'fullThrottle',
          namespace: 'fullThrottle',
          method: 'getState',
          invocation: { kind: 'direct' },
          parameters: [],
          result: codec('fullThrottle/getState:result'),
        },
        {
          id: PACKAGE + '#fullThrottle/toggle',
          service: 'fullThrottle',
          namespace: 'fullThrottle',
          method: 'toggle',
          invocation: { kind: 'direct' },
          parameters: [],
          result: codec('fullThrottle/toggle:result'),
        },
      ],
    }

    const CSS = ".dsh-ft-toggle{display:inline-flex;box-sizing:border-box;align-items:center;gap:6px;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;flex:none;cursor:pointer;transition:color .12s,background-color .12s,box-shadow .12s}.dsh-ft-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-ft-toggle:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dsh-ft-toggle:disabled{opacity:.55;cursor:default}.dsh-ft-icon{display:inline-flex;flex:none}.dsh-ft-icon svg{display:block;width:14px;height:14px}.dsh-ft-label{pointer-events:none}.dsh-ft-dot{box-sizing:border-box;flex:none;width:6px;height:6px;border-radius:50%;border:1px solid currentColor;opacity:.55;transition:background-color .12s,box-shadow .12s,opacity .12s}#dsh-full-throttle-toggle[data-state=on]{color:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;background:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 16%,transparent) !important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 55%,transparent) !important;--prts-control-outline:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;--prts-control-surface:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 20%,var(--prts-panel-raised,transparent)) !important}#dsh-full-throttle-toggle[data-state=on] .dsh-ft-dot{background:currentColor !important;opacity:1;box-shadow:0 0 5px color-mix(in srgb,currentColor 75%,transparent)}#dsh-full-throttle-toggle[data-state=error]{color:var(--dsw-alias-state-error-primary,#e5484d) !important}#dsh-full-throttle-toggle[data-state=error] .dsh-ft-dot{background:currentColor !important;opacity:1}@container (width<=520px){.dsh-ft-label{display:none}}"

    /** Inject this plugin's stylesheet once; class names stay plugin-prefixed. */
    function installStyles() {
      if (typeof document === 'undefined') return
      const tagId = PACKAGE + '/full-throttle.css'
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    const BOLT = h(
      'svg',
      { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
      h('path', { d: 'M8.9 1 3 9.1h3.3L5.6 15l6.3-8.4H8.4L8.9 1Z', fill: 'currentColor' }),
    )

    /** Keep the composer caret in the editor when the switch is clicked. */
    function keepFocus(event) {
      event.preventDefault()
    }

    /** The switch itself: optimistic flip, Host answer as the final truth. */
    function ToggleButton(props) {
      const { t, api } = props
      const [phase, setPhase] = React.useState('loading')
      const [busy, setBusy] = React.useState(false)

      const read = React.useCallback(() => {
        let alive = true
        setPhase('loading')
        let pending
        try {
          pending = Promise.resolve(api().getState())
        } catch (error) {
          pending = Promise.reject(error)
        }
        pending
          .then((remote) => {
            if (!alive) return
            setPhase(remote.ok ? (remote.value.enabled ? 'on' : 'off') : 'error')
          })
          .catch(() => {
            if (alive) setPhase('error')
          })
        return () => {
          alive = false
        }
      }, [api])

      React.useEffect(() => read(), [read])

      const click = () => {
        if (busy) return
        if (phase === 'error') {
          read()
          return
        }
        if (phase === 'loading') return
        const previous = phase
        setBusy(true)
        setPhase(previous === 'on' ? 'off' : 'on')
        let pending
        try {
          pending = Promise.resolve(api().toggle())
        } catch (error) {
          pending = Promise.reject(error)
        }
        pending
          .then((remote) => {
            if (!remote.ok) throw new Error(remote.error && remote.error.message ? remote.error.message : 'toggle failed')
            setPhase(remote.value.enabled ? 'on' : 'off')
          })
          .catch(() => {
            setPhase(previous)
          })
          .then(() => {
            setBusy(false)
          })
      }

      const on = phase === 'on'
      const dataState = phase === 'loading' ? 'off' : phase
      const title = phase === 'loading' ? t('loading') : on ? t('tipOn') : t('tipOff')

      return h(
        'button',
        {
          type: 'button',
          id: BUTTON_ID,
          className: 'dsh-ft-toggle',
          'data-state': dataState,
          role: 'switch',
          'aria-checked': on,
          'aria-label': t('label'),
          title,
          disabled: busy || phase === 'loading',
          onMouseDown: keepFocus,
          onClick: click,
        },
        h('span', { className: 'dsh-ft-icon' }, BOLT),
        h('span', { className: 'dsh-ft-label' }, t('label')),
        h('span', { className: 'dsh-ft-dot', 'aria-hidden': 'true' }),
      )
    }

    async function apply(ctx) {
      installStyles()
      ctx.effect(() => ctx.locale.register(NS, DICTIONARY, 'full-throttle:dictionary'), 'full-throttle.locale')
      await ctx.remote.$mount(CONTRIBUTION)
      const t = ctx.locale.bind(NS)
      const namespaceApi = () => {
        const namespace = ctx.get('remote.fullThrottle')
        if (namespace === undefined) throw new Error('the fullThrottle Remote namespace is not mounted')
        return namespace
      }
      ctx.effect(
        () =>
          ctx.slots.inject(SLOT, () =>
            ctx.slots.register(
              {
                name: SLOT,
                id: ENTRY_ID,
                order: 0,
                locale: NS,
                registrant: PACKAGE,
                inject: () => ({ api: namespaceApi }),
              },
              ToggleButton,
            ),
          ),
        'full-throttle.slot',
      )
    }

    exports.inject = ['slots', 'locale', 'remote']
    exports.apply = apply
    return module.exports
  },
})

