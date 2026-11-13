import { OutletList } from './OutletList'
import { ApiKeyManager } from './ApiKeyManager'
import type { MerchantRecord } from '../types/merchant.types'
export function MerchantTools({
  owner,
  merchant,
}: {
  owner: string
  merchant: MerchantRecord
}) {
  return (
    <div className="space-y-6">
      {merchant.status === 'APPROVED' && (
        <OutletList
          owner={owner}
          merchantId={merchant.id}
          businessName={merchant.businessName}
        />
      )}
      <ApiKeyManager
        merchantId={merchant.id}
        approved={merchant.status === 'APPROVED'}
      />
    </div>
  )
}
