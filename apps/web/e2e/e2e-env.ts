import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const cwd = path.resolve(process.cwd())

export const webRoot = fs.existsSync(path.join(cwd, 'playwright.config.ts'))
  ? cwd
  : path.join(cwd, 'apps', 'web')
export const repoRoot = path.resolve(webRoot, '..', '..')
export const apiRoot = path.join(repoRoot, 'apps', 'api')

export const e2eTempRoot = path.join(os.tmpdir(), 'ai-innovation-agent-studio-e2e')
export const e2eUploadDir = path.join(e2eTempRoot, 'uploads')
export const e2eOutputDir = path.join(e2eTempRoot, 'playwright-output')
export const e2eDatabasePath = path.join(e2eTempRoot, 'e2e.sqlite3')
export const e2eApiPort = process.env.PLAYWRIGHT_API_PORT || '8021'
export const e2eApiUrl = process.env.PLAYWRIGHT_API_BASE_URL || `http://127.0.0.1:${e2eApiPort}`
export const e2eWebUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3021'

export const e2eDatabaseUrl = `sqlite:///${e2eDatabasePath.replace(/\\/g, '/')}`

const generatedPaths = [
  e2eTempRoot,
  path.join(webRoot, 'playwright-report'),
  path.join(webRoot, 'test-results'),
  path.join(webRoot, 'blob-report'),
  path.join(repoRoot, 'playwright-report'),
  path.join(repoRoot, 'test-results'),
  path.join(repoRoot, 'blob-report'),
]

function removePath(targetPath: string) {
  fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

export function cleanupE2EArtifacts() {
  for (const targetPath of generatedPaths) {
    removePath(targetPath)
  }
}

export function prepareE2EEnvironment() {
  cleanupE2EArtifacts()
  fs.mkdirSync(e2eUploadDir, { recursive: true })
  fs.mkdirSync(e2eOutputDir, { recursive: true })
}
