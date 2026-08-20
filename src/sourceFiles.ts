import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// One walk of src/, shared by the guards that scan the tree so each
// one does not grow its own copy of the same twelve lines.

const SRC = join(import.meta.dirname)

/** Every non-test source file under src/, as paths relative to src/. */
export function sourceFiles(ext: string, dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(ext, full)
    if (!name.endsWith(ext) || /\.test\.tsx?$/.test(name)) return []
    return [full.slice(SRC.length + 1)]
  })
}
