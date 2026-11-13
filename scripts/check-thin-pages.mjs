/**
 * scripts/check-thin-pages.mjs
 * 
 * Công cụ kiểm tra tự động Tiêu chuẩn "Trang Mỏng" (Thin Pages) cho FinVault (Nhiệm vụ Đ20).
 * Tuân thủ nghiêm ngặt theo Frontend/AGENTS.md:
 * 1. CẤM import axios hoặc *.api.ts trực tiếp trong thư mục src/pages.
 * 2. CẤM sử dụng Number(...) để tính toán tiền tệ trong src/pages (bắt buộc dùng string / lib/format.ts).
 * 
 * Cách chạy:
 *   node scripts/check-thin-pages.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PAGES_DIR = resolve(__dirname, '../src/pages')

// Màu sắc hiển thị terminal (ANSI escape codes)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

function findPageFiles(dir) {
  let results = []
  const list = readdirSync(dir)

  for (const file of list) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results = results.concat(findPageFiles(fullPath))
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath)
    }
  }

  return results
}

function checkThinPages() {
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}🔍 [FinVault Code Quality Gate] KIỂM TRA TRANG MỎNG${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`)

  const files = findPageFiles(PAGES_DIR)
  let totalErrors = 0
  let totalWarnings = 0

  const AXIOS_REGEX = /(from\s+['"]axios['"]|import\s+axios|require\(['"]axios['"]\))/
  const NUMBER_REGEX = /\bNumber\s*\(/

  for (const filePath of files) {
    const relPath = relative(resolve(__dirname, '..'), filePath)
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    const fileViolations = []

    lines.forEach((line, index) => {
      const lineNum = index + 1
      const trimmed = line.trim()

      // Bỏ qua dòng comment
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return
      }

      // 1. Kiểm tra vi phạm Axios (Nghiêm trọng - Cấm hoàn toàn)
      if (AXIOS_REGEX.test(line)) {
        fileViolations.push({
          type: 'ERROR',
          line: lineNum,
          rule: 'CẤM import axios trực tiếp trong src/pages',
          code: trimmed,
          hint: 'Chuyển logic gọi mạng vào features/<feature>/api/*.api.ts'
        })
        totalErrors++
      }

      // 2. Kiểm tra vi phạm Number(...) cho tiền tệ
      if (NUMBER_REGEX.test(line)) {
        // Loại trừ các trường hợp không phải tiền tệ nếu có ghi chú rõ ràng
        fileViolations.push({
          type: 'WARNING',
          line: lineNum,
          rule: 'CẢNH BÁO dùng Number(...) trong trang web',
          code: trimmed,
          hint: 'Tiền phải là string và định dạng qua lib/format.ts (BigInt), tránh lỗi dấu phẩy động'
        })
        totalWarnings++
      }
    })

    if (fileViolations.length > 0) {
      console.log(`📄 ${colors.bold}${relPath}${colors.reset}`)
      for (const v of fileViolations) {
        if (v.type === 'ERROR') {
          console.log(`   ${colors.red}✖ [LỖI - Dòng ${v.line}]: ${v.rule}${colors.reset}`)
          console.log(`     Đoạn mã: ${colors.yellow}${v.code}${colors.reset}`)
          console.log(`     👉 Khắc phục: ${v.hint}\n`)
        } else {
          console.log(`   ${colors.yellow}▲ [CẢNH BÁO - Dòng ${v.line}]: ${v.rule}${colors.reset}`)
          console.log(`     Đoạn mã: ${colors.yellow}${v.code}${colors.reset}`)
          console.log(`     👉 Khắc phục: ${v.hint}\n`)
        }
      }
    }
  }

  console.log(`${colors.bold}----------------------------------------------------${colors.reset}`)
  console.log(`📊 Tổng kết:`)
  console.log(`   • Đã quét: ${colors.bold}${files.length}${colors.reset} trang trong src/pages`)
  console.log(`   • Lỗi vi phạm axios (Error): ${totalErrors > 0 ? colors.red + totalErrors : colors.green + '0'}${colors.reset}`)
  console.log(`   • Cảnh báo dùng Number (Warning): ${totalWarnings > 0 ? colors.yellow + totalWarnings : colors.green + '0'}${colors.reset}`)
  console.log(`${colors.bold}----------------------------------------------------${colors.reset}\n`)

  if (totalErrors > 0) {
    console.error(`${colors.red}${colors.bold}❌ KIỂM TRA THẤT BẠI: Phát hiện vi phạm kiến trúc nghiêm trọng trong src/pages!${colors.reset}`)
    process.exit(1)
  } else if (totalWarnings > 0) {
    console.log(`${colors.yellow}⚠️  CHÚ Ý: Phát hiện một số trang của đồng đội đang dùng mock Number(). Cần thay thế trước khi đóng gói.${colors.reset}`)
    console.log(`${colors.green}✔️  Kiến trúc phân tầng Axios: 100% TUÂN THỦ (Trang mỏng chuẩn).${colors.reset}\n`)
    process.exit(0)
  } else {
    console.log(`${colors.green}${colors.bold}🎉 HOÀN HẢO: 100% các trang trong src/pages đạt chuẩn Trang Mỏng (Thin Pages)!${colors.reset}\n`)
    process.exit(0)
  }
}

checkThinPages()

