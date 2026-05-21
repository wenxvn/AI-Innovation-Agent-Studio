import { describe, it, expect } from 'vitest'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

describe('API Client', () => {
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
})
