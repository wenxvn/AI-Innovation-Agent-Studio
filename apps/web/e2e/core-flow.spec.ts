import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { e2eTempRoot } from './e2e-env'

test.describe('Core MVP flow', () => {
  test('creates a project, uploads context, runs an agent, and inspects persisted state', async ({ page }) => {
    const unique = Date.now()
    const projectName = `E2E MVP Flow ${unique}`
    const fileName = `brief-${unique}.md`
    const agentPrompt = '没有 idea，请基于上传的材料生成一个 AI 学习助手方向并扫描热点信号。'

    const dashboardProjectsResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/projects?') &&
      response.request().method() === 'GET' &&
      response.status() === 200,
    )
    await page.goto('/dashboard')
    await dashboardProjectsResponse
    await expect(page.getByRole('heading', { name: /项目工作台/ })).toBeVisible()

    await page.getByRole('button', { name: '新建项目' }).click()
    await expect(page.getByRole('dialog', { name: '新建项目' })).toBeVisible()
    await page.getByLabel(/项目名称/).fill(projectName)
    await page.getByLabel(/项目描述/).fill('Playwright E2E 创建的隔离测试项目')
    await page.getByLabel(/项目目标/).fill('验证创建项目、上传文档、运行 Agent、查看产物和工具调用的 MVP 主路径')

    const createProjectResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/projects') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
    )
    await page.getByRole('button', { name: /创建并进入/ }).click()
    const projectPayload = await (await createProjectResponse).json()
    const projectId = projectPayload.data.id as string

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/chat$`))
    await expect(page.getByText(projectName)).toBeVisible()

    await page.getByRole('link', { name: /文件/ }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/files$`))

    const clientFilesDir = path.join(e2eTempRoot, 'client-files')
    fs.mkdirSync(clientFilesDir, { recursive: true })
    const filePath = path.join(clientFilesDir, fileName)
    fs.writeFileSync(
      filePath,
      [
        `# ${projectName}`,
        '',
        '目标用户：备考学生和课程学习者。',
        '痛点：资料分散、计划难坚持、复盘缺少反馈。',
        'MVP：上传学习资料后生成计划、问答卡片和每日复盘。',
      ].join('\n'),
      'utf8',
    )

    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/projects/${projectId}/documents/upload`) &&
      response.request().method() === 'POST' &&
      response.status() === 201,
    )
    await page.getByLabel('Document upload file').setInputFiles(filePath)
    const uploadPayload = await (await uploadResponse).json()

    expect(uploadPayload.data.filename).toBe(fileName)
    expect(uploadPayload.data.status).toBe('indexed')
    expect(uploadPayload.data.chunk_count).toBeGreaterThan(0)
    await expect(page.getByText(fileName).first()).toBeVisible()

    await page.getByRole('link', { name: /对话/ }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/chat$`))
    await page.getByRole('textbox', { name: 'Agent task input' }).fill(agentPrompt)

    const runResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/projects/${projectId}/agents/run`) &&
      response.request().method() === 'POST' &&
      response.status() === 201,
      { timeout: 120000 },
    )
    await page.getByLabel('发送任务').click()
    const runPayload = await (await runResponse).json()

    expect(runPayload.data.id).toBeTruthy()
    expect(runPayload.data.status).toBe('completed')
    expect(runPayload.data.selected_skill).toBe('idea-generator')
    expect(runPayload.data.context_pack.retrieved_evidence.length).toBeGreaterThan(0)
    await expect(page.getByText(agentPrompt).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /没有 idea，请基于上传/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '社媒热点灵感探索报告' })).toBeVisible()
    await expect(page.getByRole('button', { name: /查看详情/ })).toBeVisible()

    await page.getByRole('link', { name: /产物/ }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/outputs$`))
    await expect(page.getByRole('heading', { name: '产物', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: '社媒热点灵感探索报告', level: 3 })).toBeVisible()
    await page.getByRole('button', { name: '预览' }).first().click()
    await expect(page.getByText(/平台热点扫描/)).toBeVisible()

    await page.getByRole('link', { name: /工具/ }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/tools$`))
    await page.getByRole('tab', { name: /调用记录/ }).click()
    await expect(page.getByText('memory_search')).toBeVisible()
    await expect(page.getByText('rag_search')).toBeVisible()
    await expect(page.getByText('social_trend_scan')).toBeVisible()
    await expect(page.getByText('output_writer')).toBeVisible()

    await page.getByRole('link', { name: /文件/ }).click()
    await expect(page.getByText(fileName)).toBeVisible()

    await page.getByRole('link', { name: /上下文/ }).click()
    await expect(page.getByRole('heading', { name: '上下文包', level: 1 })).toBeVisible()
    await page.getByRole('tab', { name: /文档/ }).click()
    await expect(page.getByText(fileName)).toBeVisible()

    await page.getByRole('link', { name: /记忆/ }).click()
    await expect(page.getByRole('heading', { name: '记忆', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /新增记忆/ })).toBeVisible()
  })
})
