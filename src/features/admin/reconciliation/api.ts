import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type {
  AdjustAnomalyPayload,
  AdjustAnomalyResult,
  ReconciliationReport,
  ReconciliationReportPage,
  ReconciliationRunMode
} from './types'

/** Endpoint thật của admin-service: /api/admin/reconciliation/... */
export const reconciliationApi = {
  /** POST /api/admin/reconciliation/run?mode=quick|full */
  async run(
    mode: ReconciliationRunMode,
    signal?: AbortSignal
  ): Promise<ReconciliationReport> {
    const res = await api.post<ApiResponse<ReconciliationReport>>('/admin/reconciliation/run', null, {
      params: { mode },
      signal
    })
    return unwrap(res.data)
  },

  /** GET /api/admin/reconciliation/reports?page&limit */
  async listReports(
    page: number,
    limit: number,
    signal?: AbortSignal
  ): Promise<ReconciliationReportPage> {
    const res = await api.get<ApiResponse<ReconciliationReportPage>>(
      '/admin/reconciliation/reports',
      { params: { page, limit }, signal }
    )
    return unwrap(res.data)
  },

  /** GET /api/admin/reconciliation/reports/:id */
  async getReport(id: number, signal?: AbortSignal): Promise<ReconciliationReport> {
    const res = await api.get<ApiResponse<ReconciliationReport>>(
      `/admin/reconciliation/reports/${id}`,
      { signal }
    )
    return unwrap(res.data)
  },

  /**
   * POST /api/admin/reconciliation/anomalies/:id/adjust
   * Backend tự sinh referenceId cố định theo anomaly và dedupe ở wallet-service;
   * route không nhận header Idempotency-Key nên FE không gửi header ngoài contract.
   */
  async adjustAnomaly(
    anomalyId: string,
    payload: AdjustAnomalyPayload,
    signal?: AbortSignal
  ): Promise<AdjustAnomalyResult> {
    const res = await api.post<ApiResponse<AdjustAnomalyResult>>(
      `/admin/reconciliation/anomalies/${encodeURIComponent(anomalyId)}/adjust`,
      payload,
      { signal }
    )
    return unwrap(res.data)
  }
}
