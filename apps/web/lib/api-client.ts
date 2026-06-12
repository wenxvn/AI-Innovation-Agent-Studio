const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApiError {
  error?: { code: string; message: string };
  detail?: string | { message?: string } | Array<{ msg?: string; message?: string }>;
}

export type UploadProgressHandler = (progress: number) => void;

function getApiErrorMessage(body: ApiError, fallback: string): string {
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const firstMessage = detail.find((item) => item.msg || item.message);
    if (firstMessage) return firstMessage.msg || firstMessage.message || fallback;
  }
  if (detail && typeof detail === "object" && !Array.isArray(detail) && detail.message) {
    return detail.message;
  }
  return body.error?.message || fallback;
}

function getFilenameFromContentDisposition(header: string | null): string {
  if (!header) return "";

  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  const quoted = header.match(/filename="([^"]+)"/i)?.[1];
  if (quoted) return quoted;

  return header.match(/filename=([^;]+)/i)?.[1]?.trim() || "";
}

function ensureBlobText(blob: Blob, body: ArrayBuffer): Blob {
  if (typeof blob.text === "function") return blob;

  Object.defineProperty(blob, "text", {
    value: async () => new TextDecoder().decode(body),
  });
  return blob;
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
    throw new Error(getApiErrorMessage(body, `API error: ${res.status}`));
  }

  return res.json();
}

async function requestBlob(path: string, options?: RequestInit): Promise<OutputExportFile> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, `API error: ${res.status}`));
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const body = await res.arrayBuffer();
  const blob = ensureBlobText(new Blob([body], { type: contentType }), body);
  return {
    blob,
    filename: getFilenameFromContentDisposition(res.headers.get("content-disposition")),
    contentType,
  };
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
    upload: async (projectId: string, file: File, onProgress?: UploadProgressHandler) => {
      const formData = new FormData();
      formData.append("file", file);
      return new Promise<{ data: Document }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/v1/projects/${projectId}/documents/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress?.(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          const fallback = xhr.status >= 200 && xhr.status < 300
            ? "{}"
            : JSON.stringify({ detail: `Upload failed: ${xhr.status}` });
          let body: ApiError | { data: Document };
          try {
            body = JSON.parse(xhr.responseText || fallback) as ApiError | { data: Document };
          } catch {
            body = { detail: `Upload failed: ${xhr.status}` };
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            resolve(body as { data: Document });
            return;
          }

          reject(new Error(getApiErrorMessage(body as ApiError, `Upload failed: ${xhr.status}`)));
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed because the network connection was interrupted."));
        };

        xhr.send(formData);
      });
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
    search: (projectId: string, query: string, mode: "semantic" | "keyword" = "semantic") =>
      request<{ data: Memory[]; total: number; query: string; mode: string }>(`/api/v1/projects/${projectId}/memory/search?q=${encodeURIComponent(query)}&mode=${mode}`),
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
    run: (projectId: string, data: { user_input: string; agent_name?: string; selected_skill?: string; run_mode?: string }) =>
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
    update: (projectId: string, evalId: string, data: EvaluationUpdate) =>
      request<{ data: Evaluation }>(`/api/v1/projects/${projectId}/evals/${evalId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
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
    download: (projectId: string, outputId: string, format: OutputExportFormat = "markdown") =>
      requestBlob(`/api/v1/projects/${projectId}/outputs/${outputId}/download?format=${encodeURIComponent(format)}`),
    export: (projectId: string, outputId: string, options: OutputExportOptions = {}) => {
      const format = options.format || "markdown";
      return requestBlob(`/api/v1/projects/${projectId}/outputs/${outputId}/export?format=${encodeURIComponent(format)}`);
    },
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
  workflow: {
    getStatus: (projectId: string) =>
      request<{ data: WorkflowStatus }>(`/api/v1/projects/${projectId}/workflow`),
  },
  dashboard: {
    stats: () =>
      request<{ data: DashboardStats }>("/api/v1/dashboard/stats"),
  },
  prompts: {
    list: (includeVersions = false) =>
      request<{ data: PromptTemplate[]; total: number }>(`/api/v1/prompts?include_versions=${includeVersions}`),
    get: (name: string) =>
      request<{ data: PromptTemplate }>(`/api/v1/prompts/${encodeURIComponent(name)}`),
    create: (data: PromptTemplateCreate) =>
      request<{ data: PromptTemplate }>("/api/v1/prompts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (name: string, data: PromptTemplateUpdate) =>
      request<{ data: PromptTemplate }>(`/api/v1/prompts/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    reload: () =>
      request<{ data: PromptTemplate[]; total: number }>("/api/v1/prompts/reload", {
        method: "POST",
      }),
    versions: (name: string) =>
      request<{ data: PromptVersion[]; total: number }>(`/api/v1/prompts/${encodeURIComponent(name)}/versions`),
    activate: (name: string, version: number, reason = "") =>
      request<{ data: PromptTemplate }>(`/api/v1/prompts/${encodeURIComponent(name)}/versions/${version}/activate`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    stats: () =>
      request<{ data: PromptStats }>("/api/v1/prompts/stats"),
  },
  health: () =>
    request<HealthStatus>("/health"),
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
  error_message: string;
  metadata_: Record<string, unknown>;
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
  display_name: string;
  description: string;
  version: string;
  category: string;
  trigger: string[];
  inputs: string[];
  outputs: string[];
  tools: string[];
  required_tools: string[];
  permissions: Record<string, boolean>;
  risk_level: string;
  requires_approval: boolean;
  is_enabled: boolean;
  author: string;
  source: string;
  config_path: string;
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
  metadata_: Record<string, unknown>;
  latency_ms: number;
  cost: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  name: string;
  display_name?: string;
  category?: string;
  description?: string;
  risk_level?: string;
  permission_level?: string;
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
  status: EvaluationStatus;
  review_note: string;
  metadata_: EvaluationMetadata;
  created_at: string;
  updated_at: string;
}

export type EvaluationStatus = "pending" | "pass" | "fail" | "needs_revision" | "accepted";

export interface EvaluationUpdate {
  status?: EvaluationStatus;
  review_note?: string;
}

export interface EvaluationDimension {
  name: string;
  score: number;
  reason?: string;
}

export interface EvaluationMetadata {
  mode?: string;
  provider?: string;
  model?: string;
  strengths?: string[];
  weaknesses?: string[];
  action_items?: string[];
  dimensions?: EvaluationDimension[];
  [key: string]: unknown;
}

export interface Output {
  id: string;
  project_id: string;
  agent_run_id: string | null;
  output_type: string;
  title: string;
  content: string;
  content_type: string;
  language: string;
  file_name: string;
  version: number;
  created_by_agent: string;
  status: string;
  metadata_: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OutputCreate {
  output_type?: string;
  title: string;
  content?: string;
  content_type?: string;
  language?: string;
  file_name?: string;
  created_by_agent?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface OutputUpdate {
  title?: string;
  content?: string;
  output_type?: string;
  content_type?: string;
  language?: string;
  file_name?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export type OutputExportFormat = "markdown";

export interface OutputExportOptions {
  format?: OutputExportFormat;
}

export interface OutputExportFile {
  blob: Blob;
  filename: string;
  contentType: string;
}

export interface ProviderRuntimeStatus {
  provider: string;
  model: string;
  active_provider: string;
  active_model: string;
  mode: string;
  configured: boolean;
  required_env_vars: string[];
  missing_env_vars: string[];
  fallback_reason: string | null;
  supports_custom_base_url: boolean;
  base_url_custom: boolean;
}

export interface ProviderStatus {
  llm: ProviderRuntimeStatus;
  embedding: ProviderRuntimeStatus;
  llm_provider: string;
  llm_model: string;
  llm_mode: string;
  llm_configured: boolean;
  embedding_provider: string;
  embedding_model: string;
  embedding_mode: string;
  embedding_configured: boolean;
}

export interface ApiDiagnostic {
  ok: boolean;
  status: string;
  version: string;
  environment: string;
  host: string;
  port: number;
  message: string;
}

export interface ServiceDiagnostic {
  ok: boolean;
  status: string;
  message: string;
  url?: string;
}

export interface StorageDiagnostic {
  ok: boolean;
  status: string;
  message: string;
  backend: string;
  upload_dir: string;
}

export interface CorsDiagnostic {
  origins: string[];
  allow_credentials: boolean;
}

export interface RuntimeStatus {
  status: string;
  api: ApiDiagnostic;
  database: ServiceDiagnostic;
  redis: ServiceDiagnostic;
  storage: StorageDiagnostic;
  provider: ProviderStatus;
  llm: ProviderRuntimeStatus;
  embedding: ProviderRuntimeStatus;
  cors: CorsDiagnostic;
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

export interface WorkflowNodeState {
  stage_id: string;
  label: string;
  agent: string;
  skill: string;
  order: number;
  status: string;
  run_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  latency_ms: number;
  error_message: string;
  output_summary: string;
}

export interface WorkflowRunSummary {
  id: string;
  stage_id: string;
  agent_name: string;
  selected_skill: string;
  intent: string;
  output_type: string;
  status: string;
  latency_ms: number;
  output_summary: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStatus {
  project_id: string;
  nodes: WorkflowNodeState[];
  current_stage: string;
  status: string;
  progress: number;
  recent_run: WorkflowRunSummary | null;
  failed_nodes: WorkflowNodeState[];
  next_stage: string | null;
  next_suggestion: string;
}

export interface DashboardStats {
  project_count: number;
  active_project_count: number;
  agent_run_count: number;
  output_count: number;
  document_count: number;
  memory_count: number;
  eval_count: number;
  avg_score: number;
  recent_agent_runs: Array<{
    id: string;
    agent_name: string;
    selected_skill: string;
    status: string;
    created_at: string | null;
  }>;
  recent_outputs: Array<{
    id: string;
    title: string;
    output_type: string;
    created_at: string | null;
  }>;
}

export interface HealthStatus extends RuntimeStatus {
  version: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  content: string;
  category: string;
  variables: string[];
  version: number;
  is_active: boolean;
  source: string;
  source_path: string;
  content_checksum: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateCreate {
  name: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface PromptTemplateUpdate {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  activate?: boolean;
}

export interface PromptVersion {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  variables: string[];
  version: number;
  is_active: boolean;
  source: string;
  source_path: string;
  content_checksum: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PromptStats {
  total: number;
  active: number;
  total_versions: number;
  categories: Record<string, number>;
  total_variables: number;
}
