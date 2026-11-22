/**
 * The install manifest: a file inside the installed directory that marks
 * it as installed by this package and records the hash of every file the
 * install wrote.
 */
import { createHash } from 'node:crypto'
import {
    existsSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { PACKAGE_NAME } from './package.js'

export const MANIFEST_FILE = '.hermes-tiiny-router-manifest.json'

export interface Manifest {
    package:string;
    version:string;
    /** Relative path (with `/` separators) -> sha256 hex digest. */
    files:Record<string, string>;
}

/** Directory names that are never copied or recorded. */
const SKIP = new Set(['__pycache__'])

/** Relative paths of every file under `dir`, `/`-separated, sorted. */
export function listTree (dir:string):string[] {
    const out:string[] = []
    const walk = (rel:string) => {
        const entries = readdirSync(path.join(dir, rel), {
            withFileTypes: true,
        })
        for (const entry of entries) {
            if (SKIP.has(entry.name)) continue
            const r = rel ? `${rel}/${entry.name}` : entry.name
            if (entry.isDirectory()) walk(r)
            else if (entry.isFile()) out.push(r)
        }
    }
    walk('')
    return out.sort()
}

export function hashFile (file:string):string {
    return createHash('sha256').update(readFileSync(file)).digest('hex')
}

export function buildManifest (
    dir:string,
    files:string[],
    version:string
):Manifest {
    const hashes:Record<string, string> = {}
    for (const rel of files) hashes[rel] = hashFile(path.join(dir, rel))
    return { package: PACKAGE_NAME, version, files: hashes }
}

export function writeManifest (dir:string, manifest:Manifest):void {
    writeFileSync(
        path.join(dir, MANIFEST_FILE),
        JSON.stringify(manifest, null, 2) + '\n'
    )
}

/**
 * The manifest in `dir`, or `null` when there is none or it was not
 * written by this package (the directory is then foreign).
 */
export function readManifest (dir:string):Manifest|null {
    const file = path.join(dir, MANIFEST_FILE)
    if (!existsSync(file)) return null
    let parsed:unknown
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
        return null
    }
    const m = parsed as Partial<Manifest>|null
    if (
        !m ||
        m.package !== PACKAGE_NAME ||
        typeof m.version !== 'string' ||
        !m.files ||
        typeof m.files !== 'object'
    ) {
        return null
    }
    return m as Manifest
}

export interface ManifestDiff {
    /** Files present whose hash differs from the manifest (local edits). */
    edited:string[];
    /** Files the manifest lists that are no longer present. */
    missing:string[];
}

/** Compare the files in `dir` against the hashes recorded in `manifest`. */
export function compareManifest (
    dir:string,
    manifest:Manifest
):ManifestDiff {
    const edited:string[] = []
    const missing:string[] = []
    for (const [rel, hash] of Object.entries(manifest.files).sort()) {
        const file = path.join(dir, rel)
        if (!existsSync(file)) missing.push(rel)
        else if (hashFile(file) !== hash) edited.push(rel)
    }
    return { edited, missing }
}
