// pattern: Imperative Shell
/**
 * The config step: select the backend and provider in Hermes config. Config is
 * changed only through `hermes config set`; `config.yaml` and the secrets
 * file are never read or written here.
 */
import { readSync } from 'node:fs'
import { isatty } from 'node:tty'
import { runHermes } from './hermes.js'
import { PLUGIN_NAME } from './package.js'

export type ConfigMode = 'configure'|'skip'|'ask'

/** One `hermes config set KEY VALUE` call. */
export type ConfigSetting = [key:string, value:string]

/**
 * Context window of each model in the `tiiny` provider. Mirrors the
 * provider block in `references/backend.md` and the tier table in
 * `tiers.py`; change them together.
 */
const TIINY_MODELS:Record<string, { context_length:number }> = {
    'Qwen/Qwen3.6-35B-A3B': { context_length: 262144 },
    'Qwen/Qwen3.8-27B': { context_length: 262144 },
    'Qwen/Qwen3.5-9B': { context_length: 131072 },
    'openai/gpt-oss-20b': { context_length: 131072 },
    'ornith-ai/Ornith-1.5-35B-A3B-Turbo': { context_length: 262144 },
    'InternScience/Sage-A1.5-Turbo': { context_length: 262144 },
}

const PROVIDER = 'providers.tiiny'

/**
 * Every setting the config step makes, in order. Model ids contain dots,
 * so the `models` map is set as one JSON value (valid YAML flow syntax)
 * rather than through dotted keys.
 *
 * Value forms rely on Hermes coercion (`_coerce_config_set_value` in
 * `hermes_cli/config.py`): `false`/`true` become booleans, bare digits
 * become integers, and a JSON object becomes a map, for every key whose
 * `DEFAULT_CONFIG` default is not a string. None of the
 * `providers.tiiny` keys has a string default.
 * Pinned by guard tests in `test/config.test.ts`.
 */
export const SETTINGS:ConfigSetting[] = [
    [`${PROVIDER}.name`, 'tiiny'],
    [`${PROVIDER}.api`, 'http://openai.api.tiiny/v1'],
    [`${PROVIDER}.key_env`, 'TIINY_API_KEY'],
    [`${PROVIDER}.transport`, 'chat_completions'],
    [`${PROVIDER}.default_model`, 'Qwen/Qwen3.6-35B-A3B'],
    [`${PROVIDER}.context_length`, '262144'],
    [`${PROVIDER}.models_discovered`, 'false'],
    [`${PROVIDER}.extra_body.chat_template_kwargs.enable_thinking`, 'false'],
    [`${PROVIDER}.models`, JSON.stringify(TIINY_MODELS)],
    ['delegation.backend', PLUGIN_NAME],
    ['delegation.provider', 'tiiny'],
]

/** Quote `s` for a POSIX shell. */
function shellQuote (s:string):string {
    if (/^[\w./:@-]+$/.test(s)) return s
    return `'${s.replaceAll("'", `'\\''`)}'`
}

/** The settings as shell commands a user can run by hand. */
export function configCommands ():string[] {
    return [
        ...SETTINGS.map(([key, value]) =>
            `hermes config set ${shellQuote(key)} ${shellQuote(value)}`),
        `hermes plugins enable ${PLUGIN_NAME}`,
    ]
}

/** Apply every setting. Returns the first non-zero hermes exit code. */
function applyConfig ():number {
    for (const [key, value] of SETTINGS) {
        const status = runHermes(['config', 'set', key, value])
        if (status !== 0) {
            console.error(
                `\`hermes config set ${key}\` failed (exit ${status}); ` +
                'Hermes config may be partly updated'
            )
            return status
        }
    }
    const enableStatus = runHermes(
        ['plugins', 'enable', PLUGIN_NAME]
    )
    if (enableStatus !== 0) {
        console.error(
            '`hermes plugins enable ' + PLUGIN_NAME +
            '` failed (exit ' + enableStatus + '); ' +
            'Hermes config may be partly updated'
        )
        return enableStatus
    }
    console.log(
        'Selected the tiiny-router backend and tiiny delegation provider. ' +
        'It takes effect from the next Hermes session.'
    )
    return 0
}

/** Read one line from stdin, synchronously. */
function readLine ():string {
    const buf = Buffer.alloc(1)
    let line = ''
    while (readSync(0, buf, 0, 1, null) === 1) {
        const ch = buf.toString('utf8')
        if (ch === '\n') break
        line += ch
    }
    return line
}

function confirm (question:string):boolean {
    process.stdout.write(`${question} [y/N] `)
    return /^y(es)?$/i.test(readLine().trim())
}

function printCommands ():void {
    console.log(
        'Hermes config was not changed. To configure Tiiny delegation, run:'
    )
    for (const cmd of configCommands()) console.log(`  ${cmd}`)
}

/**
 * Run the config step. `ask` prompts when stdin and stdout are a
 * terminal, and otherwise only prints the commands.
 */
export function configStep (mode:ConfigMode):number {
    if (mode === 'configure') return applyConfig()
    // isatty, not process.stdin.isTTY: touching process.stdin makes fd 0
    // non-blocking and the synchronous read then fails with EAGAIN.
    if (mode === 'ask' && isatty(0) && isatty(1)) {
        const question = 'Add the `tiiny` provider and select it for ' +
            'delegation with the tiiny-router backend in Hermes config?'
        if (confirm(question)) return applyConfig()
    }
    printCommands()
    return 0
}
