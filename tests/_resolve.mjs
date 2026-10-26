// Permette a Node di risolvere import senza estensione (./groq → ./groq.ts) nei test
import { register } from 'node:module'
register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function resolve(spec, ctx, next) {
  if (/^\\.\\.?\\//.test(spec) && !/\\.[a-z]+$/i.test(spec) && ctx.parentURL) {
    const u = new URL(spec + '.ts', ctx.parentURL)
    if (existsSync(fileURLToPath(u))) return { url: u.href, shortCircuit: true }
  }
  return next(spec, ctx)
}`), import.meta.url)
