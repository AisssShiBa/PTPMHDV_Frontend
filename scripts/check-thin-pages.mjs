/**
 * Check direct network imports in pages and flag Number(...) for manual review.
 * This does not certify business-logic separation or resolve computed imports.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const PAGES_DIR = resolve(ROOT, 'src/pages')
const config = ts.readConfigFile(resolve(ROOT, 'tsconfig.app.json'), ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT).options

function findPageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findPageFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

export function inspectPage(filePath, content) {
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
  const violations = []
  function report(node, type, rule, hint) {
    violations.push({
      type,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      rule,
      hint
    })
  }
  function inspectImport(specifier, node) {
    const modulePath = specifier.replaceAll('\\', '/')
    const resolved = ts.resolveModuleName(specifier, filePath, compilerOptions, ts.sys).resolvedModule?.resolvedFileName
    const target = resolved?.replaceAll('\\', '/')
    const isAxios = /^axios(?:\/|$)/.test(modulePath)
      || (target && resolve(target) === resolve(ROOT, 'src/lib/axios.ts'))
    const isApi = /(?:^|\/)[^/]+\.api(?:\.[cm]?[jt]sx?)?$/.test(modulePath)
      || (target && /\.api\.[cm]?[jt]sx?$/.test(target))
    if (isAxios || isApi) {
      report(node, 'ERROR', 'Import mạng trực tiếp bị cấm: ' + specifier,
        'Chuyển lời gọi API vào feature; trang ghép component hoặc hook qua index.ts của feature.')
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      inspectImport(node.moduleSpecifier.text, node)
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      inspectImport(node.moduleReference.expression.text, node)
    } else if (ts.isCallExpression(node)) {
      const expression = node.expression
      if ((expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(expression) && expression.text === 'require'))
        && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        inspectImport(node.arguments[0].text, node)
      }
      if (ts.isIdentifier(expression) && expression.text === 'Number') {
        report(node, 'WARNING', 'Cần rà soát Number(...); chưa xác định đây có phải tiền tệ.',
          'Nếu là tiền: giữ dạng string và dùng tiện ích tiền tệ. Nếu là số trang hoặc số đếm: kiểm tra theo nghiệp vụ.')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

function checkThinPages() {
  const files = findPageFiles(PAGES_DIR)
  let errors = 0
  let warnings = 0
  console.log('Kiểm tra import mạng trực tiếp và cảnh báo Number(...) trong src/pages')
  for (const file of files) {
    for (const violation of inspectPage(file, readFileSync(file, 'utf8'))) {
      if (violation.type === 'ERROR') errors++
      else warnings++
      console.log(relative(ROOT, file) + ':' + violation.line + ' [' + violation.type + '] ' + violation.rule)
      console.log('  ' + violation.hint)
    }
  }
  console.log('Đã quét ' + files.length + ' file; lỗi import: ' + errors + '; cảnh báo cần rà soát: ' + warnings + '.')
  console.log('Phạm vi: import có đường dẫn cố định và lời gọi Number(...). Logic nghiệp vụ, import tính toán và mức độ trang mỏng cần được rà soát riêng.')
  if (errors > 0) {
    console.error('Không đạt kiểm tra import. Cần sửa các vị trí được liệt kê.')
    return 1
  }
  console.log('Không phát hiện import mạng trực tiếp bị cấm trong phạm vi kiểm tra.')
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = checkThinPages()
}

