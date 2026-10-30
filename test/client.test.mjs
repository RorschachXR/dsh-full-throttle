import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')

let registration
const window = {
  __ModuleLoader__: {
    load(value) {
      registration = value
    },
  },
}
vm.runInNewContext(source, { window, console })

assert.ok(registration, 'the bundle registers with window.__ModuleLoader__')
assert.equal(registration.id, 'dsh-full-throttle')

const React = {
  createElement() {
    return {}
  },
  useCallback(fn) {
    return fn
  },
  useEffect() {},
  useState(value) {
    return [value, () => {}]
  },
}
const moduleExports = registration.factory((specifier) => {
  assert.equal(specifier, 'react')
  return React
})

assert.equal(JSON.stringify(moduleExports.inject), JSON.stringify(['slots', 'locale', 'remote']))
assert.equal(typeof moduleExports.apply, 'function')

let mounted
const registered = new Map()
const locales = new Map()
const ctx = {
  effect(fn) {
    return fn()
  },
  get(name) {
    return name === 'remote.fullThrottle' ? {} : undefined
  },
  locale: {
    register(namespace, dictionary, key) {
      locales.set(namespace, { dictionary, key })
      return () => {}
    },
    bind(namespace) {
      const entry = locales.get(namespace)
      return (name) => (entry && entry.dictionary.zh[name]) || name
    },
  },
  remote: {
    async $mount(contribution) {
      mounted = contribution
    },
  },
  slots: {
    inject(owner, callback) {
      // The real slots service only calls back once the owner slot exists; the stub calls
      // it immediately so both registrations can be inspected.
      return callback()
    },
    register(options, component) {
      registered.set(options.name, { options, component })
      return () => {}
    },
  },
}

await moduleExports.apply(ctx)

assert.equal(mounted.package, 'dsh-full-throttle')
assert.equal(
  JSON.stringify(mounted.descriptors.map((descriptor) => descriptor.method)),
  JSON.stringify(['getState', 'toggle', 'toggleSubagents']),
)
for (const descriptor of mounted.descriptors) {
  assert.equal(descriptor.service, 'fullThrottle')
  assert.equal(descriptor.namespace, 'fullThrottle')
}
assert.equal(JSON.stringify(mounted.descriptors[0].parameters), '[]')
assert.equal(JSON.stringify(mounted.descriptors[1].parameters), '[]')
assert.equal(JSON.stringify(mounted.descriptors[2].parameters), '[]', 'toggleSubagents takes no payload')

const toggle = registered.get('conversation.input.left')
assert.ok(toggle, 'the composer switch is registered in the toolbar slot')
assert.equal(toggle.options.id, 'full-throttle-toggle')
assert.equal(toggle.options.locale, 'full-throttle')
assert.equal(toggle.options.order, 0)
assert.equal(typeof toggle.component, 'function')
const injection = toggle.options.inject('session-1')
assert.equal(typeof injection.api, 'function')

const settings = registered.get('settings.section')
assert.ok(settings, 'the subagent option lives in its own settings section')
assert.equal(settings.options.id, 'full-throttle-subagents-setting')
assert.equal(settings.options.locale, 'full-throttle')
assert.equal(typeof settings.component, 'function')
assert.equal(typeof settings.options.inject('session-1').api, 'function')

const entry = locales.get('full-throttle')
assert.equal(entry.key, 'full-throttle:dictionary')
assert.equal(entry.dictionary.zh.label, '火力全开')
assert.equal(entry.dictionary.en.label, 'Full Throttle')
for (const name of [
  'settingsSubagents',
  'settingsSubagentsHint',
  'settingsOn',
  'settingsOff',
  'settingsError',
  'settingsStale',
]) {
  assert.equal(typeof entry.dictionary.zh[name], 'string', name + ' is localized in zh')
  assert.equal(typeof entry.dictionary.en[name], 'string', name + ' is localized in en')
}
console.log('client.test.mjs: ok')
