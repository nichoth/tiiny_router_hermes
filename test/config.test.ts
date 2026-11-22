import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { makeEnv } from './harness.ts'

/** The `hermes config set KEY VALUE` calls, as [key, value] pairs. */
function configSets (calls:string[][]):[string, string][] {
    return calls
        .filter(argv => argv[0] === 'config' && argv[1] === 'set')
        .map(argv => [argv[2], argv[3]])
}

/** Calls that are `plugins enable ...`, as [argv...] */
function pluginEnables (calls:string[][]):string[][] {
    return calls
        .filter(argv =>
            argv[0] === 'plugins' && argv[1] === 'enable')
}

test('install --configure selects the routing backend', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    assert.equal(sets.get('delegation.backend'), 'tiiny-router')
})

test('install --configure selects the tiiny delegation provider', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    assert.equal(sets.get('delegation.provider'), 'tiiny')
})

test('install --configure adds the tiiny provider', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    // Values from the provider block in references/backend.md.
    assert.equal(
        sets.get('providers.tiiny.api'),
        'http://openai.api.tiiny/v1'
    )
    assert.equal(sets.get('providers.tiiny.key_env'), 'TIINY_API_KEY')
    assert.equal(
        sets.get('providers.tiiny.transport'),
        'chat_completions'
    )
    assert.equal(
        sets.get('providers.tiiny.default_model'),
        'Qwen/Qwen3.6-35B-A3B'
    )
    const models = JSON.parse(sets.get('providers.tiiny.models') ?? '{}')
    assert.deepEqual(models['Qwen/Qwen3.6-35B-A3B'], {
        context_length: 262144,
    })
    assert.deepEqual(models['openai/gpt-oss-20b'], {
        context_length: 131072,
    })
})

test('install --no-configure leaves Hermes config alone', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--no-configure'])
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(configSets(env.hermesCalls()), [])
    assert.deepEqual(
        pluginEnables(env.hermesCalls()), [],
        'no plugins enable call'
    )
})

test('a non-interactive install with neither flag only prints', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    // The harness gives the command no terminal on stdin.
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(configSets(env.hermesCalls()), [])
    assert.deepEqual(
        pluginEnables(env.hermesCalls()), [],
        'no plugins enable call'
    )
})

for (const flags of [['--configure'], ['--no-configure'], []]) {
    const name = flags.join(' ') || 'with neither flag'
    test(`install ${name} never touches config.yaml or .env`, t => {
        const env = makeEnv()
        t.after(() => env.cleanup())
        mkdirSync(env.hermesHome, { recursive: true })
        const config = path.join(env.hermesHome, 'config.yaml')
        const secrets = path.join(env.hermesHome, '.env')
        writeFileSync(config, 'delegation:\n  backend: default\n')
        writeFileSync(secrets, 'TIINY_API_KEY=not-a-real-key\n')
        const before = [config, secrets].map(f => statSync(f).mtimeMs)

        assert.equal(env.run(['install', ...flags]).status, 0)

        assert.equal(
            readFileSync(config, 'utf8'),
            'delegation:\n  backend: default\n'
        )
        assert.equal(
            readFileSync(secrets, 'utf8'),
            'TIINY_API_KEY=not-a-real-key\n'
        )
        assert.deepEqual(
            [config, secrets].map(f => statSync(f).mtimeMs),
            before
        )
    })
}

// -- Guard tests: pin the value forms Hermes coerces into typed values --

test('config set sends false for boolean keys', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    assert.equal(
        sets.get('providers.tiiny.models_discovered'),
        'false',
        'models_discovered must be the string "false"'
    )
    assert.equal(
        sets.get(
            'providers.tiiny.extra_body' +
            '.chat_template_kwargs.enable_thinking'
        ),
        'false',
        'enable_thinking must be the string "false"'
    )
})

test('config set sends an integer literal for context_length', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    const raw = sets.get('providers.tiiny.context_length')
    assert.ok(raw !== undefined, 'context_length must be set')
    assert.match(
        raw,
        /^\d+$/,
        'context_length must be a bare integer literal'
    )
    assert.equal(
        Number(raw),
        262144,
        'context_length value'
    )
})

test('config set sends models as JSON with tier model ids', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const sets = new Map(configSets(env.hermesCalls()))
    const raw = sets.get('providers.tiiny.models')
    assert.ok(raw !== undefined, 'models must be set')
    const models = JSON.parse(raw)
    assert.equal(
        typeof models, 'object',
        'models must parse as a JSON object'
    )
    const expectedIds = [
        'Qwen/Qwen3.6-35B-A3B',
        'Qwen/Qwen3.8-27B',
        'Qwen/Qwen3.5-9B',
        'openai/gpt-oss-20b',
        'ornith-ai/Ornith-1.5-35B-A3B-Turbo',
        'InternScience/Sage-A1.5-Turbo',
    ]
    assert.deepEqual(
        Object.keys(models).sort(),
        [...expectedIds].sort(),
        'models keys must be the tier model ids'
    )
    for (const id of expectedIds) {
        assert.equal(
            typeof models[id].context_length,
            'number',
            `${id} context_length must be a number`
        )
        assert.ok(
            Number.isInteger(models[id].context_length),
            `${id} context_length must be an integer`
        )
    }
})

// -- Plugin enable step --

test('install --configure enables the plugin after config set', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'])
    assert.equal(r.status, 0, r.stderr)
    const calls = env.hermesCalls()
    const enables = pluginEnables(calls)
    assert.equal(enables.length, 1, 'exactly one plugins enable call')
    assert.deepEqual(enables[0], ['plugins', 'enable', 'tiiny-router'])
    // The enable call must come after every config set call.
    const lastSetIdx = calls.reduce((acc, argv, i) =>
        argv[0] === 'config' && argv[1] === 'set' ? i : acc, -1)
    const enableIdx = calls.findIndex(argv =>
        argv[0] === 'plugins' && argv[1] === 'enable')
    assert.ok(
        enableIdx > lastSetIdx,
        'plugins enable must come after the last config set'
    )
})

test('install --configure exits non-zero when plugins enable fails', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'], {
        hermesFailsOn: ['plugins', 'enable'],
    })
    assert.notEqual(r.status, 0)
    const enables = pluginEnables(env.hermesCalls())
    assert.equal(enables.length, 1, 'attempted the enable call')
})

test('install --configure exits non-zero when config set fails', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--configure'], {
        hermesFailsOn: ['config', 'set'],
    })
    assert.notEqual(r.status, 0)
    assert.ok(configSets(env.hermesCalls()).length > 0)
})
