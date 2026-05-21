const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApiError {
  error?: { code: string; message: string };
  detail?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  projects: {
    list: (skip = 0, limit = 20) =>
      request<{ data: Project[]; total: number }>(`/api/v1/projects?skip=${skip}&limit=${limit}`),
    get: (id: string) =>
      request<{ data: Project }>(`/api/v1/projects/${id}`),
    create: (data: ProjectCreate) =>
      request<{ data: Project }>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: ProjectUpdate) =>
      request<{ data: Project }>(`/api/v1/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/v1/projects/${id}`, {
        method: "DELETE",
      }),
  },
  documents: {
    list: (projectId: string) =>
      request<{ data: Document[]; total: number }>(`/api/v1/projects/${projectId}/documents`),
    get: (projectId: string, docId: string) =>
      request<{ data: Document }>(`/api/v1/projects/${projectId}/documents/${docId}`),
    upload: async (projectId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed: ${res.status}`);
      }
      return res.json() as Promise<{ data: Document }>;
    },
    delete: (projectId: string, docId: string) =>
      request<{ message: string }>(`/api/v1/projects/${projectId}/documents/${docId}`, {
        method: "DELETE",
      }),
    reindex: (projectId: string, docId: string) =>
      request<{ data: Document }>(`/api/v1/projects/${projectId}/documents/${docId}/reindex`, {
        method: "POST",
      }),
    chunks: (projectId: string, docId: string) =>
      request<{ data: DocumentChunk[]; total: number }>(`/api/v1/projects/${projectId}/documents/${docId}/chunks`),
  },
  memory: {
    list: (projectId: string) =>
      request<{ data: Memory[]; total: number }>(`/api/v1/projects/${projectId}/memory`),
    create: (projectId: string, data: MemoryCreate) =>
      request<{ data: Memory }>(`/api/v1/projects/${projectId}/memory`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: string, memId: string, data: MemoryUpdate) =>
      request<{ data: Memory }>(`/api/v1/projects/${projectId}/memory/${memId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, memId: string) =>
      request<{ message: string }>(`/api/v1/projects/${projectId}/memory/${memId}`, {
        method: "DELETE",
      }),
  },
  skills: {
    list: () =>
      request<{ data: Skill[]; total: number }>("/api/v1/skills"),
    get: (name: string) =>
      request<{ data: Skill }>(`/api/v1/skills/${name}`),
    update: (name: string, data: { is_enabled?: boolean }) =>
      request<{ data: Skill }>(`/api/v1/skills/${name}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    reload: () =>
      request<{ data: Skill[]; total: number }>("/api/v1/skills/reload", {
        method: "POST",
      }),
  },
  agents: {
    run: (projectId: string, data: { user_input: string; agent_name?: string; selected_skill?: string }) =>
      request<{ data: AgentRun }>(`/api/v1/projects/${projectId}/agents/run`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listRuns: (projectId: string) =>
      request<{ data: AgentRun[]; total: number }>(`/api/v1/projects/${projectId}/agents/runs`),
    getRun: (projectId: string, runId: string) =>
      request<{ data: AgentRun }>(`/api/v1/projects/${projectId}/agents/runs/${runId}`),
    approve: (projectId: string, runId: string) =>
      request<{ data: AgentRun }>(`/api/v1/projects/${projectId}/agents/runs/${runId}/approve`, {
        method: "POST",
      }),
    reject: (projectId: string, runId: string) =>
      request<{ data: AgentRun }>(`/api/v1/projects/${projectId}/agents/runs/${runId}/reject`, {
        method: "POST",
      }),
  },
  tools: {
    list: () =>
      request<{ tools: Tool[]; total: number }>("/api/v1/tools"),
    listCalls: (projectId: string) =>
      request<{ data: ToolCall[]; total: number }>(`/api/v1/tools/projects/${projectId}/calls`),
    approve: (projectId: string, callId: string) =>
      request<{ data: ToolCall }>(`/api/v1/tools/projects/${projectId}/calls/${callId}/approve`, {
        method: "POST",
        body: JSON.stringify({ approved_by: "user" }),
      }),
    reject: (projectId: string, callId: string, reason = "") =>
      request<{ data: ToolCall }>(`/api/v1/tools/projects/${projectId}/calls/${callId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  evals: {
    list: (projectId: string) =>
      request<{ data: Evaluation[]; total: number }>(`/api/v1/projects/${projectId}/evals`),
    run: (projectId: string, agentRunId: string, mode = "auto") =>
      request<{ data: Evaluation }>(`/api/v1/projects/${projectId}/evals/run`, {
        method: "POST",
        body: JSON.stringify({ agent_run_id: agentRunId, mode }),
      }),
    get: (projectId: string, evalId: string) =>
      request<{ data: Evaluation }>(`/api/v1/projects/${projectId}/evals/${evalId}`),
  },
  outputs: {
    list: (projectId: string) =>
      request<{ data: Output[]; total: number }>(`/api/v1/projects/${projectId}/outputs`),
    create: (projectId: string, data: OutputCreate) =>
      request<{ data: Output }>(`/api/v1/projects/${projectId}/outputs`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (projectId: string, outputId: string) =>
      request<{ data: Output }>(`/api/v1/projects/${projectId}/outputs/${outputId}`),
    update: (projectId: string, outputId: string, data: OutputUpdate) =>
      request<{ data: Output }>(`/api/v1/projects/${projectId}/outputs/${outputId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, outputId: string) =>
      request<{ message: string }>(`/api/v1/projects/${projectId}/outputs/${outputId}`, {
        method: "DELETE",
      }),
  },
  runtime: {
    providers: () =>
      request<{ data: ProviderStatus }>("/api/v1/runtime/providers"),
    status: () =>
      request<{ data: RuntimeStatus }>("/api/v1/runtime/status"),
  },
  rag: {
    search: (projectId: string, query: string, topK = 8) =>
      request<{ data: RagSearchResult[]; total: number; query: string; mode: string }>(`/api/v1/projects/${projectId}/rag/search`, {
        method: "POST",
        body: JSON.stringify({ query, top_k: topK }),
      }),
  },
  trace: {
    listRunTrace: (projectId: string, runId: string) =>
      request<{ data: TraceEvent[]; total: number }>(`/api/v1/projects/${projectId}/agents/runs/${runId}/trace`),
    listProjectTrace: (projectId: string, limit = 100) =>
      request<{ data: TraceEvent[]; total: number }>(`/api/v1/projects/${projectId}/trace/events?limit=${limit}`),
  },
  health: () =>
    request<{ status: string; database: string; version: string }>("/health"),
};

export interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  tech_stack: string[];
  status: string;
  current_stage: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  goal?: string;
  tech_stack?: string[];
  status?: string;
  current_stage?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  goal?: string;
  tech_stack?: string[];
  status?: string;
  current_stage?: string;
  progress?: number;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  summary: string;
  chunk_count: number;
  embedding_status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata_: Record<string, unknown>;
  created_at: string;
}

export interface Memory {
  id: string;
  project_id: string;
  memory_type: string;
  content: string;
  confidence: number;
  is_active: boolean;
  is_stale: boolean;
  metadata_: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MemoryCreate {
  memory_type: string;
  content: string;
  confidence?: number;
  is_active?: boolean;
  is_stale?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MemoryUpdate {
  memory_type?: string;
  content?: string;
  confidence?: number;
  is_active?: boolean;
  is_stale?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  trigger: string[];
  inputs: string[];
  outputs: string[];
  tools: string[];
  permissions: Record<string, boolean>;
  requires_approval: boolean;
  is_enabled: boolean;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  project_id: string;
  agent_name: string;
  status: string;
  user_input: string;
  selected_skill: string;
  plan: Array<{ step: number; action: string; status: string }>;
  context_pack: Record<string, unknown>;
  generated_output: Record<string, unknown>;
  eval_result: Record<string, unknown>;
  token_usage: Record<string, number>;
  latency_ms: number;
  cost: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  name: string;
  description?: string;
  permission_level: string;
  requires_approval: boolean;
  timeout_seconds?: number;
}

export interface ToolCall {
  id: string;
  project_id: string;
  agent_run_id: string;
  tool_name: string;
  input_params: Record<string, unknown>;
  output_result: Record<string, unknown>;
  status: string;
  permission_level: string;
  requires_approval: boolean;
  approved_by: string;
  latency_ms: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  project_id: string;
  agent_run_id: string;
  score: number;
  rubric: Record<string, number>;
  result: string;
  feedback: string;
  risks: string[];
  created_at: string;
  updated_at: string;
}

export interface Output {
  id: string;
  project_id: string;
  agent_run_id: string | null;
  output_type: string;
  title: string;
  content: string;
  version: number;
  created_by_agent: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OutputCreate {
  output_type?: string;
  title: string;
  content?: string;
  created_by_agent?: string;
}

export interface OutputUpdate {
  title?: string;
  content?: string;
  output_type?: string;
  status?: string;
}

export interface ProviderStatus {
  llm_provider: string;
  llm_model: string;
  llm_mode: string;
  llm_configured: boolean;
  embedding_provider: string;
  embedding_model: string;
  embedding_mode: string;
  embedding_configured: boolean;
}

export interface RuntimeStatus {
  llm: {
    provider: string;
    model: string;
    mode: string;
    configured: boolean;
  };
  embedding: {
    provider: string;
    model: string;
    mode: string;
    configured: boolean;
  };
}

export interface RagSearchResult {
  chunk_id: string;
  document_id: string;
  project_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  score: number;
  embedding_provider: string;
  embedding_model: string;
  embedding_mode: string;
  mode: string;
}

export interface TraceEvent {
  id: string;
  project_id: string;
  run_id: string;
  event_type: string;
  title: string;
  message: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  latency_ms: number;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_data: Record<string, unknown>;
  metadata_: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
