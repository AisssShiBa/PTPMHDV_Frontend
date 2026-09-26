// Node 24 test loader: reuse the project's TypeScript compiler and @/ alias.
// Production code is untouched; only Vite's build-time env is supplied for tests.
import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const base = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2))
        : fileURLToPath(new URL(specifier, context.parentURL))
      for (const extension of ['', '.ts', '.tsx']) {
        if (existsSync(base + extension) && /\.tsx?$/.test(base + extension)) {
          return { url: pathToFileURL(base + extension).href, shortCircuit: true }
        }
      }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      const source = readFileSync(fileURLToPath(url), 'utf8')
        .replaceAll('import.meta.env', "({ VITE_API_BASE_URL: 'http://test.local/api', DEV: false })")
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText }
    }
    return next(url, context)
  }
})
