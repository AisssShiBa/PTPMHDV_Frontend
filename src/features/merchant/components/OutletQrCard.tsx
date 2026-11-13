import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { errorMessage } from '@/lib/apiResponse'
import { merchantApi } from '../api/merchant.api'
import type { Outlet, OutletQr } from '../types/outlet.types'
export function OutletQrCard({
  merchantId,
  businessName,
  outlet,
  close,
}: {
  merchantId: string
  businessName: string
  outlet: Outlet
  close: () => void
}) {
  const [qr, setQr] = useState<OutletQr>()
  const [error, setError] = useState<string>()
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    void merchantApi
      .getQr(merchantId, outlet, controller.signal)
      .then((data) => {
        if (active.current) setQr(data)
      })
      .catch((reason) => {
        if (active.current) setError(errorMessage(reason))
      })
    return () => {
      active.current = false
      controller.abort()
    }
  }, [merchantId, outlet])
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogTitle>Mã QR điểm bán</DialogTitle>
        <DialogDescription>
          QR do máy chủ cấp cho điểm bán này. Đóng cửa sổ để xóa bản đang xem.
        </DialogDescription>
        {error && <p role="alert">{error}</p>}
        {!qr && !error && <p role="status">Đang lấy mã QR…</p>}
        {qr && (
          <>
            <section
              data-merchant-print
              className="flex flex-col items-center gap-4 rounded-xl border bg-white p-6 text-center text-black"
            >
              <h2 className="font-bold">{businessName}</h2>
              <p>
                {outlet.name} · {outlet.code}
              </p>
              <QRCodeSVG
                value={qr.token}
                size={240}
                marginSize={4}
                title="QR điểm bán do máy chủ cấp"
              />
              <p>Quét mã thanh toán FinVault</p>
            </section>
            <Button onClick={() => window.print()}>In QR điểm bán</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
