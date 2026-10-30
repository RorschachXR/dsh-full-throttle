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
    const SETTINGS_SLOT = 'settings.section'
    const SETTINGS_ENTRY_ID = 'full-throttle-subagents-setting'

    const DICTIONARY = {
      zh: {
        label: '火力全开',
        tipOff: '火力全开已关闭，点击开启：系统提示词将要求模型不保留算力、以高标准完成任务',
        tipOn: '火力全开已开启，点击关闭',
        loading: '正在读取火力全开状态…',
        settingsSubagents: '鼓励使用子代理',
        settingsSubagentsHint:
          '开启后，火力全开期间会额外注入一句话：任务足够复杂时鼓励组建智能体团队分工协作，不需要拆分时不必勉强。默认关闭。',
        settingsOn: '已开启时生效',
        settingsOff: '火力全开关闭时不会注入',
        settingsError: '读取设置失败，点击重试',
        settingsStale: '宿主端尚未加载这项改动，重启 DeepSeek Harness 后可用',
      },
      en: {
        label: 'Full Throttle',
        tipOff: 'Full Throttle is off. Click to inject a system-prompt instruction that spends the full budget on a high-standard result',
        tipOn: 'Full Throttle is on; click to turn it off',
        loading: 'Reading Full Throttle state…',
        settingsSubagents: 'Encourage subagents',
        settingsSubagentsHint:
          'While Full Throttle is on, also inject a sentence encouraging an agent team when the task can be split, and saying so is optional otherwise. Off by default.',
        settingsOn: 'applies while Full Throttle is on',
        settingsOff: 'not injected while Full Throttle is off',
        settingsError: 'Could not read the setting — click to retry',
        settingsStale: 'The Host half has not loaded this change yet — restart DeepSeek Harness',
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
        {
          // Deliberately parameterless, exactly like `toggle`: the settings row reads the
          // current state before flipping, and a direct method with a payload adds a strict
          // codec the browser half does not need.
          id: PACKAGE + '#fullThrottle/toggleSubagents',
          service: 'fullThrottle',
          namespace: 'fullThrottle',
          method: 'toggleSubagents',
          invocation: { kind: 'direct' },
          parameters: [],
          result: codec('fullThrottle/toggleSubagents:result'),
        },
      ],
    }

    const CSS = ".dsh-ft-toggle{display:inline-flex;box-sizing:border-box;align-items:center;gap:6px;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;flex:none;cursor:pointer;transition:color .12s,background-color .12s,box-shadow .12s}.dsh-ft-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-ft-toggle:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dsh-ft-toggle:disabled{opacity:.55;cursor:default}.dsh-ft-icon{display:inline-flex;flex:none}.dsh-ft-icon svg{display:block;width:14px;height:14px}.dsh-ft-label{pointer-events:none}.dsh-ft-dot{box-sizing:border-box;flex:none;width:6px;height:6px;border-radius:50%;border:1px solid currentColor;opacity:.55;transition:background-color .12s,box-shadow .12s,opacity .12s}#dsh-full-throttle-toggle[data-state=on]{color:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;background:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 16%,transparent) !important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 55%,transparent) !important;--prts-control-outline:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;--prts-control-surface:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 20%,var(--prts-panel-raised,transparent)) !important}#dsh-full-throttle-toggle[data-state=on] .dsh-ft-dot{background:currentColor !important;opacity:1;box-shadow:0 0 5px color-mix(in srgb,currentColor 75%,transparent)}#dsh-full-throttle-toggle[data-state=error]{color:var(--dsw-alias-state-error-primary,#e5484d) !important}#dsh-full-throttle-toggle[data-state=error] .dsh-ft-dot{background:currentColor !important;opacity:1}@container (width<=520px){.dsh-ft-label{display:none}}"

    const SETTINGS_CSS = '.dsh-ft-setting{display:flex;align-items:flex-start;gap:10px;padding:10px 0}.dsh-ft-setting-main{display:flex;flex-direction:column;gap:4px;min-width:0}.dsh-ft-setting-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary);line-height:20px}.dsh-ft-setting-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}.dsh-ft-setting-state{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}.dsh-ft-switch{box-sizing:border-box;position:relative;flex:none;width:34px;height:18px;margin-top:1px;border-radius:9px;border:1px solid var(--dsw-alias-border-default,currentColor);background:transparent;cursor:pointer;transition:background-color .12s,border-color .12s}.dsh-ft-switch:disabled{opacity:.55;cursor:default}.dsh-ft-switch:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dsh-ft-switch::after{content:\'\';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .12s,background-color .12s}.dsh-ft-switch[aria-checked=true]{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}.dsh-ft-switch[aria-checked=true]::after{transform:translateX(16px);background:#fff}.dsh-ft-error{font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary,#e5484d)}.dsh-ft-retry{border:0;background:transparent;padding:0;font-family:inherit;text-align:left;cursor:pointer;text-decoration:underline}'

    /** Inject this plugin's stylesheet once; class names stay plugin-prefixed. */
    function installStyles() {
      if (typeof document === 'undefined') return
      const tagId = PACKAGE + '/full-throttle.css'
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS + SETTINGS_CSS
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

    /**
     * The settings page entry. A dedicated section rather than a hidden config key: the
     * switch in the composer is a per-session gesture, while "may the model split work into
     * subagents" is a standing preference, so it gets a place where it can be read.
     */
    function SubagentsSetting(props) {
      const { t, api } = props
      // `switchOn` is the Full Throttle switch itself: the note is inert while it is off, and
      // saying so up front is cheaper than letting the user wonder why nothing changed.
      const [state, setState] = React.useState({ phase: 'loading' })
      const [busy, setBusy] = React.useState(false)

      const read = React.useCallback(() => {
        let alive = true
        setState({ phase: 'loading' })
        let pending
        try {
          pending = Promise.resolve(api().getState())
        } catch (error) {
          pending = Promise.reject(error)
        }
        pending
          .then((remote) => {
            if (!alive) return
            if (!remote || !remote.ok) {
              setState({ phase: 'error' })
              return
            }
            const value = remote.value || {}
            setState({ phase: 'ready', subagents: value.subagents === true, enabled: value.enabled === true })
          })
          .catch(() => {
            if (alive) setState({ phase: 'error' })
          })
        return () => {
          alive = false
        }
      }, [api])

      React.useEffect(() => read(), [read])

      const flip = () => {
        if (busy || state.phase !== 'ready') return
        const wanted = !state.subagents
        setBusy(true)
        // Optimistic: the Host's answer replaces it, and a failure puts the old value back.
        setState({ ...state, subagents: wanted })
        let pending
        try {
          pending = Promise.resolve(api().toggleSubagents())
        } catch (error) {
          pending = Promise.reject(error)
        }
        pending
          .then((remote) => {
            if (!remote || !remote.ok) throw new Error('setSubagents failed')
            const value = remote.value || {}
            setState({ phase: 'ready', subagents: value.subagents === true, enabled: value.enabled === true })
          })
          .catch(() => {
            // Surface it: a silent revert looks like the switch "not working". The usual
            // cause is a Host half that predates this method (the browser half reloads on
            // its own, the Host half only on a restart), so say that instead of guessing.
            setState({ phase: 'failed', subagents: !wanted, enabled: state.enabled })
          })
          .then(() => {
            setBusy(false)
          })
      }

      const on = (state.phase === 'ready' || state.phase === 'failed') && state.subagents
      const hint = t('settingsSubagentsHint')
      const stateLine =
        state.phase === 'ready' ? (state.enabled ? t('settingsOn') : t('settingsOff')) : null

      return h(
        'div',
        { className: 'dsh-ft-setting' },
        h(
          'button',
          {
            type: 'button',
            className: 'dsh-ft-switch',
            role: 'switch',
            'aria-checked': on,
            'aria-label': t('settingsSubagents'),
            disabled: busy || state.phase !== 'ready',
            onClick: flip,
          },
          null,
        ),
        h(
          'div',
          { className: 'dsh-ft-setting-main' },
          h('span', { className: 'dsh-ft-setting-label' }, t('settingsSubagents')),
          h('span', { className: 'dsh-ft-setting-hint' }, hint),
          stateLine === null ? null : h('span', { className: 'dsh-ft-setting-state' }, stateLine),
          state.phase === 'error' || state.phase === 'failed'
            ? h(
                'button',
                { type: 'button', className: 'dsh-ft-error dsh-ft-retry', onClick: read },
                t(state.phase === 'error' ? 'settingsError' : 'settingsStale'),
              )
            : null,
        ),
      )
    }

    async function apply(ctx) {
      installStyles()
      ctx.effect(() => ctx.locale.register(NS, DICTIONARY, 'full-throttle:dictionary'), 'full-throttle.locale')
      // A rejected contribution must not cost the composer switch: without the Remote the
      // switch reports an error, but the toolbar entry is still there and still ours.
      try {
        await ctx.remote.$mount(CONTRIBUTION)
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[full-throttle] remote contribution rejected:', error)
        }
      }
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
      // Registered separately, and defensively: a build without this slot, or one that rejects
      // its registration, must cost the settings row and nothing else. The composer switch is
      // the plugin's whole point and it is already registered above.
      const registerSettings = () => {
        try {
          return ctx.slots.inject(SETTINGS_SLOT, () =>
            ctx.slots.register(
              {
                name: SETTINGS_SLOT,
                id: SETTINGS_ENTRY_ID,
                order: 60,
                label: () => t('label'),
                locale: NS,
                registrant: PACKAGE,
                inject: () => ({ api: namespaceApi }),
              },
              SubagentsSetting,
            ),
          )
        } catch (error) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[full-throttle] settings section unavailable:', error)
          }
          return () => {}
        }
      }
      ctx.effect(registerSettings, 'full-throttle.settings-slot')
    }

    exports.inject = ['slots', 'locale', 'remote']
    exports.apply = apply
    return module.exports
  },
})

