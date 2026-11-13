# Cài dependencies cho nghiệm thu Phase 1

**Kết quả cuối mới nhất:** [Phase 1 PASS](../final/README.md) — check/Node 32/Vitest 35/browser/live đã qua. Phần dưới giữ lịch sử các lượt trước.

**Kết quả mới sau khi người dùng cài dependencies:** [retest](../retest/README.md) — Profile/KYC 12/12, Vitest 28/28, typecheck/build PASS; global check FAIL, browser/live BLOCKED. Nội dung dưới đây giữ lại kết quả lịch sử.

Ngày 12/11/2026. Đã nhận yêu cầu cài dependencies và thử thực thi `npm install --cache /tmp/huu-fe-acceptance-cache --fetch-retries=0 --fetch-timeout=10000 --no-audit --no-fund` tại frontend root; exit 1, `EAI_AGAIN registry.npmjs.org`.

[Log npm install](npm-install.txt) · [Inventory dependencies](dependency-inventory.json).

Phiên thực thi bị giới hạn truy cập mạng. DNS hệ thống trỏ 127.0.0.53 nhưng registry không resolve được trong phiên; getent không có kết quả và curl cũng báo Could not resolve host. Không sửa DNS hệ thống, không thay registry/phiên bản hoặc đồng bộ lockfile thủ công để né lỗi. Package manifest và lockfile được giữ nguyên sau lệnh install thất bại.

Đã kiểm tra cache npm local: không đủ đúng bộ dependency được lock. Không dùng Vitest/Vite/TypeScript phiên bản khác trong cache để giả định quality gate đúng lockfile đã PASS. Chromium đã có trong cache máy, không cần tải thêm browser để giải quyết blocker trước mắt.

Bước còn cần môi trường có mạng tới npm registry: tại PTPMHDV_Frontend chạy `npm install` để cài đúng manifest và đồng bộ workspace lockfile, sau đó `npm run check` và `npm run test:unit -- src/test/userProfile.test.tsx`. Nếu install báo version/engine/peer dependency lỗi thì phải xử lý từ lỗi thực tế, không tự nâng/hạ versions để tuyên bố đạt.

Chưa cài thành công dependencies; nghiệm thu Phase 1 vẫn BLOCKED. Đây là lỗi truy cập registry của môi trường thực thi, không có yêu cầu người dùng xác nhận thêm việc cài đặt.
