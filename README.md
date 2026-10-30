# dsh-full-throttle

English | [中文](README.zh.md)

Full Throttle mode for DeepSeek Harness: a switch in the composer toolbar that injects a
high-budget, no-holds-barred instruction into the system prompt of every session and subagent
in the profile.

> 我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。
>
> *We are a well-funded model company. Your token budget is unlimited — do not skimp or hold
> back. Always prioritize a high-standard result.*

The injected section disappears completely while the switch is off.

### Encouraging subagents (optional, off by default)

A second, independent sentence can be injected on top of the paragraph above. It is **off by
default** and has its own switch:

> 当任务足够复杂、可以并行推进时，鼓励先组建智能体团队分工协作；如果任务本身不需要拆分，不必勉强。
>
> *When a task is complex enough to be split, prefer assembling an agent team and dividing the
> work; when it does not call for splitting, there is no need to force it.*

Turn it on from **Settings → Full Throttle → Encourage subagents** (the same switch is available
as the `subagents` option below). The sentence is only injected while the main switch is on; the
two settings are otherwise independent.

## Appearance

| Off | On |
| --- | --- |
| ![off](docs/preview-en-off.png) | ![on](docs/preview-en-on.png) |

The label follows the UI language: **Full Throttle** in English, **火力全开** in Chinese.
The small dot shows the state (hollow = off, solid + accent = on), so the state stays readable
even in themes that restyle every composer button.

## Install

1. Open DeepSeek Harness and go to **Plugins** in the sidebar.
2. Click **Add plugin** and paste this repository address:

   ```text
   https://github.com/RorschachXR/dsh-full-throttle
   ```

3. Click **Install**. When it finishes, choose **Enable now** (or enable the bundle later on the
   plugin page).

A branch or tag works too: append `#main` or `#v0.1.0` to the address. Plugin updates are not
automatic — uninstall and install again to upgrade.

## Uninstall

Go to **Plugins → Installed**, open **Full Throttle**, and click **Uninstall**.

The switch state is stored separately in `$DSH_HOME/full-throttle.json`; delete that file if you
want to reset it to off.

## Usage

- Click the switch in the composer toolbar (left of the model selector, beside the permission
  chip).
- The state is profile-wide: it applies to all sessions and subagents, and takes effect on their
  next model request. It persists across restarts.
- The default injected text is the Chinese paragraph above. It can be replaced with the
  `instructions` option: add this override to your profile's `cordis.patch.yml` (advanced, optional)

  ```yaml
  - id: full-throttle
    config:
      instructions: 'Spend the full budget. Never stop early.'
  ```

- The optional subagent note has its own config, and can also be replaced:

  ```yaml
  - id: full-throttle
    config:
      subagents: true
      subagentInstructions: 'Split independent work across subagents when it helps.'
  ```

  `subagents` supplies the default until you change the subagent switch in Settings; toggling
  the main switch alone keeps following that config default. Settings writes your choice to
  `$DSH_HOME/full-throttle.json` and that choice wins from then on. `subagentInstructions` falls
  back to the default above when empty.

## Compatibility

- Colours, radii and fonts use host theme tokens only, so stock light/dark and third-party
  themes are supported.
- **PRTS**: that theme restyles every composer button with `!important`. The switch beats it with
  an id-scoped `!important` rule and a state dot, and maps its own PRTS control variables so the
  ON state uses PRTS yellow.
- English and Chinese dictionaries are built in; the plugin's title and description in the
  Plugin Manager are localized too.

