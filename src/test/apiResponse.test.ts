import { describe, it, expect } from 'vitest'
import { unwrap, errorMessage } from '@/lib/apiResponse'
import axios from 'axios'

describe('lib/apiResponse.ts', () => {
  it('unwrap bóc tách data khi response thành công', () => {
    const res = { success: true, data: { balance: '1000' } }
    expect(unwrap(res)).toEqual({ balance: '1000' })
  })

  it('unwrap ném lỗi khi success=false', () => {
    const res = { success: false, error: { code: 'ERR', message: 'Lỗi máy chủ' } }
    expect(() => unwrap(res)).toThrow('Lỗi máy chủ')
  })

  it('errorMessage ánh xạ mã lỗi backend sang tiếng Việt', () => {
    const axiosError = new axios.AxiosError('Bad Request')
    axiosError.response = {
      status: 423,
      statusText: 'Locked',
      headers: {},
      config: {} as unknown as import('axios').InternalAxiosRequestConfig,
      data: {
        success: false,
        error: { code: 'PIN_LOCKED', message: 'PIN locked' }
      }
    }

    expect(errorMessage(axiosError)).toBe(
      'Mã PIN đã bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.'
    )
  })

  it('errorMessage xử lý các mã HTTP chuẩn khi không có code cụ thể', () => {
    const error404 = new axios.AxiosError('Not Found')
    error404.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as unknown as import('axios').InternalAxiosRequestConfig,
      data: {}
    }
    expect(errorMessage(error404)).toBe('Không tìm thấy dữ liệu yêu cầu.')
  })
})
