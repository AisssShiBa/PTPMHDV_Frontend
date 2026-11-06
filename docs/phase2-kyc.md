# Frontend KYC — Phase 2

Hoàn thành ngày 25/10/2026, bám API trong `PTPMHDV_Backend/docs/phase2-huu.md`
và phần H8 đã triển khai của `phase3-huu.md`.

## Giao diện

- `/admin/kyc`: tìm theo tên/email, lọc trạng thái, phân trang và hiển thị cấp KYC
  riêng với trạng thái. Số giấy tờ trong danh sách chỉ hiện 4 ký tự cuối.
- Duyệt chỉ dành cho PENDING → APPROVED, cấp 1. Từ chối dành cho PENDING hoặc
  APPROVED → REJECTED, cấp 0. Không cho duyệt trực tiếp hồ sơ NONE/REJECTED.
- Hồ sơ APPROVED có nút nâng cấp 2 (mô phỏng liên kết ngân hàng), đưa về cấp 1;
  hồ sơ APPROVED cũ ở cấp 0 có thêm nút đặt cấp 1.
- Mỗi thao tác mở phần chi tiết và yêu cầu lý do 1–500 ký tự trước khi xác nhận.
  Chặn gửi trùng; khi lỗi, khóa thao tác cho đến khi tải lại danh sách để đối chiếu.
- Chọn hồ sơ, bấm “Xem hai mặt CCCD” để gọi API Admin có audit. Không dùng URL
  từ danh sách hoặc gọi trực tiếp API User để xem giấy tờ của người khác.
  Ảnh được ẩn khi hết `expiresAt`, đóng hồ sơ hoặc rời trang; tải lại ảnh tạo
  yêu cầu mới. Có trạng thái thiếu giấy tờ, lỗi tải ảnh, lỗi API và thử lại.
- `/profile`: hiển thị cấp KYC từ backend; cập nhật sau khi tải lại trạng thái.
  Form nộp đủ mặt trước/mặt sau, kiểm tra từng ảnh JPEG/PNG ≤ 5 MiB và xem trước.
  Backend hiện chỉ cho người dùng xem lại URL mặt trước; Admin xem cả hai mặt.
- Bố cục Admin thích ứng màn hình nhỏ; bảng cuộn ngang trong vùng riêng.

## API

| Thao tác | Endpoint | Dữ liệu |
|---|---|---|
| Danh sách | `GET /api/admin/kyc` | `page, limit, status, search` |
| Duyệt/từ chối | `POST /api/admin/kyc/:id/review` | `{status, detail}` |
| Đổi cấp | `PATCH /api/admin/kyc/:id/tier` | `{tier: 1 hoặc 2, reason}` |
| Xem hai mặt | `GET /api/admin/kyc/:id/documents` | `{frontUrl, backUrl, expiresAt}` trong envelope |
| Nộp hồ sơ | `POST /api/users/kyc/documents` | Multipart `front, back, idNumber` |

Form nộp được cập nhật vì backend H8 hiện bắt buộc hai mặt trên cả route cũ.
Frontend không tự giả lập cấp, hạn mức hoặc thành công khi API báo lỗi.

## Kiểm chứng

Tại thư mục frontend:

```sh
rtk npm test
rtk npm run build
rtk npm run lint
rtk npm run test:browser
```

- 18 unit/API contract tests chạy qua.
- Build production thành công. Lint không có lỗi; còn cảnh báo ở các module cũ.
- Browser smoke chạy trên Chromium với API fixtures: nộp thiếu/đủ hai mặt,
  chống gửi trùng, xem ảnh/hết hạn/thiếu ảnh, duyệt → cấp 1 → cấp 2 → cấp 1 →
  từ chối về cấp 0, lý do bắt buộc, kết quả không chắc chắn phải tải lại,
  tìm kiếm/rỗng/lỗi danh sách, phân quyền và bố cục mobile.
- Ảnh kiểm tra: `node_modules/.tmp/browser-smoke/admin-kyc-desktop.png` và
  `admin-kyc-mobile.png`.
- Chưa kiểm thử xuyên suốt với Compose thật. Cần chạy cùng backend để xác nhận
  audit trong DB, URL MinIO và cập nhật hạn mức Wallet qua consumer sự kiện.
  Backend bàn giao ghi nhận consumer Wallet chưa có trong checkout đó.

Build ban đầu bị chặn bởi state và hai handler không dùng trong `AdminTopups`.
Đã bỏ code chết; các nút duyệt nạp tiền vẫn giữ trạng thái vô hiệu hóa như trước.
