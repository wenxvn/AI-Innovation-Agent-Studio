'use client'

import type { ComponentType } from 'react'
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  PlugZap,
  RefreshCw,
  Route,
  Server,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProviderRuntimeStatus, RuntimeStatus } from '@/lib/api-client'

type BadgeVariant = 'success' | 'destructive' | 'warning' | 'info' | 'secondary'

function serviceVariant(ok?: boolean): BadgeVariant {
  if (ok === true) return 'success'
  if (ok === false) return 'destructive'
  return 'secondary'
}

function serviceLabel(status?: string) {
  if (!status) return '检测中'
  if (status === 'connected') return 'connected'
  if (status === 'disconnected') return 'disconnected'
  if (status === 'available') return 'available'
  if (status === 'unavailable') return 'unavailable'
  if (status === 'online') return 'online'
  return status
}

function providerLabel(status?: ProviderRuntimeStatus) {
  if (!status) return '检测中'
  if (status.configured && status.mode === 'real') return 'real'
  return 'mock'
}

function providerVariant(status?: ProviderRuntimeStatus): BadgeVariant {
  if (!status) return 'secondary'
  if (status.configured && status.mode === 'real') return 'success'
  if (status.missing_env_vars.length > 0) return 'destructive'
  return 'warning'
}

function providerDetail(status?: ProviderRuntimeStatus) {
  if (!status) return '等待运行时状态'
  const target = `${status.provider}/${status.model}`
  const active = `${status.active_provider}/${status.active_model}`
  if (status.configured && status.mode === 'real') return active
  if (status.missing_env_vars.length > 0) return `${active}，缺少 ${status.missing_env_vars.join(', ')}`
  if (active !== target) return `${active}，目标 ${target}`
  return active
}

function buildFixes(runtime?: RuntimeStatus, isError?: boolean) {
  if (isError || !runtime) {
    return [
      '确认 API 已启动并能访问 http://localhost:8000/health。',
      '确认 NEXT_PUBLIC_API_BASE_URL 指向实际 API 端口。',
      '如果前端使用了 3001、3002 或 5173 等端口，把该 origin 加入 CORS_ORIGINS。',
    ]
  }

  const fixes: string[] = []
  if (!runtime.database.ok) {
    fixes.push('检查 DATABASE_URL，或先运行 docker compose up -d 启动本地数据库。')
  }
  if (!runtime.redis.ok) {
    fixes.push('Redis 未连接时同步本地开发仍可运行；需要队列能力时启动 Redis。')
  }
  if (!runtime.storage.ok) {
    fixes.push('确认 STORAGE_BACKEND 和 UPLOAD_DIR 配置正确，且上传目录可写。')
  }

  const missingProviderVars = Array.from(
    new Set([...runtime.llm.missing_env_vars, ...runtime.embedding.missing_env_vars]),
  )
  if (missingProviderVars.length > 0) {
    fixes.push(`设置 ${missingProviderVars.join(', ')} 可切换到真实 provider；缺失时会使用 mock fallback。`)
  }
  if (runtime.llm.mode === 'mock' && runtime.embedding.mode === 'mock' && missingProviderVars.length === 0) {
    fixes.push('LLM_PROVIDER 或 EMBEDDING_PROVIDER 设为 mock 时会保留演示模式。')
  }
  if (runtime.cors.origins.length === 0) {
    fixes.push('CORS_ORIGINS 为空时浏览器会拦截跨端口请求，请至少配置前端 origin。')
  }

  return fixes.length ? fixes : ['连接诊断正常；如页面仍卡住，请刷新数据或检查浏览器控制台网络请求。']
}

function StatusRow({
  icon: Icon,
  label,
  value,
  detail,
  variant,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
  variant: BadgeVariant
}) {
  return (
    <div className="flex min-h-[72px] items-start gap-3 border-b border-border/50 p-4 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#002FA7]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant={variant}>{value}</Badge>
        </div>
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function RuntimeDiagnosticsCard({
  runtime,
  isLoading,
  isFetching,
  isError,
  onRefresh,
}: {
  runtime?: RuntimeStatus
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  onRefresh?: () => void
}) {
  const fixes = buildFixes(runtime, isError)
  const apiOk = runtime?.api.ok ?? (isError ? false : undefined)

  return (
    <Card className="rounded-lg border-[#D7DADF] bg-white shadow-none">
      <CardHeader className="border-b border-[#D7DADF] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlugZap className="h-4 w-4 text-[#002FA7]" />
              连接诊断
            </CardTitle>
            <CardDescription>API、数据服务、存储和 provider 当前状态</CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              刷新
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#002FA7]" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2">
              <StatusRow
                icon={Server}
                label="API"
                value={apiOk === false ? 'offline' : serviceLabel(runtime?.api.status)}
                detail={runtime ? `v${runtime.api.version} · ${runtime.api.environment} · ${runtime.api.host}:${runtime.api.port}` : '无法连接到 API'}
                variant={serviceVariant(apiOk)}
              />
              <StatusRow
                icon={Database}
                label="DB"
                value={serviceLabel(runtime?.database.status)}
                detail={runtime?.database.url || runtime?.database.message || '等待数据库状态'}
                variant={serviceVariant(runtime?.database.ok)}
              />
              <StatusRow
                icon={Route}
                label="Redis"
                value={serviceLabel(runtime?.redis.status)}
                detail={runtime?.redis.url || runtime?.redis.message || '等待 Redis 状态'}
                variant={serviceVariant(runtime?.redis.ok)}
              />
              <StatusRow
                icon={HardDrive}
                label="Storage"
                value={serviceLabel(runtime?.storage.status)}
                detail={runtime ? `${runtime.storage.backend} · ${runtime.storage.upload_dir}` : '等待存储状态'}
                variant={serviceVariant(runtime?.storage.ok)}
              />
              <StatusRow
                icon={Brain}
                label="LLM"
                value={providerLabel(runtime?.llm)}
                detail={providerDetail(runtime?.llm)}
                variant={providerVariant(runtime?.llm)}
              />
              <StatusRow
                icon={CheckCircle2}
                label="Embedding"
                value={providerLabel(runtime?.embedding)}
                detail={providerDetail(runtime?.embedding)}
                variant={providerVariant(runtime?.embedding)}
              />
            </div>

            <div className="border-t border-[#D7DADF] p-4">
              <div className="flex items-start gap-3">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-[#002FA7]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">CORS origins</p>
                  <p className="mt-1 break-words font-mono text-xs leading-5 text-muted-foreground">
                    {runtime?.cors.origins.length ? runtime.cors.origins.join(', ') : '未获取到 CORS 配置'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D7DADF] bg-[#F7F7F8] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">常见修复建议</p>
                  <div className="mt-2 space-y-1.5">
                    {fixes.map((fix) => (
                      <p key={fix} className="text-xs leading-5 text-[#5C6674]">
                        {fix}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
