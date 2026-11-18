/**
 * Confirm a Web QR sign-in as a synthetic mobile client (task Đ19).
 * Set QR_USER and QR_PASSWORD to the credentials of the intended test account.
 * Usage: node scripts/qr-confirm.mjs <qrId> <nonce>
 *        node scripts/qr-confirm.mjs '{"qrId":"...","nonce":"..."}'
 * With no arguments, select the only PENDING session in local Docker Redis.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

function validPayload(value) {
  return value !== null && typeof value === 'object'
    && typeof value.qrId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.qrId)
    && typeof value.nonce === 'string' && /^[0-9a-f]{64}$/i.test(value.nonce)
}

function redisRead(...args) {
  const container = process.env.QR_REDIS_CONTAINER || 'backend-redis-1'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(container)) {
    throw new Error('Tên container Redis không hợp lệ.')
  }
  // Read the mounted secret inside the container; never expose it in host arguments.
  return execFileSync('docker', [
    'exec', container, 'sh', '-c',
    'export REDISCLI_AUTH="$(cat /run/secrets/redis_password)"; exec redis-cli --raw "$@"',
    'qr-confirm', ...args
  ], { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function findPendingQr() {
  const candidates = []
  try {
    const keys = redisRead('--scan', '--pattern', 'qr:*').split(/\r?\n/).filter(Boolean)
    for (const key of new Set(keys)) {
      const raw = redisRead('GET', key)
      if (!raw) continue
      let session
      try { session = JSON.parse(raw) } catch { continue }
      const payload = { qrId: key.slice(3), nonce: session?.nonce }
      if (session?.status === 'PENDING' && validPayload(payload)) candidates.push(payload)
    }
  } catch {
    throw new Error('Không đọc được Redis. Kiểm tra Docker hoặc truyền trực tiếp qrId và nonce từ Web.')
  }
  if (candidates.length > 1) {
    throw new Error('Có nhiều phiên QR chờ duyệt. Hãy truyền đúng qrId và nonce của cửa sổ Web cần đăng nhập.')
  }
  if (!candidates.length) throw new Error('Không có phiên QR chờ duyệt. Mở mã QR mới trên Web rồi thử lại.')
  return candidates[0]
}

function getQrPayload(args) {
  if (!args.length) return findPendingQr()
  let payload
  if (args.length === 1) {
    try { payload = JSON.parse(args[0]) } catch {
      throw new Error('JSON không hợp lệ. Dùng: node scripts/qr-confirm.mjs <qrId> <nonce>')
    }
  } else if (args.length === 2) {
    payload = { qrId: args[0], nonce: args[1] }
  }
  if (!validPayload(payload)) {
    throw new Error('Cần đúng qrId dạng UUID và nonce 64 ký tự hex từ response tạo QR trên Web.')
  }
  return { qrId: payload.qrId, nonce: payload.nonce }
}

async function post(apiBase, path, body, token) {
  let response
  try {
    response = await fetch(apiBase + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': 'mobile',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    })
  } catch {
    throw new Error('Không nhận được phản hồi API. Kiểm tra Gateway; nếu đã gửi xác nhận, xem trạng thái Web trước khi thử lại.')
  }
  let result
  try { result = await response.json() } catch {
    throw new Error('API không trả JSON hợp lệ. Kiểm tra Gateway và trạng thái trên Web.')
  }
  if (!response.ok || result?.success !== true) {
    const code = result?.error?.code
    const label = typeof code === 'string' && /^[A-Z0-9_]{1,100}$/.test(code)
      ? code : 'HTTP_' + response.status
    throw new Error('Yêu cầu ' + path + ' không thành công (' + label + ').')
  }
  return result.data
}

export async function main(args = process.argv.slice(2)) {
  const username = process.env.QR_USER || 'an@demo.vn'
  const password = process.env.QR_PASSWORD
  if (!password) throw new Error('Chưa có QR_PASSWORD. Đặt mật khẩu tài khoản seed qua biến môi trường trước khi chạy.')
  let url
  try { url = new URL(process.env.API_BASE_URL || 'http://localhost:3000/api') } catch {
    throw new Error('API_BASE_URL không hợp lệ.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API_BASE_URL phải là URL HTTP/HTTPS, không kèm thông tin đăng nhập hoặc query/hash.')
  }
  const apiBase = url.href.replace(/\/+$/, '')
  const payload = getQrPayload(args)
  console.log('Đang đăng nhập tài khoản thử nghiệm theo kiểu mobile...')
  const session = await post(apiBase, '/auth/signin', { username, password, platform: 'mobile' })
  if (typeof session?.accessToken !== 'string' || !session.accessToken) {
    throw new Error('Phản hồi đăng nhập không có accessToken hợp lệ.')
  }
  console.log('Đang xác nhận đúng phiên QR đã chọn...')
  await post(apiBase, '/auth/qr-login/confirm', payload, session.accessToken)
  console.log('Đã duyệt QR. Quay lại cửa sổ Web để kiểm tra đăng nhập ở lượt polling tiếp theo, thường khoảng 2 giây.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
