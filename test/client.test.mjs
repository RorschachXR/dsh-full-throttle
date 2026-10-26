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
let registered
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
      assert.equal(owner, 'conversation.input.left')
      return callback()
    },
    register(options, component) {
      registered = { options, component }
      return () => {}
    },
  },
}

await moduleExports.apply(ctx)

assert.equal(mounted.package, 'dsh-full-throttle')
assert.equal(JSON.stringify(mounted.descriptors.map((descriptor) => descriptor.method)), JSON.stringify(['getState', 'toggle']))
for (const descriptor of mounted.descriptors) {
  assert.equal(descriptor.service, 'fullThrottle')
  assert.equal(descriptor.namespace, 'fullThrottle')
  assert.equal(JSON.stringify(descriptor.parameters), '[]')
}
assert.equal(registered.options.name, 'conversation.input.left')
assert.equal(registered.options.id, 'full-throttle-toggle')
assert.equal(registered.options.locale, 'full-throttle')
assert.equal(registered.options.order, 0)
assert.equal(typeof registered.component, 'function')
const injection = registered.options.inject('session-1')
assert.equal(typeof injection.api, 'function')
assert.equal(locales.get('full-throttle').key, 'full-throttle:dictionary')
console.log('client.test.mjs: ok')

