import { defineConfig, devices } from '@playwright/test'
import {
  apiRoot,
  e2eApiPort,
  e2eApiUrl,
  e2eDatabaseUrl,
  e2eOutputDir,
  e2eUploadDir,
  e2eWebUrl,
  prepareE2EEnvironment,
  webRoot,
} from './e2e/e2e-env'

if (!process.env.TEST_WORKER_INDEX && !process.env.E2E_ENV_PREPARED) {
  prepareE2EEnvironment()
  process.env.E2E_ENV_PREPARED = '1'
}

const e2eWebServerUrl = new URL(e2eWebUrl)
const e2eWebHost = e2eWebServerUrl.hostname || 'localhost'
const e2eWebPort = e2eWebServerUrl.port || '3000'
const e2eNextStartCommand = `pnpm exec next build && pnpm exec next start --hostname ${e2eWebHost} --port ${e2eWebPort}`
const e2eWebCommand = process.platform === 'win32'
  ? `cmd /c "${e2eNextStartCommand}"`
  : e2eNextStartCommand

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  outputDir: e2eOutputDir,
  use: {
    baseURL: e2eWebUrl,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `python -m uvicorn app.main:app --host 127.0.0.1 --port ${e2eApiPort}`,
      cwd: apiRoot,
      url: `${e2eApiUrl}/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: e2eDatabaseUrl,
        UPLOAD_DIR: e2eUploadDir,
        STORAGE_BACKEND: 'local',
        CORS_ORIGINS: e2eWebUrl,
        LLM_PROVIDER: 'mock',
        EMBEDDING_PROVIDER: 'mock',
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
        GOOGLE_API_KEY: '',
        DEEPSEEK_API_KEY: '',
      },
    },
    {
      command: e2eWebCommand,
      cwd: webRoot,
      url: e2eWebUrl,
      reuseExistingServer: false,
      timeout: 240000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: e2eApiUrl,
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
})
