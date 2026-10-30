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
/** Prompt section carrying the optional subagent note, right after the main one. */
const SUBAGENT_SECTION_NAME = 'full-throttle:subagents'
const SUBAGENT_SECTION_ORDER = SECTION_ORDER + 1
/** Instruction text injected while the switch is on. */
const DEFAULT_INSTRUCTIONS =
  '我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。'
/**
 * Optional note injected only when the `subagents` option is on. It is a separate section
 * with its own opt-in because asking for subagents is a preference, not a budget matter:
 * a profile that wants the budget wording has not thereby asked for work to be split up.
 */
const DEFAULT_SUBAGENT_INSTRUCTIONS =
  '当任务足够复杂、可以并行推进时，鼓励先组建智能体团队分工协作；如果任务本身不需要拆分，不必勉强。'

/** Resolve the harness home the same way the shipped instruction plugin does. */
function resolveDshHome(explicit) {
  if (typeof explicit === 'string' && explicit.length > 0) return explicit
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
  return join(homedir(), '.dsh')
}

/** Keep an injected text non-empty; an empty configured string falls back to its default. */
function textOf(configured, fallback) {
  if (typeof configured !== 'string') return fallback
  const text = configured.trim()
  return text.length > 0 ? text : fallback
}

/**
 * The subagent note is opt-in twice over: it needs the switch on, and its own flag on.
 * A profile that never mentions the flag gets the pre-existing behaviour exactly.
 */
function subagentsRequested(config) {
  return config?.subagents === true
}

/** Full-throttle state and prompt text, exposed to the browser as `remote.fullThrottle`. */
class FullThrottleService {
  constructor(ctx, config) {
    this.ctx = ctx
    this.file = join(resolveDshHome(config?.dshHome), STATE_FILE)
    this.instructions = textOf(config?.instructions, DEFAULT_INSTRUCTIONS)
    this.subagentInstructions = textOf(config?.subagentInstructions, DEFAULT_SUBAGENT_INSTRUCTIONS)
    /** Config default; the state file may override it once the user has chosen. */
    this.subagents = subagentsRequested(config)
    this.subagentsChosen = false
    this.enabled = false
    this.typertRemote = { service: this, serviceKey: SERVICE_KEY, namespace: SERVICE_KEY }
    this.ready = this.restore()
  }

  /**
   * Read the persisted state once at activation. Every field is optional, so a file written
   * by an older version of the plugin (only `enabled`) still loads and keeps the config
   * default for everything it does not mention.
   */
  async restore() {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8'))
      if (typeof parsed?.enabled === 'boolean') this.enabled = parsed.enabled
      if (typeof parsed?.subagents === 'boolean') {
        this.subagents = parsed.subagents
        this.subagentsChosen = true
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') this.warn('restore', error)
    }
  }

  warn(scope, error) {
    try {
      if (this.ctx.logger?.warn) this.ctx.logger.warn('[full-throttle] ' + scope + ': ' + (error?.message ?? error))
    } catch {}
  }

  /** One shape for every reader: the browser, the tests and `toggle` all see the same fields. */
  snapshot() {
    return {
      enabled: this.enabled,
      instructions: this.instructions,
      subagents: this.subagents,
      subagentInstructions: this.subagentInstructions,
    }
  }

  /** Current switch state plus the text it injects. */
  async getState() {
    await this.ready
    return this.snapshot()
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
    return this.snapshot()
  }

  /**
   * Flip the optional subagent note, persist it, and return the new state.
   * Same shape as `toggle`, and a no-op failure leaves the flag as it was.
   */
  async toggleSubagents() {
    await this.ready
    const previous = this.subagents
    this.subagents = !previous
    try {
      await this.persist(true)
      this.subagentsChosen = true
    } catch (error) {
      this.subagents = previous
      throw error
    }
    return this.snapshot()
  }

  /** Replace the state file through a same-directory rename; readers never see a torn file. */
  async persist(includeSubagents = this.subagentsChosen) {
    await mkdir(dirname(this.file), { recursive: true })
    const temp = this.file + '.' + process.pid.toString(36) + '.tmp'
    const state = { enabled: this.enabled }
    if (includeSubagents) state.subagents = this.subagents
    await writeFile(temp, JSON.stringify(state), 'utf8')
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

  /** The optional subagent note: off by default, and off whenever the switch is off. */
  subagentPromptText() {
    return this.enabled && this.subagents ? this.subagentInstructions : ''
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
      { method: 'toggleSubagents', invocation: { kind: 'direct' } },
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
  // Registered unconditionally: the section resolves to '' unless the option is on, so a
  // profile that leaves `subagents` alone renders exactly what it rendered before.
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SUBAGENT_SECTION_NAME,
        order: SUBAGENT_SECTION_ORDER,
        interpolate: false,
        text: () => service.subagentPromptText(),
      }),
    'full-throttle.subagent-section',
  )
  void service.ready
}

/** System-prompt assembly must exist; without it the plugin has nothing to inject into. */
export const inject = ['systemPrompt']

