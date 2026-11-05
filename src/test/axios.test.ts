import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '@/lib/axios'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

describe('lib/axios.ts Interceptor', () => {
  beforeEach(() => {
    useAuthStore.getState().clearState()
  })

  it('gắn Authorization header khi có accessToken trong useAuthStore', async () => {
    useAuthStore.setState({
      accessToken: 'test_token_123',
      user: MOCK_USER
    })

    let capturedAuth: string | null = null
    server.use(
      http.get('*/api/test-auth-header', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ success: true, data: 'ok' })
      })
    )

    await api.get('/test-auth-header')
    expect(capturedAuth).toBe('Bearer test_token_123')
  })

  it('xóa Authorization header khi không có accessToken', async () => {
    useAuthStore.setState({
      accessToken: null,
      user: null
    })

    let capturedAuth: string | null = null
    server.use(
      http.get('*/api/test-no-auth', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ success: true, data: 'ok' })
      })
    )

    await api.get('/test-no-auth')
    expect(capturedAuth).toBeNull()
  })

  it('từ chối và không refresh khi gặp lỗi 403 (Forbidden)', async () => {
    let refreshCalled = false
    useAuthStore.setState({
      accessToken: 'token_403',
      user: MOCK_USER,
      refresh: async () => {
        refreshCalled = true
        return true
      }
    })

    server.use(
      http.get('*/api/test-403', () => {
        return HttpResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No access' } }, { status: 403 })
      })
    )

    await expect(api.get('/test-403')).rejects.toThrow()
    expect(refreshCalled).toBe(false)
  })

  it('không replay request của tài khoản cũ bằng token của tài khoản mới', async () => {
    useAuthStore.setState({
      accessToken: 'old_token',
      user: { ...MOCK_USER, id: 'user_old' }
    })

    server.use(
      http.get('*/api/test-cross-account', () => {
        // Giả lập tài khoản bị đổi sang người khác trong lúc request 401
        useAuthStore.setState({
          accessToken: 'new_token',
          user: { ...MOCK_USER, id: 'user_new' }
        })
        return HttpResponse.json({ success: false }, { status: 401 })
      })
    )

    await expect(api.get('/test-cross-account')).rejects.toThrow()
  })
})
