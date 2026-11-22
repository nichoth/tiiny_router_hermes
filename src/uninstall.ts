/**
 * `uninstall`: remove `$HERMES_HOME/plugins/tiiny-router/`, but only if
 * its manifest says this package installed it. Config is left alone; the
 * user is told how to unselect the backend.
 */
import { existsSync, rmSync } from 'node:fs'
import { readManifest } from './manifest.js'
import { PLUGIN_NAME, pluginDir } from './package.js'

const UNSELECT_COMMAND = 'hermes config set delegation.backend default'
const DISABLE_COMMAND = `hermes plugins disable ${PLUGIN_NAME}`

export function uninstall ():number {
    const target = pluginDir()
    if (!existsSync(target)) {
        console.log(`Nothing to remove: ${target} does not exist`)
        return 0
    }
    if (!readManifest(target)) {
        console.error(
            `${target} was not installed by hermes-tiiny-router ` +
            '(no install manifest); leaving it in place'
        )
        return 1
    }
    rmSync(target, { recursive: true, force: true })
    console.log(`Removed ${target}`)
    console.log(
        'Config was not changed. If delegation.backend still selects ' +
        'tiiny-router, unselect it and disable the plugin with:\n' +
        `  ${UNSELECT_COMMAND}\n` +
        `  ${DISABLE_COMMAND}`
    )
    return 0
}
