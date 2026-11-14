# FinVault Frontend

> **Sau merge main vào Huu:** xem [báo cáo merge và kết quả test mới](docs/handover/huu-main-merge.md). Wallet/P2P K18/K19, Notification và Utilities mới đã được tích hợp; nội dung mô tả source trước merge bên dưới là lịch sử.

Ứng dụng web ví điện tử mô phỏng cho đồ án học tập. React 19, TypeScript, Vite, TanStack Query, Tailwind, Axios; API đi qua Gateway `/api`. Mobile Expo nằm ở `apps/mobile`, ngoài phạm vi bàn giao Web của Hữu.

## Khởi chạy web

Cần Node tương thích dependencies hiện tại (đã kiểm chứng Node 22.23.1), npm và Gateway backend đang chạy.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Sửa `VITE_API_BASE_URL` trong `.env.local` theo Gateway của môi trường. Chỉ đặt URL public vào biến `VITE_*`. `VITE_VNPAY_PAYMENT_URL` là **exact HTTPS endpoint** đã xác nhận cho deployment, không kèm query/hash; để trống sẽ chặn redirect dù lệnh đã được tạo. Không đặt signing secret/token ở frontend.

```bash
npm run check
npm run test:unit
npm run build
npm run preview
```

`check` gồm lint/typecheck/Node tests/build, không gồm Vitest, browser hoặc E2E. Tham số `VITE_*` được đóng vào build; đổi cấu hình phải build lại. Browser harness dùng build riêng và chạy tuần tự để tránh ghi đè `dist`. Không bật mock khi trình bày luồng live.

## Bàn giao và trạng thái

Mới nhất: [closeout, tài khoản demo và video live](docs/handover/huu-fe-closeout.md). Đã chạy lại 9 suite, kiểm Wallet/P2P và chuẩn bị demo; xem giới hạn nghiệm thu trong báo cáo.

- [Bàn giao Hữu / Phase 8](docs/handover/huu-fe-phase8.md): phạm vi, test thực tế, blocker và review.
- [Runbook demo](docs/handover/huu-fe-demo-runbook.md): stack cô lập, thứ tự demo và minh chứng dự phòng.
- [PR frontend nháp](docs/handover/huu-fe-pr-draft.md), [PR backend phụ thuộc nháp](docs/handover/huu-be-funding-pr-draft.md).
- [Profile/KYC](docs/handover/kyc.md), [Funding](docs/handover/funding.md), [Topup](docs/handover/topup.md), [Cashout](docs/handover/cashout.md), [Merchant](docs/handover/merchant.md), [Outlet/QR/key](docs/handover/merchant-tools.md).
- [Evidence sửa blocker mới nhất](docs/evidence/huu-fe-week4/fixes/README.md), [Contract còn mở](docs/CONTRACT_OPEN_QUESTIONS.md).

Code đang ở working tree chưa commit. Check, unit và Funding HTTP live đã PASS theo evidence; VNPAY sandbox thật, full K18 và nghiệm thu toàn bộ cùng revision chưa hoàn tất. Phase 8 là bàn giao có giới hạn, chưa phải xác nhận hoàn thành mọi P0.

FinVault là đồ án học tập mô phỏng ví điện tử, không phải dịch vụ tài chính thật.
