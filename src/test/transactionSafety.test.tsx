import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PinModal } from '@/features/auth/components/PinModal'
import { authApi } from '@/features/auth/api/auth.api'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import { TopupResultPanel } from '@/features/payment'
import { fundingApi } from '@/features/funding'

let client: QueryClient
const id = '20000000-0000-4000-8000-000000000001'
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ user: MOCK_USER, accessToken: 'synthetic', initialized: true })
})
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().clearState(); vi.restoreAllMocks() })
const enterPin = () => { for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: '1' })) }

describe('Transaction PIN', () => {
  it('cannot issue a fake token when the caller has no bound order', async () => {
    const verify = vi.spyOn(authApi, 'verifyPin')
    const success = vi.fn()
    render(<PinModal open onSuccess={success} />)
    enterPin()
    expect(await screen.findByText('Giao dịch chưa sẵn sàng để xác thực mã PIN.')).toBeInTheDocument()
    expect(verify).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })
  it('uses the real API adapter with the exact order and amount', async () => {
    const verify = vi.spyOn(authApi, 'verifyPin').mockResolvedValue({ transactionToken: 'synthetic-token', expiresIn: 60 })
    const success = vi.fn()
    render(<PinModal open paymentId={id} amount="100000" onSuccess={success} />)
    enterPin()
    await waitFor(() => expect(success).toHaveBeenCalledWith('synthetic-token'))
    expect(verify).toHaveBeenCalledTimes(1)
    expect(verify).toHaveBeenCalledWith({ pin: '111111', paymentId: id, amount: '100000' })
  })
  it('does not deliver a delayed token after the modal is closed', async () => {
    let release: ((value: { transactionToken: string; expiresIn: number }) => void) | undefined
    const pending = new Promise<{ transactionToken: string; expiresIn: number }>((resolve) => { release = resolve })
    vi.spyOn(authApi, 'verifyPin').mockReturnValue(pending)
    const success = vi.fn()
    const view = render(<PinModal open paymentId={id} amount="100000" onSuccess={success} />)
    enterPin()
    view.rerender(<PinModal open={false} paymentId={id} amount="100000" onSuccess={success} />)
    await act(async () => { release?.({ transactionToken: 'late-synthetic-token', expiresIn: 60 }); await pending })
    expect(success).not.toHaveBeenCalled()
  })
})

describe('VNPAY return', () => {
  beforeEach(() => { vi.spyOn(fundingApi, 'getTopups').mockResolvedValue([]) })
  it('does not treat a fake success return or vnp_TxnRef as a topup UUID', () => {
    const status = vi.spyOn(fundingApi, 'getTopup')
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/?vnp_ResponseCode=00&vnp_TxnRef=NAP123']}><TopupResultPanel /></MemoryRouter></QueryClientProvider>)
    expect(screen.getByRole('heading', { name: 'Chưa xác nhận kết quả' })).toBeInTheDocument()
    expect(status).not.toHaveBeenCalled()
  })
  it('stays pending until the backend confirms APPROVED', async () => {
    const status = vi.spyOn(fundingApi, 'getTopup')
      .mockResolvedValueOnce({ id, code: 'NAP123', amount: '100000', status: 'PROCESSING', expiresAt: '2026-11-12T23:00:00Z' })
      .mockResolvedValue({ id, code: 'NAP123', amount: '100000', status: 'APPROVED', expiresAt: '2026-11-12T23:00:00Z' })
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/?topupId=' + id + '&vnp_ResponseCode=00']}><TopupResultPanel /></MemoryRouter></QueryClientProvider>)
    await waitFor(() => expect(status).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toBeEnabled())
    expect(screen.queryByRole('heading', { name: 'Nạp tiền thành công' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))
    expect(await screen.findByRole('heading', { name: 'Nạp tiền thành công' })).toBeInTheDocument()
  })
})
