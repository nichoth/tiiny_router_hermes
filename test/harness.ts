/**
 * Seam 1 harness: run the package's command as a subprocess against a
 * temporary HERMES_HOME, with a fake `hermes` executable first on PATH.
 *
 * The fake `hermes` appends one JSON line per call (its argv) to a log
 * file. Calls whose arguments start with FAKE_HERMES_FAIL_PREFIX (every
 * call, when it is empty) exit with FAKE_HERMES_EXIT (default 0); the
 * rest exit 0. \`hermes config get KEY\` prints the value of KEY from the
 * JSON object in FAKE_HERMES_CONFIG (nothing when it is not set there).
 */
import { spawnSync } from 'node:child_process'
import {
    mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync,
    rmSync, readdirSync, statSync, chmodSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '..')
export const CLI = path.join(REPO, 'dist', 'cli.js')
export const SOURCE_TREE = path.join(REPO, 'tiiny-router')

const FAKE_HERMES = `#!/bin/sh
node -e 'require("fs").appendFileSync(process.env.FAKE_HERMES_LOG,
  JSON.stringify(process.argv.slice(1)) + "\\n")' -- "$@"
if [ "$1 $2" = "config get" ]; then
  node -e 'const c = JSON.parse(process.env.FAKE_HERMES_CONFIG || "{}")
    if (process.argv[1] in c) console.log(c[process.argv[1]])' -- "$3"
fi
case "$*" in
  "$FAKE_HERMES_FAIL_PREFIX"*) exit "\${FAKE_HERMES_EXIT:-0}" ;;
esac
exit 0
`

export interface RunResult {
    status:number|null;
    stdout:string;
    stderr:string;
}

export interface Env {
    root:string;
    hermesHome:string;
    home:string;
    /**
     * Run the CLI with the given args. `hermesFails` makes every `hermes`
     * call fail; `hermesFailsOn` only the calls whose arguments start
     * with these words. \`hermesConfig\` is what \`hermes config get\`
     * reports, key by key.
     */
    run(
        args:string[],
        opts?:{
            hermesFails?:boolean,
            hermesFailsOn?:string[],
            hermesConfig?:Record<string, string>,
        }
    ):RunResult;
    /** argv of every call the fake `hermes` received, in order. */
    hermesCalls():string[][];
    cleanup():void;
}

export function makeEnv (opts:{ hermesHome?:string } = {}):Env {
    const root = mkdtempSync(path.join(tmpdir(), 'htr-test-'))
    const home = path.join(root, 'home')
    const bin = path.join(root, 'bin')
    const log = path.join(root, 'hermes-calls.jsonl')
    mkdirSync(home)
    mkdirSync(bin)
    const fake = path.join(bin, 'hermes')
    writeFileSync(fake, FAKE_HERMES)
    chmodSync(fake, 0o755)

    const hermesHome = opts.hermesHome ?
        path.join(root, opts.hermesHome) :
        path.join(home, '.hermes')

    return {
        root,
        hermesHome,
        home,
        run (args, runOpts = {}) {
            const env:NodeJS.ProcessEnv = {
                ...process.env,
                HOME: home,
                PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
                FAKE_HERMES_LOG: log,
                FAKE_HERMES_EXIT:
                    runOpts.hermesFails || runOpts.hermesFailsOn ? '1' : '0',
                FAKE_HERMES_FAIL_PREFIX: runOpts.hermesFailsOn?.join(' ') ?? '',
                FAKE_HERMES_CONFIG: JSON.stringify(runOpts.hermesConfig ?? {}),
            }
            delete env.HERMES_HOME
            // Never reach a real device: a key, and a port nothing serves.
            for (const key of Object.keys(env)) {
                if (key.startsWith('TIINY_')) delete env[key]
            }
            env.TIINY_API_KEY = 'test-key'
            env.TIINY_BASE_URL = 'http://127.0.0.1:9/v1'
            env.TIINY_HOST = 'http://127.0.0.1:9'
            if (opts.hermesHome) env.HERMES_HOME = hermesHome
            const r = spawnSync(process.execPath, [CLI, ...args], {
                env,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
            })
            return { status: r.status, stdout: r.stdout, stderr: r.stderr }
        },
        hermesCalls () {
            if (!existsSync(log)) return []
            return readFileSync(log, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line) as string[])
        },
        cleanup () {
            rmSync(root, { recursive: true, force: true })
        },
    }
}

/** Relative paths of every regular file under `dir`, sorted. */
export function listFiles (dir:string):string[] {
    const out:string[] = []
    const walk = (rel:string) => {
        for (const name of readdirSync(path.join(dir, rel))) {
            if (name === '__pycache__') continue
            const r = rel ? path.join(rel, name) : name
            if (statSync(path.join(dir, r)).isDirectory()) walk(r)
            else out.push(r)
        }
    }
    walk('')
    return out.sort()
}
