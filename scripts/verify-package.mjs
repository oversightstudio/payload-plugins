import { access, readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const requestedName = process.argv[2]
const packagesDirectory = resolve('packages')
const directories = await readdir(packagesDirectory)

for (const directory of directories) {
  const packageDirectory = join(packagesDirectory, directory)
  let manifest
  try {
    manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  if (requestedName && manifest.name !== requestedName) continue

  const exports = manifest.publishConfig?.exports
  if (!exports) throw new Error(`${manifest.name} has no publishConfig.exports map.`)

  for (const [subpath, conditions] of Object.entries(exports)) {
    for (const key of ['import', 'require', 'types']) {
      const target = conditions[key]
      if (!target) throw new Error(`${manifest.name} ${subpath} is missing a ${key} export.`)
      await access(join(packageDirectory, target))
    }

    const esmSource = await readFile(join(packageDirectory, conditions.import), 'utf8')
    const cjsSource = await readFile(join(packageDirectory, conditions.require), 'utf8')
    if (!esmSource.trim() || !cjsSource.trim()) {
      throw new Error(`${manifest.name} ${subpath} contains an empty runtime export.`)
    }
  }

  process.stdout.write(`Verified ${manifest.name} ESM, CommonJS, and type exports.\n`)
}
