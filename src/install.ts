/**
 * `install`: copy the plugin tree into `$HERMES_HOME/plugins/tiiny-router/`,
 * write the manifest, then have Hermes validate it.
 */
import {
    copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, rmdirSync,
} from 'node:fs'
import path from 'node:path'
import { type ConfigMode, configStep } from './config.js'
import { runHermes } from './hermes.js'
import {
    buildManifest, compareManifest, hashFile, listTree, readManifest,
    writeManifest,
} from './manifest.js'
import { SOURCE_TREE, packageVersion, pluginDir } from './package.js'

export interface InstallOptions {
    /** Overwrite local edits and directories this package did not write. */
    force?:boolean;
    /** Whether to configure Hermes, skip, or ask (the default). */
    configMode?:ConfigMode;
}

/**
 * Why `target` must not be overwritten, or `null` when it is safe to.
 * An empty or absent directory is safe; a directory with no manifest of
 * ours is foreign; files that differ from our manifest are local edits.
 */
function overwriteProblem (target:string):string|null {
    if (!existsSync(target) || readdirSync(target).length === 0) return null
    const manifest = readManifest(target)
    if (!manifest) {
        return `${target} exists but was not installed by this package.`
    }
    const { edited } = compareManifest(target, manifest)
    if (edited.length === 0) return null
    return (
        `These installed files were edited since the last install:\n` +
        edited.map(rel => `  ${rel}\n`).join('')
    )
}

/**
 * Delete files the previous install wrote that `files` (the new tree) no
 * longer has, so an upgrade leaves an exact copy. A file whose hash no
 * longer matches the old manifest was edited locally and is kept.
 * Directories emptied by this are removed too.
 */
function removeDropped (target:string, files:string[]):void {
    const previous = readManifest(target)
    if (!previous) return
    const keep = new Set(files)
    for (const [rel, hash] of Object.entries(previous.files)) {
        if (keep.has(rel)) continue
        const file = path.join(target, rel)
        const inside = path.relative(target, file)
        if (inside.startsWith('..') || path.isAbsolute(inside)) continue
        if (!existsSync(file) || hashFile(file) !== hash) continue
        rmSync(file)
        let dir = path.dirname(file)
        while (dir !== target && readdirSync(dir).length === 0) {
            rmdirSync(dir)
            dir = path.dirname(dir)
        }
    }
}

export function install (opts:InstallOptions = {}):number {
    const target = pluginDir()
    const problem = overwriteProblem(target)
    if (problem) {
        if (!opts.force) {
            console.error(
                `${problem}\nNothing was changed. ` +
                'Re-run with --force to overwrite.'
            )
            return 1
        }
        console.error(`${problem}\nOverwriting (--force).`)
    }
    const files = listTree(SOURCE_TREE)
    removeDropped(target, files)
    for (const rel of files) {
        const dest = path.join(target, rel)
        mkdirSync(path.dirname(dest), { recursive: true })
        copyFileSync(path.join(SOURCE_TREE, rel), dest)
    }
    writeManifest(target, buildManifest(target, files, packageVersion()))
    console.log(`Installed ${files.length} files into ${target}`)

    const status = runHermes(['plugins', 'validate', target])
    if (status !== 0) {
        console.error(
            `\`hermes plugins validate\` rejected ${target} ` +
            `(exit ${status})`
        )
        return status
    }
    return configStep(opts.configMode ?? 'ask')
}
