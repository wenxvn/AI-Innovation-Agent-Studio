import { afterEach, describe, it, expect, vi } from 'vitest'
import { api } from '@/lib/api-client'
import type { Evaluation, Output, ProviderRuntimeStatus, ProviderStatus, RuntimeStatus } from '@/lib/api-client'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

describe('API Client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have correct base URL configuration', () => {
    expect(API_BASE).toBeDefined()
    expect(typeof API_BASE).toBe('string')
  })

  it('should construct project endpoints correctly', () => {
    const projectId = 'test-project-123'
    const endpoints = {
      list: `${API_BASE}/api/v1/projects`,
      get: `${API_BASE}/api/v1/projects/${projectId}`,
      memory: `${API_BASE}/api/v1/projects/${projectId}/memory`,
      outputs: `${API_BASE}/api/v1/projects/${projectId}/outputs`,
      agents: `${API_BASE}/api/v1/projects/${projectId}/agents/runs`,
    }

    expect(endpoints.list).toContain('/api/v1/projects')
    expect(endpoints.get).toContain(projectId)
    expect(endpoints.memory).toContain('/memory')
    expect(endpoints.outputs).toContain('/outputs')
    expect(endpoints.agents).toContain('/agents/runs')
  })

  it('should construct dashboard stats endpoint correctly', () => {
    const endpoint = `${API_BASE}/api/v1/dashboard/stats`
    expect(endpoint).toContain('/api/v1/dashboard/stats')
  })

  it('should construct tools endpoint correctly', () => {
    const endpoint = `${API_BASE}/api/v1/tools`
    expect(endpoint).toContain('/api/v1/tools')
  })

  it('should construct runtime provider endpoints correctly', () => {
    const endpoints = {
      providers: `${API_BASE}/api/v1/runtime/providers`,
      status: `${API_BASE}/api/v1/runtime/status`,
    }

    expect(endpoints.providers).toContain('/api/v1/runtime/providers')
    expect(endpoints.status).toContain('/api/v1/runtime/status')
  })

  it('should type output delivery asset fields', () => {
    const output: Output = {
      id: 'output-1',
      project_id: 'project-1',
      agent_run_id: null,
      output_type: 'prd',
      title: 'Launch PRD',
      content: '# Launch PRD',
      content_type: 'markdown',
      language: 'markdown',
      file_name: 'launch-prd.md',
      version: 2,
      created_by_agent: 'prd-writer',
      status: 'completed',
      metadata_: { audience: 'product' },
      created_at: '2026-06-12T00:00:00Z',
      updated_at: '2026-06-12T00:00:00Z',
    }

    expect(output.content_type).toBe('markdown')
    expect(output.file_name).toBe('launch-prd.md')
    expect(output.metadata_.audience).toBe('product')
  })

  it('downloads markdown outputs as blobs with server filenames', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('# Asset', {
        status: 200,
        headers: {
          'content-disposition': 'attachment; filename="fallback.md"; filename*=UTF-8\'\'Launch%20PRD.md',
          'content-type': 'text/markdown; charset=utf-8',
        },
      }),
    )

    const result = await api.outputs.download('project-1', 'output-1')

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/v1/projects/project-1/outputs/output-1/download?format=markdown`,
      expect.any(Object),
    )
    expect(result.filename).toBe('Launch PRD.md')
    expect(result.contentType).toContain('text/markdown')
    expect(await result.blob.text()).toBe('# Asset')
  })

  it('updates evaluation review status without touching score fields', async () => {
    const evaluation: Evaluation = {
      id: 'eval-1',
      project_id: 'project-1',
      agent_run_id: 'run-1',
      score: 82,
      rubric: { correctness: 80 },
      result: 'pass',
      feedback: 'Auto review complete.',
      risks: [],
      status: 'pending',
      review_note: '',
      metadata_: { dimensions: [{ name: 'correctness', score: 80 }] },
      created_at: '2026-06-12T00:00:00Z',
      updated_at: '2026-06-12T00:00:00Z',
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { ...evaluation, status: 'needs_revision', review_note: 'Revise risks.' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const result = await api.evals.update('project-1', 'eval-1', {
      status: 'needs_revision',
      review_note: 'Revise risks.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/v1/projects/project-1/evals/eval-1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'needs_revision', review_note: 'Revise risks.' }),
      }),
    )
    expect(result.data.score).toBe(82)
    expect(result.data.status).toBe('needs_revision')
  })

  it('should type runtime readiness details', () => {
    const llm: ProviderRuntimeStatus = {
      provider: 'openai',
      model: 'gpt-4.1',
      active_provider: 'mock',
      active_model: 'mock-idea2mvp-v1',
      mode: 'mock',
      configured: false,
      required_env_vars: ['OPENAI_API_KEY'],
      missing_env_vars: ['OPENAI_API_KEY'],
      fallback_reason: 'Missing OPENAI_API_KEY; using mock LLM fallback.',
      supports_custom_base_url: true,
      base_url_custom: false,
    }
    const embedding: ProviderRuntimeStatus = {
      provider: 'openai',
      model: 'text-embedding-3-small',
      active_provider: 'mock',
      active_model: 'mock-embedding-v1',
      mode: 'mock',
      configured: false,
      required_env_vars: ['OPENAI_API_KEY'],
      missing_env_vars: ['OPENAI_API_KEY'],
      fallback_reason: 'Missing OPENAI_API_KEY; using mock embedding fallback.',
      supports_custom_base_url: true,
      base_url_custom: false,
    }
    const providers: ProviderStatus = {
      llm,
      embedding,
      llm_provider: 'openai',
      llm_model: 'gpt-4.1',
      llm_mode: 'mock',
      llm_configured: false,
      embedding_provider: 'openai',
      embedding_model: 'text-embedding-3-small',
      embedding_mode: 'mock',
      embedding_configured: false,
    }
    const runtime: RuntimeStatus = {
      status: 'ok',
      api: {
        ok: true,
        status: 'online',
        version: '0.4.0',
        environment: 'development',
        host: '0.0.0.0',
        port: 8000,
        message: 'API process is responding.',
      },
      database: {
        ok: true,
        status: 'connected',
        message: 'Database responded to SELECT 1.',
        url: 'sqlite',
      },
      redis: {
        ok: false,
        status: 'disconnected',
        message: 'Redis is optional for sync local development or is not reachable.',
        url: 'redis://localhost:6379/0',
      },
      storage: {
        ok: true,
        status: 'available',
        message: 'Storage backend is available.',
        backend: 'local',
        upload_dir: 'uploads',
      },
      provider: providers,
      llm,
      embedding,
      cors: {
        origins: ['http://localhost:3000', 'http://localhost:3001'],
        allow_credentials: true,
      },
    }

    expect(runtime.llm.missing_env_vars).toEqual(['OPENAI_API_KEY'])
    expect(runtime.cors.origins).toContain('http://localhost:3001')
    expect(providers.llm.active_provider).toBe('mock')
  })

  it('calls prompt template management endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => (
      new Response(JSON.stringify({ data: {}, total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ))

    await api.prompts.list(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts?include_versions=true`,
      expect.any(Object),
    )

    await api.prompts.create({
      name: 'custom.idea_prompt',
      title: 'Idea prompt',
      content: 'Generate ideas for {topic}',
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'custom.idea_prompt',
          title: 'Idea prompt',
          content: 'Generate ideas for {topic}',
        }),
      }),
    )

    await api.prompts.update('agent_run.SYSTEM_PROMPT', { content: 'Updated system prompt', activate: true })
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts/agent_run.SYSTEM_PROMPT`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated system prompt', activate: true }),
      }),
    )

    await api.prompts.versions('agent_run.SYSTEM_PROMPT')
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts/agent_run.SYSTEM_PROMPT/versions`,
      expect.any(Object),
    )

    await api.prompts.activate('agent_run.SYSTEM_PROMPT', 2, 'test activate')
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts/agent_run.SYSTEM_PROMPT/versions/2/activate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'test activate' }),
      }),
    )

    await api.prompts.reload()
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE}/api/v1/prompts/reload`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
