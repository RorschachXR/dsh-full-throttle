/**
 * Host half of `dsh-full-throttle`.
 *
 * Owns the profile-wide full-throttle switch (a tiny state file under the
 * harness home) and one dynamic system-prompt section that resolves to the
 * configured instruction text while the switch is on. The section registers
 * globally, the same scope as the user-global AGENTS.md, so every session and
 * agent of this profile sees the injection on its next model step.
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Stable prototype property the Typert protocol reads Remote markers from. */
const REMOTE_METHODS = '@deepseek-ai/dsh-typert-protocol/remote-methods'
/** The Cordis service key, also the Remote namespace name. */
const SERVICE_KEY = 'fullThrottle'
/** State file inside the harness home; not a session artifact. */
const STATE_FILE = 'full-throttle.json'
/** Prompt section identity and placement, after first-party guidance and before the persona suffix. */
const SECTION_NAME = 'full-throttle:mode'
const SECTION_ORDER = 10150
/** Instruction text injected while the switch is on. */
const DEFAULT_INSTRUCTIONS =
  '我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。'

/** Resolve the harness home the same way the shipped instruction plugin does. */
function resolveDshHome(explicit) {
  if (typeof explicit === 'string' && explicit.length > 0) return explicit
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
  return join(homedir(), '.dsh')
}

/** Keep the injection non-empty; an empty configured string falls back to the default. */
function instructionsOf(config) {
  const configured = config?.instructions
  if (typeof configured !== 'string') return DEFAULT_INSTRUCTIONS
  const text = configured.trim()
  return text.length > 0 ? text : DEFAULT_INSTRUCTIONS
}

/** Full-throttle state and prompt text, exposed to the browser as `remote.fullThrottle`. */
class FullThrottleService {
  constructor(ctx, config) {
    this.ctx = ctx
    this.file = join(resolveDshHome(config?.dshHome), STATE_FILE)
    this.instructions = instructionsOf(config)
    this.enabled = false
    this.typertRemote = { service: this, serviceKey: SERVICE_KEY, namespace: SERVICE_KEY }
    this.ready = this.restore()
  }

  /** Read the persisted switch once at activation; a missing file means off. */
  async restore() {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8'))
      if (typeof parsed?.enabled === 'boolean') this.enabled = parsed.enabled
    } catch (error) {
      if (error?.code !== 'ENOENT') this.warn('restore', error)
    }
  }

  warn(scope, error) {
    try {
      if (this.ctx.logger?.warn) this.ctx.logger.warn('[full-throttle] ' + scope + ': ' + (error?.message ?? error))
    } catch {}
  }

  /** Current switch state plus the text it injects. */
  async getState() {
    await this.ready
    return { enabled: this.enabled, instructions: this.instructions }
  }

  /** Flip the switch, persist it, and return the new state. */
  async toggle() {
    await this.ready
    this.enabled = !this.enabled
    try {
      await this.persist()
    } catch (error) {
      this.enabled = !this.enabled
      throw error
    }
    return { enabled: this.enabled, instructions: this.instructions }
  }

  /** Replace the state file through a same-directory rename; readers never see a torn file. */
  async persist() {
    await mkdir(dirname(this.file), { recursive: true })
    const temp = this.file + '.' + process.pid.toString(36) + '.tmp'
    await writeFile(temp, JSON.stringify({ enabled: this.enabled }), 'utf8')
    try {
      await rename(temp, this.file)
    } catch (error) {
      await unlink(temp).catch(() => {})
      throw error
    }
  }

  /** Prompt-section text: empty while off, so the section disappears from the rendered prompt. */
  promptText() {
    return this.enabled ? this.instructions : ''
  }
}

/** Declaration-order Remote markers the Gateway's source-mode fallback reads. */
Object.defineProperty(FullThrottleService.prototype, REMOTE_METHODS, {
  configurable: true,
  value: {
    version: 1,
    methods: [
      { method: 'getState', invocation: { kind: 'direct' } },
      { method: 'toggle', invocation: { kind: 'direct' } },
    ],
  },
})

/**
 * Register the switch service and its dynamic prompt section for this profile.
 * @param ctx - owning Cordis context.
 * @param config - this row's config (dshHome, instructions).
 */
export function apply(ctx, config) {
  const service = new FullThrottleService(ctx, config)
  ctx.provide(SERVICE_KEY, service)
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        interpolate: false,
        text: () => service.promptText(),
      }),
    'full-throttle.prompt-section',
  )
  void service.ready
}

/** System-prompt assembly must exist; without it the plugin has nothing to inject into. */
export const inject = ['systemPrompt']

