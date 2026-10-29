import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

/** The section carrying the budget text, by name rather than by registration order. */
const main = (sections) => sections.find((section) => section.name === 'full-throttle:mode')
/** The optional subagent note; registered always, but empty unless the option is on. */
const note = (sections) => sections.find((section) => section.name === 'full-throttle:subagents')

const home = await mkdtemp(join(tmpdir(), 'full-throttle-test-'))
try {
  const first = fakeContext()
  plugin.apply(first.ctx, { dshHome: home })
  assert.deepEqual(plugin.inject, ['systemPrompt'])
  const service = first.services.get('fullThrottle')
  assert.ok(service, 'host service is provided')
  assert.equal(first.sections.length, 2, 'both prompt sections are registered')

  assert.equal(main(first.sections).order, 10150)
  assert.equal(main(first.sections).interpolate, false)
  assert.equal(main(first.sections).text(), '')
  assert.equal(note(first.sections).order, 10151)
  assert.equal(note(first.sections).interpolate, false)
  assert.equal(note(first.sections).text(), '')

  const initial = await service.getState()
  assert.equal(initial.enabled, false)
  assert.match(initial.instructions, /token 用量预算无限/)
  assert.equal(initial.subagents, false, 'the subagent note is opt-in and starts off')
  assert.doesNotMatch(initial.instructions, /子代理/, 'the default budget text stays as it was')

  const on = await service.toggle()
  assert.equal(on.enabled, true)
  assert.equal(main(first.sections).text(), on.instructions)
  assert.equal(note(first.sections).text(), '', 'no subagent note unless the option is on')
  assert.deepEqual(JSON.parse(await readFile(join(home, 'full-throttle.json'), 'utf8')), {
    enabled: true,
    subagents: false,
  })

  const second = fakeContext()
  plugin.apply(second.ctx, { dshHome: home })
  const restored = second.services.get('fullThrottle')
  assert.equal((await restored.getState()).enabled, true)
  assert.equal(main(second.sections).text(), (await restored.getState()).instructions)
  await restored.toggle()
  assert.equal((await restored.getState()).enabled, false)
  assert.equal(main(second.sections).text(), '')

  const third = fakeContext()
  plugin.apply(third.ctx, { dshHome: join(home, 'nested'), instructions: '  Custom budget note.  ' })
  const custom = third.services.get('fullThrottle')
  assert.equal((await custom.getState()).instructions, 'Custom budget note.')
  await custom.toggle()
  assert.equal(main(third.sections).text(), 'Custom budget note.')
  assert.equal(note(third.sections).text(), '')
  await custom.toggle()
  assert.equal(main(third.sections).text(), '')

  // Opt-in: the note appears only with \`subagents: true\`, and only while the switch is on.
  const fourth = fakeContext()
  plugin.apply(fourth.ctx, { dshHome: join(home, 'optin'), subagents: true })
  const opted = fourth.services.get('fullThrottle')
  assert.equal((await opted.getState()).subagents, true)
  assert.equal(note(fourth.sections).text(), '', 'switch is still off')
  const optedOn = await opted.toggle()
  assert.equal(optedOn.enabled, true)
  assert.equal(note(fourth.sections).text(), optedOn.subagentInstructions)
  assert.match(note(fourth.sections).text(), /智能体团队/)
  assert.equal(main(fourth.sections).text(), optedOn.instructions, 'the two sections stay independent')
  await opted.toggle()
  assert.equal(note(fourth.sections).text(), '', 'turning the switch off removes the note too')

  // A custom note replaces the default one, and an empty string falls back to the default.
  const fifth = fakeContext()
  plugin.apply(fifth.ctx, {
    dshHome: join(home, 'custom-note'),
    subagents: true,
    subagentInstructions: '  Say hello to a teammate.  ',
  })
  const tailored = fifth.services.get('fullThrottle')
  await tailored.toggle()
  assert.equal(note(fifth.sections).text(), 'Say hello to a teammate.')

  const sixth = fakeContext()
  plugin.apply(sixth.ctx, { dshHome: join(home, 'blank-note'), subagents: true, subagentInstructions: '   ' })
  const blank = sixth.services.get('fullThrottle')
  await blank.toggle()
  assert.match(note(sixth.sections).text(), /智能体团队/, 'a blank override falls back to the default note')

  // The settings path: the option is toggled from the UI and persisted, not only from config.
  const seventh = fakeContext()
  plugin.apply(seventh.ctx, { dshHome: join(home, 'settings') })
  const settings = seventh.services.get('fullThrottle')
  assert.equal((await settings.getState()).subagents, false, 'off until the user turns it on')
  await settings.toggle()
  assert.equal(note(seventh.sections).text(), '', 'still no note, the option is off')

  const turnedOn = await settings.toggleSubagents()
  assert.equal(turnedOn.subagents, true)
  assert.match(note(seventh.sections).text(), /智能体团队/, 'the note appears as soon as the option is on')
  assert.deepEqual(
    JSON.parse(await readFile(join(home, 'settings', 'full-throttle.json'), 'utf8')),
    { enabled: true, subagents: true },
    'both flags persist',
  )

  // Flipping again round-trips, so a settings UI echoing the state cannot drift.
  assert.equal((await settings.toggleSubagents()).subagents, false)
  assert.equal((await settings.toggleSubagents()).subagents, true)

  // A restart keeps both the switch and the option.
  const eighth = fakeContext()
  plugin.apply(eighth.ctx, { dshHome: join(home, 'settings') })
  const reloaded = eighth.services.get('fullThrottle')
  assert.equal((await reloaded.getState()).enabled, true)
  assert.equal((await reloaded.getState()).subagents, true)
  assert.match(note(eighth.sections).text(), /智能体团队/, 'the option survives a restart without any config')

  const turnedOff = await settings.toggleSubagents()
  assert.equal(turnedOff.subagents, false)
  assert.equal(note(seventh.sections).text(), '', 'turning the option off removes the note')
  assert.equal(main(seventh.sections).text() !== '', true, 'the budget text is unaffected')

  // A state file written by the old version (only `enabled`) must still load.
  const ninth = fakeContext()
  plugin.apply(ninth.ctx, { dshHome: join(home, 'legacy') })
  const legacy = ninth.services.get('fullThrottle')
  await legacy.toggle()
  await writeFile(join(home, 'legacy', 'full-throttle.json'), JSON.stringify({ enabled: true }), 'utf8')
  const tenth = fakeContext()
  plugin.apply(tenth.ctx, { dshHome: join(home, 'legacy') })
  assert.equal((await tenth.services.get('fullThrottle').getState()).enabled, true, 'old state file still loads')
  assert.equal(note(tenth.sections).text(), '', 'and leaves the option at its default')

  console.log('service.test.mjs: ok')
} finally {
  await rm(home, { recursive: true, force: true })
}
