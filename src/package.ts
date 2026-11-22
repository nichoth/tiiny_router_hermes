/**
 * Facts about this package: where its files are and which version it is.
 * Everything is found relative to this file, which is compiled into
 * `dist/` at the package root.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_NAME = 'hermes-tiiny-router'
export const PLUGIN_NAME = 'tiiny-router'

const PACKAGE_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
)

/** The plugin tree, laid out exactly as it is installed. */
export const SOURCE_TREE = path.join(PACKAGE_ROOT, PLUGIN_NAME)

export function packageVersion ():string {
    const pkg = JSON.parse(
        readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')
    ) as { version:string }
    return pkg.version
}

export function hermesHome (env:NodeJS.ProcessEnv = process.env):string {
    if (env.HERMES_HOME) return path.resolve(env.HERMES_HOME)
    const home = env.HOME
    if (!home) throw new Error('HOME is not set; set HERMES_HOME instead')
    return path.join(home, '.hermes')
}

export function pluginDir (env:NodeJS.ProcessEnv = process.env):string {
    return path.join(hermesHome(env), 'plugins', PLUGIN_NAME)
}
