import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

/**
 * Resolves extensionless relative imports to their TypeScript source files,
 * and resolves the "@/" path alias used across the app to the project root.
 *
 * The project has no tsx or ts-node dependency, and the generated Prisma
 * client uses extensionless relative imports internally, so Node's built-in
 * type stripping needs a resolver hook to load them.
 *
 * Used by scripts/seed-test-user.mjs.
 */

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const CANDIDATE_SUFFIXES = [
  '.ts',
  '.tsx',
  '/index.ts',
  '/index.tsx',
  '.mjs',
  '.js',
  '.cjs',
]

function firstExisting(target) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = target + suffix
    if (existsSync(candidate)) return candidate
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = path.join(PROJECT_ROOT, specifier.slice(2))
    const found = firstExisting(target)
    if (found) return nextResolve(pathToFileURL(found).href, context)
    return nextResolve(specifier, context)
  }

  const relative =
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/')

  if (!relative || !context.parentURL) {
    return nextResolve(specifier, context)
  }

  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    const found = firstExisting(target)
    if (found) return nextResolve(pathToFileURL(found).href, context)
    throw error
  }
}
