import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { PropsWithChildren } from 'react'
import { server } from '@/mocks/server'
import { isValidMoneyInput, normalizeVnd, parseVndToBigInt } from '@/lib/money'
import { errorMessage } from '@/lib/apiResponse'
import {
  fundingApi,
  fundingKeys,
  useCashOutFlow,
  isTopupTerminal,
  isCashOutTerminal,
  useTopupStatus,
} from '@/features/funding'
import { fundingError } from '@/features/funding/api/funding.errors'
import { topupInputSchema } from '@/features/funding/schemas/topup.schema'
import { cashoutInputSchema } from '@/features/funding/schemas/cashout.schema'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
const id = '20000000-0000-4000-8000-000000000001'
const testUser = { ...MOCK_USER, id: '10000000-0000-4000-8000-000000000001' }
const order = {
  id,
  userId: testUser.id,
  amount: '9007199254740993',
  destination: null,
  status: 'REQUESTED' as const,
  failureReason: null,
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({
    user: testUser,
    accessToken: 'synthetic',
    initialized: true,
  })
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  useAuthStore.getState().clearState()
})
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)
describe('Funding money and server status contract', () => {
  it('preserves amounts beyond SafeInteger and rejects float, exponent, punctuation and numbers', () => {
    expect(parseVndToBigInt('9007199254740993')).toBe(9007199254740993n)
    expect(normalizeVnd('9007199254740993.00')).toBe('9007199254740993')
    for (const value of [
      '1e6',
      '1.5',
      '-1',
      '+1',
      ' 10000',
      '10,000',
      '001',
      '1000000000000000000',
      10000,
    ])
      expect(isValidMoneyInput(value)).toBe(false)
    expect(() => normalizeVnd('10.01')).toThrow()
    expect(topupInputSchema.safeParse({ amount: '9999' }).success).toBe(false)
    expect(topupInputSchema.safeParse({ amount: '100000001' }).success).toBe(
      false,
    )
    expect(
      cashoutInputSchema.safeParse({ amount: '999999999999999999' }).success,
    ).toBe(true)
    expect(cashoutInputSchema.safeParse({ amount: '0' }).success).toBe(false)
  })
  it('only treats explicit backend terminal states as terminal', () => {
    expect(isTopupTerminal('PROCESSING')).toBe(false)
    expect(isTopupTerminal('EXPIRED')).toBe(true)
    expect(isCashOutTerminal('PAYOUT_PENDING')).toBe(false)
    expect(isCashOutTerminal('SUCCEEDED')).toBe(true)
    expect(fundingKeys.cashout('A', id)).not.toEqual(
      fundingKeys.cashout('B', id),
    )
  })
  it('live adapter uses string money and an explicit idempotency header', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    const key = crypto.randomUUID()
    server.use(
      http.post('*/payments/topups', async ({ request }) => {
        expect(await request.json()).toEqual({ amount: '10000' })
        expect(request.headers.get('Idempotency-Key')).toBe(key)
        return HttpResponse.json({
          success: true,
          data: {
            topupId: id,
            paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          },
        })
      }),
    )
    expect((await fundingApi.createTopup('10000', key)).topupId).toBe(id)
  })
  it('decodes Decimal strings and strips unrelated sensitive fields from cached status', async () => {
    server.use(
      http.get('*/payments/topups/:id', () =>
        HttpResponse.json({
          success: true,
          data: {
            id,
            code: 'NAP123',
            amount: '10000.00',
            status: 'PROCESSING',
            expiresAt: '2026-11-12T00:00:00Z',
            paymentUrl: 'secret',
          },
        }),
      ),
    )
    const result = await fundingApi.getTopup(id)
    expect(result.amount).toBe('10000')
    expect(result).not.toHaveProperty('paymentUrl')
  })
  it.each([400, 401, 403, 409, 422, 423, 429, 503])(
    'sanitizes HTTP %i and retains a safe request ID',
    async (status) => {
      const error = fundingError({
        isAxiosError: true,
        response: {
          status,
          data: {
            error: {
              code: 'SYNTHETIC_ERROR',
              message: 'private backend detail',
              traceId: 'trace-123',
            },
          },
        },
      })
      expect(error.requestId).toBe('trace-123')
      expect(errorMessage(error)).not.toContain('private backend detail')
      expect(error.outcomeUnknown).toBe(status >= 500)
    },
  )
})
describe('Funding polling budget', () => {
  it('stops polling a terminal response', async () => {
    vi.useFakeTimers()
    const read = vi
      .spyOn(fundingApi, 'getTopup')
      .mockResolvedValue({
        id,
        code: 'NAP123',
        amount: '10000',
        status: 'APPROVED',
        expiresAt: '2026-11-12T00:00:00Z',
      })
    try {
      renderHook(() => useTopupStatus(id), { wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(read).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
  it('stops after 24 pending reads without inventing EXPIRED', async () => {
    vi.useFakeTimers()
    const read = vi
      .spyOn(fundingApi, 'getTopup')
      .mockResolvedValue({
        id,
        code: 'NAP123',
        amount: '10000',
        status: 'PROCESSING',
        expiresAt: '2020-01-01T00:00:00Z',
      })
    try {
      const { result } = renderHook(() => useTopupStatus(id), { wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(180000)
      })
      expect(read).toHaveBeenCalledTimes(24)
      expect(result.current.data?.status).toBe('PROCESSING')
    } finally {
      vi.useRealTimers()
    }
  })
})
describe('Cashout recovery (MSW, not live acceptance)', () => {
  it('reuses the key and exact string payload after a network failure', async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post('*/funding/cash-out', async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        expect(await request.json()).toEqual({ amount: order.amount })
        return keys.length === 1
          ? HttpResponse.error()
          : HttpResponse.json({ success: true, data: order })
      }),
    )
    const { result } = renderHook(useCashOutFlow, { wrapper })
    await act(async () => {
      await expect(
        result.current.create({ amount: order.amount }),
      ).rejects.toMatchObject({ outcomeUnknown: true })
    })
    expect(result.current.phase).toBe('UNKNOWN')
    await act(async () => {
      await result.current.create({ amount: order.amount })
    })
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    await act(async () => {
      await expect(
        result.current.create({ amount: '10000' }),
      ).rejects.toMatchObject({ code: 'FUNDING_INTENT_CHANGED' })
    })
  })
  it('does not replay a one-time confirmation on 401; recovery only reads status and never caches token', async () => {
    let confirmations = 0
    let reads = 0
    const refresh = vi.spyOn(useAuthStore.getState(), 'refresh')
    server.use(
      http.post('*/funding/cash-out', () =>
        HttpResponse.json({ success: true, data: order }),
      ),
      http.post('*/funding/cash-out/:id/confirm', ({ request }) => {
        confirmations++
        expect(request.headers.get('X-Transaction-Token')).toBe(
          'synthetic-once',
        )
        return HttpResponse.json({ success: false }, { status: 401 })
      }),
      http.get('*/funding/cash-out/:id', () => {
        reads++
        return HttpResponse.json({
          success: true,
          data: { ...order, status: 'PAYOUT_PENDING' },
        })
      }),
    )
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(useCashOutFlow, { wrapper })
    await act(async () => {
      await result.current.create({ amount: order.amount })
    })
    await act(async () => {
      await expect(
        result.current.confirm('synthetic-once'),
      ).rejects.toBeDefined()
    })
    expect(result.current.phase).toBe('UNKNOWN')
    await act(async () => {
      await expect(
        result.current.confirm('synthetic-once'),
      ).rejects.toMatchObject({ code: 'FUNDING_RECONCILE_REQUIRED' })
      await result.current.reconcile()
    })
    expect(confirmations).toBe(1)
    expect(reads).toBe(2)
    expect(refresh).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('synthetic-once')
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['wallet', testUser.id],
    })
  })
  it('treats confirmation timeout as unknown and reconciles without replay', async () => {
    const create = vi
      .spyOn(fundingApi, 'createCashOut')
      .mockResolvedValue(order)
    const confirm = vi
      .spyOn(fundingApi, 'confirmCashOut')
      .mockRejectedValue(
        fundingError({ isAxiosError: true, code: 'ECONNABORTED' }),
      )
    const read = vi
      .spyOn(fundingApi, 'getCashOut')
      .mockResolvedValue({ ...order, status: 'SUCCEEDED' })
    const { result } = renderHook(useCashOutFlow, { wrapper })
    await act(async () => {
      await result.current.create({ amount: order.amount })
    })
    await act(async () => {
      await expect(
        result.current.confirm('synthetic-timeout-token'),
      ).rejects.toMatchObject({ code: 'FUNDING_TIMEOUT' })
    })
    expect(result.current.phase).toBe('UNKNOWN')
    await act(async () => {
      await result.current.reconcile()
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith(id)
    expect(
      client.getQueryData(fundingKeys.cashout(testUser.id, id)),
    ).toMatchObject({ status: 'SUCCEEDED' })
  })
  it('ignores a delayed create response after account switch', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('*/funding/cash-out', async () => {
        await pending
        return HttpResponse.json({ success: true, data: order })
      }),
    )
    const { result } = renderHook(useCashOutFlow, { wrapper })
    let request!: Promise<unknown>
    act(() => {
      request = result.current.create({ amount: order.amount })
    })
    act(() => {
      useAuthStore.setState({ user: { ...MOCK_USER, id } })
    })
    await act(async () => {
      release()
      await request
    })
    expect(
      client.getQueryData(fundingKeys.cashout(id, order.id)),
    ).toBeUndefined()
    expect(result.current.phase).toBe('IDLE')
  })
})
