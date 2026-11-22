#!/usr/bin/env node
import { type ConfigMode } from './config.js'
import { doctor } from './doctor.js'
import { type InstallOptions, install } from './install.js'
import { SCRIPTS, runInstalledScript } from './passthrough.js'
import { uninstall } from './uninstall.js'

const USAGE = `Usage: hermesrouter <command>

Commands:
  install [--force] [--configure | --no-configure]
             Copy the plugin into $HERMES_HOME/plugins/tiiny-router/.
             Stops if installed files were edited or the directory was
             not installed by this package, unless --force is given.
             Then offers to configure the backend and tiiny delegation
             provider in Hermes config (--configure applies without
             asking, --no-configure skips; without a terminal the
             commands are printed instead)
  uninstall  Remove $HERMES_HOME/plugins/tiiny-router/
  doctor     Check the install, the Hermes config and the device;
             exits non-zero when a check fails
  ctl ...    Run the installed controller (tiiny_ctl.py)
  route-check ...
             Run the installed route checker (route_check.py)
`

function parseInstallArgs (args:string[]):InstallOptions {
    let mode:ConfigMode = 'ask'
    let force = false
    for (const arg of args) {
        if (arg === '--force') {
            force = true
        } else if (arg === '--configure' || arg === '--no-configure') {
            const next = arg === '--configure' ? 'configure' : 'skip'
            if (mode !== 'ask' && mode !== next) {
                throw new Error(
                    '--configure and --no-configure cannot be used together'
                )
            }
            mode = next
        } else {
            throw new Error(`Unknown option for install: ${arg}`)
        }
    }
    return { force, configMode: mode }
}

function main (argv:string[]):number {
    const [command, ...rest] = argv
    switch (command) {
        case 'install':
            return install(parseInstallArgs(rest))
        case 'uninstall':
            return uninstall()
        case 'doctor':
            if (rest.length) throw new Error('doctor takes no options')
            return doctor()
        case 'ctl':
        case 'route-check':
            return runInstalledScript(SCRIPTS[command], rest)
        case undefined:
        case '-h':
        case '--help':
            process.stdout.write(USAGE)
            return command ? 0 : 1
        default:
            process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`)
            return 1
    }
}

try {
    process.exitCode = main(process.argv.slice(2))
} catch (err) {
    process.stderr.write(`hermesrouter: ${(err as Error).message}\n`)
    process.exitCode = 1
}
