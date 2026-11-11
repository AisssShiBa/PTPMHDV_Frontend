// Feature: admin — the only public entry point for this feature.
export { AdminDashboard } from './components/AdminDashboard'
export { AdminKycManager } from './components/AdminKycManager'
export { AdminTopupManager } from './components/AdminTopupManager'
export { AdminKycDocumentsViewer } from './components/AdminKycDocumentsViewer'
export { adminApi } from './api/admin.api'
export {
  adminKeys,
  useAdminDashboard,
  useAdminKycList,
  useKycDocuments,
  useReviewKyc,
  useChangeKycTier,
  useAdminTopups,
  useApproveTopup,
  useRejectTopup
} from './api/admin.queries'
export type {
  AdminAuditActivity,
  AdminDashboardStats,
  AdminKycDocuments,
  AdminKycItem,
  AdminKycListParams,
  AdminKycPage,
  AdminTopup,
  AdminTopupStatus
} from './types/admin.types'
export { kycReviewSchema, kycTierSchema, topupRejectSchema } from './schemas/admin.schema'
