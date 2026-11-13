/**
 * scripts/qr-confirm.mjs
 * Giả lập ứng dụng di động quét mã QR và xác nhận đăng nhập (Nhiệm vụ Đ19).
 * 
 * Cách dùng:
 * 1. Tự động phát hiện mã QR đang mở trên Web:
 *    node scripts/qr-confirm.mjs
 * 
 * 2. Hoặc truyền tham số qrId và nonce:
 *    node scripts/qr-confirm.mjs <qrId> <nonce>
 *    node scripts/qr-confirm.mjs '{"qrId":"...","nonce":"..."}'
 */

import { execSync } from 'node:child_process'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api'
const REDIS_PASS = '74fedb0ab8ba5369af8e4d4c9b4f9458ba35a2b8faf06ff15a707386b6521cb5'
const USERNAME = process.env.QR_USER || 'an@demo.vn'
const PASSWORD = process.env.QR_PASSWORD || '123456'

async function getQrPayload() {
  const args = process.argv.slice(2)

  // 1. Nếu truyền 1 chuỗi JSON: {"qrId":"...","nonce":"..."}
  if (args.length === 1 && args[0].startsWith('{')) {
    try {
      const parsed = JSON.parse(args[0])
      if (parsed.qrId && parsed.nonce) {
        return { qrId: parsed.qrId, nonce: parsed.nonce }
      }
    } catch {
      console.error('❌ Lỗi: Tham số JSON không hợp lệ.')
    }
  }

  // 2. Nếu truyền 2 tham số riêng biệt: <qrId> <nonce>
  if (args.length >= 2) {
    return { qrId: args[0], nonce: args[1] }
  }

  // 3. Nếu không truyền tham số: Tự động tìm phiên PENDING mới nhất trong Docker Redis
  console.log('🔍 Không có tham số, đang tự động quét phiên QR đang mở trên màn hình...')
  try {
    const rawKeys = execSync(
      `docker exec backend-redis-1 redis-cli -a ${REDIS_PASS} keys "qr:*" 2>nul`,
      { encoding: 'utf-8' }
    )
    const keys = rawKeys.split('\n').map((k) => k.trim()).filter((k) => k.startsWith('qr:'))

    for (const key of keys) {
      const rawVal = execSync(
        `docker exec backend-redis-1 redis-cli -a ${REDIS_PASS} get "${key}" 2>nul`,
        { encoding: 'utf-8' }
      )
      const dataStr = rawVal.trim().split('\n').pop()
      if (dataStr && dataStr.startsWith('{')) {
        const session = JSON.parse(dataStr)
        if (session.status === 'PENDING' && session.nonce) {
          const qrId = key.replace('qr:', '')
          console.log(`✨ Đã tìm thấy phiên QR đang chờ duyệt: ${qrId}`)
          return { qrId, nonce: session.nonce }
        }
      }
    }
  } catch (err) {
    // Bỏ qua lỗi Docker nếu không gọi được exec
  }

  return null
}

async function main() {
  console.log('📱 [FinVault Mobile Simulator] Khởi động trình duyệt xác nhận QR...\n')

  const qrPayload = await getQrPayload()
  if (!qrPayload) {
    console.error('❌ Không tìm thấy mã QR nào đang mở trên Web.')
    console.error('👉 Vui lòng mở tab [Mã QR] tại http://localhost:5173/sign-in (hoặc trang http://localhost:5173/qr-login) trên trình duyệt trước, sau đó chạy lại lệnh này.')
    process.exit(1)
  }

  const { qrId, nonce } = qrPayload
  console.log(`🔑 Chuẩn bị xác thực mã QR:\n   • qrId: ${qrId}\n   • nonce: ${nonce.slice(0, 16)}...`)

  // Bước 1: Đăng nhập tài khoản trên ứng dụng di động để lấy Access Token
  console.log(`\n1️⃣ Đang đăng nhập tài khoản di động (${USERNAME})...`)
  const loginRes = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  })

  const loginJson = await loginRes.json()
  if (!loginJson.success || !loginJson.data?.accessToken) {
    console.error('❌ Đăng nhập di động thất bại:', loginJson.error?.message || loginJson.message)
    process.exit(1)
  }

  const mobileToken = loginJson.data.accessToken
  const user = loginJson.data.user
  console.log(`   ✔️ Đăng nhập di động thành công: ${user.firstName || ''} ${user.lastName || ''} (@${user.username})`)

  // Bước 2: Điện thoại gửi lệnh xác nhận duyệt phiên QR
  console.log('\n2️⃣ Điện thoại bấm [Xác nhận đăng nhập trên máy tính]...')
  const confirmRes = await fetch(`${API_BASE}/auth/qr-login/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mobileToken}`
    },
    body: JSON.stringify({ qrId, nonce })
  })

  const confirmJson = await confirmRes.json()
  if (!confirmJson.success) {
    console.error('❌ Xác nhận đăng nhập QR thất bại:', confirmJson.error?.message || confirmJson.message)
    process.exit(1)
  }

  console.log('   🎉 PHÊ DUYỆT THÀNH CÔNG!')
  console.log(`   🚀 Màn hình Web tại http://localhost:5173/sign-in (hoặc /qr-login) sẽ lập tức đăng nhập vào Dashboard của @${user.username}!\n`)
}

main().catch((err) => {
  console.error('💥 Đã xảy ra lỗi:', err.message)
  process.exit(1)
})

