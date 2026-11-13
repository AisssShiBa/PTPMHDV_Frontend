import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reconciliationApi } from './api'
import type {
  AdjustAnomalyPayload,
  AdjustAnomalyResult,
  ReconciliationReport,
  ReconciliationReportPage,
  ReconciliationRunMode
} from './types'

export const reconciliationKeys = {
  all: ['admin', 'reconciliation'] as const,
  reports: () => [...reconciliationKeys.all, 'reports'] as const,
  reportList: (page: number, limit: number) =>
    [...reconciliationKeys.reports(), 'list', { page, limit }] as const,
  report: (id: number) => [...reconciliationKeys.reports(), 'detail', id] as const
}

/** GET /api/admin/reconciliation/reports */
export function useReconciliationReports(page: number, limit: number) {
  return useQuery<ReconciliationReportPage, Error>({
    queryKey: reconciliationKeys.reportList(page, limit),
    queryFn: ({ signal }) => reconciliationApi.listReports(page, limit, signal),
    staleTime: 10_000
  })
}

/** GET /api/admin/reconciliation/reports/:id */
export function useReconciliationReport(id: number | null) {
  return useQuery<ReconciliationReport, Error>({
    queryKey: reconciliationKeys.report(id ?? 0),
    queryFn: ({ signal }) => reconciliationApi.getReport(id as number, signal),
    enabled: id !== null,
    staleTime: 0
  })
}

/** POST /api/admin/reconciliation/run?mode=quick|full */
export function useRunReconciliation() {
  const queryClient = useQueryClient()
  return useMutation<ReconciliationReport, Error, ReconciliationRunMode>({
    mutationFn: (mode) => reconciliationApi.run(mode),
    onSuccess: (report) => {
      queryClient.setQueryData(reconciliationKeys.report(report.id), report)
      return queryClient.invalidateQueries({ queryKey: reconciliationKeys.reports() })
    }
  })
}

/** POST /api/admin/reconciliation/anomalies/:id/adjust */
export function useAdjustAnomaly() {
  const queryClient = useQueryClient()
  return useMutation<AdjustAnomalyResult, Error, { anomalyId: string; payload: AdjustAnomalyPayload }>({
    mutationFn: ({ anomalyId, payload }) => reconciliationApi.adjustAnomaly(anomalyId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reconciliationKeys.all })
  })
}
