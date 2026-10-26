import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const plugin = await import(new URL('../index.js', import.meta.url).href)

/** Minimal Cordis context: provide, effect, logger and the systemPrompt section registry. */
function fakeContext() {
  const services = new Map()
  const sections = []
  const ctx = {
    logger: { warn() {} },
    provide(name, value) {
      services.set(name, value)
    },
    effect(fn) {
      fn()
    },
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {
          const index = sections.indexOf(section)
          if (index >= 0) sections.splice(index, 1)
        }
      },
    },
  }
  return { ctx, services, sections }
}

const home = await mkdtemp(join(tmpdir(), 'full-throttle-test-'))
try {
  const first = fakeContext()
  plugin.apply(first.ctx, { dshHome: home })
  assert.deepEqual(plugin.inject, ['systemPrompt'])
  const service = first.services.get('fullThrottle')
  assert.ok(service, 'host service is provided')
  assert.equal(first.sections.length, 1)
  assert.equal(first.sections[0].name, 'full-throttle:mode')
  assert.equal(first.sections[0].order, 10150)
  assert.equal(first.sections[0].interpolate, false)
  assert.equal(first.sections[0].text(), '')

  const initial = await service.getState()
  assert.equal(initial.enabled, false)
  assert.match(initial.instructions, /token 用量预算无限/)

  const on = await service.toggle()
  assert.equal(on.enabled, true)
  assert.equal(first.sections[0].text(), on.instructions)
  assert.deepEqual(JSON.parse(await readFile(join(home, 'full-throttle.json'), 'utf8')), { enabled: true })

  const second = fakeContext()
  plugin.apply(second.ctx, { dshHome: home })
  const restored = second.services.get('fullThrottle')
  assert.equal((await restored.getState()).enabled, true)
  assert.equal(second.sections[0].text(), (await restored.getState()).instructions)
  await restored.toggle()
  assert.equal((await restored.getState()).enabled, false)
  assert.equal(second.sections[0].text(), '')

  const third = fakeContext()
  plugin.apply(third.ctx, { dshHome: join(home, 'nested'), instructions: '  Custom budget note.  ' })
  const custom = third.services.get('fullThrottle')
  assert.equal((await custom.getState()).instructions, 'Custom budget note.')
  await custom.toggle()
  assert.equal(third.sections[0].text(), 'Custom budget note.')
  await custom.toggle()
  assert.equal(third.sections[0].text(), '')

  console.log('service.test.mjs: ok')
} finally {
  await rm(home, { recursive: true, force: true })
}

