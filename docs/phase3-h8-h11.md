# Frontend Phase 3 — H8 / H11

Hoàn thành và kiểm chứng ngày 25/10/2026 theo `Tasks/KeHoach_Tuan2_Huu.md`
và hợp đồng trong `PTPMHDV_Backend/docs/phase3-huu.md`.

## H11 — người nhận bằng email / SĐT

Mở **Chuyển khoản** tại `/wallet` hoặc `/dashboard`:

1. Nhập email đầy đủ hoặc SĐT đúng cách viết đã lưu, rồi bấm **Tra cứu**.
2. Frontend gọi `GET /api/users/lookup?q=...`, chỉ hiển thị `maskedName`.
   `authUserId` được giữ trong bộ nhớ để làm người nhận; không hiển thị cho người dùng.
3. Nhập số tiền và tích xác nhận tên người nhận/số tiền trước khi chuyển.

Không gọi API số dư ví của người nhận. Gõ phím không tự gửi tra cứu, tránh tiêu
hao hạn mức 10 lần/phút. Giữ nguyên chữ hoa/thường trong email, mã quốc gia,
khoảng trắng và dấu phân cách của SĐT; chỉ bỏ khoảng trắng ở hai đầu.

Sửa thông tin người nhận sẽ hủy request đang chạy, xóa kết quả và xác nhận cũ.
Phản hồi đến muộn không được thay thế người nhận mới. Thay số tiền cũng yêu cầu
xác nhận lại. Đóng modal hoặc đổi tài khoản không giữ lựa chọn người nhận.

Mọi 404 có cùng thông báo, không phân biệt không tồn tại, chính mình, trùng SĐT
hay không được phép. 429 đọc `Retry-After` (giây hoặc HTTP date), mặc định 60 giây
nếu header thiếu; khóa tra cứu và đếm ngược. Thời gian chờ theo tài khoản giữ
trong bộ nhớ khi đóng/mở lại modal, không lưu query hoặc kết quả vào storage.
Backend vẫn là nơi thực thi hạn mức khi reload trang hoặc mở tab khác.

Chuyển tiền chỉ dùng Auth ID đã được tra cứu, có khóa chống bấm trùng.
Request có `referenceId` UUID cố định cho một lần chuyển. Nếu mất kết nối/lỗi
5xx, giữ nguyên người nhận, số tiền và reference khi bấm **Thử lại giao dịch này**.
Không báo thành công nếu response thiếu `transactionId`.

## H8 — hai mặt giấy tờ

Phần này đã nối ở lượt Phase 2; Phase 3 kiểm chứng lại với backend thật:

- Form `/profile` bắt buộc `front`, `back`, `idNumber`; từng ảnh JPEG/PNG tối đa
  5 MiB, có xem trước. Gửi `POST /api/users/kyc/documents` và nhận profile PENDING.
- Admin dùng endpoint có audit để lấy hai URL, ẩn ảnh khi hết hạn; chi tiết
  giao diện duyệt/tier ở [bàn giao Phase 2](phase2-kyc.md).
- Backend hiện chỉ cho USER xem lại URL mặt trước của mình. Không tự thêm route
  USER hai mặt hoặc dùng route Admin để thay thế.

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `rtk npm test` | 22/22 pass |
| `rtk npm run build` | Pass |
| `rtk npm run lint` | Không lỗi, còn 6 cảnh báo ở module cũ |
| `rtk npm run test:browser` | Pass với API fixtures |
| `rtk npm run test:phase3:live` | Pass với Gateway/Auth/User/MinIO thật |

Browser fixtures kiểm tra email/SĐT, giữ nguyên query, không tra khi đang gõ,
lỗi 404/503, cooldown 429 và đóng/mở lại, phản hồi cũ sau khi sửa query, bắt buộc
xác nhận, payload dùng Auth ID, gửi trùng và retry giữ cùng reference. Bộ H8,
Admin KYC, đăng nhập/phân quyền và merchant trước đó tiếp tục pass.

Live test dùng production build và proxy cùng origin tới Gateway localhost:3000.
Auth cho phép origin `localhost`; vì vậy test mở trình duyệt bằng `localhost`,
không dùng `127.0.0.1` làm origin của trang.

Live test tạo tài khoản và ảnh tổng hợp mới, không đổi quyền, reset DB, xóa volume
hoặc chuyển tiền. Kết quả đã kiểm chứng:

- Login qua UI; thiếu mặt sau bị chặn trước khi gửi request.
- Bấm gửi hai lần chỉ tạo một upload, backend trả 202 và profile PENDING.
- URL ảnh mặt trước từ MinIO private đọc được trong trình duyệt.
- USER xin ảnh qua endpoint Admin nhận 403.
- Tra cứu đúng email/SĐT trả tên đã che; chính mình/không tìm thấy cùng 404.
- Request tra cứu thứ 11 trả 429; đóng/mở lại vẫn bị khóa tra cứu.
- Không đọc số dư người nhận; không gửi yêu cầu chuyển tiền; không có lỗi JS.

Bằng chứng cục bộ (Git bỏ qua):
`node_modules/.tmp/phase3-live/result.json`, `live-kyc-two-sided.png`,
`live-recipient-mobile.png`, `live-recipient-rate-limit.png`.
Evidence chỉ ghi method/path/status, không ghi password, token, query hay signed URL.

Để chạy lại: khởi động backend đã migrate H8/H11, build frontend, rồi chạy lệnh
live test phía trên. Có thể đặt `LIVE_API_ORIGIN` sang cổng localhost khác.
Test cần Chromium và quyền mở process. Mỗi lần chạy tạo tài khoản tổng hợp mới.

## Ranh giới bàn giao

H11 được tích hợp vào modal chuyển tiền hiện có, hiện gọi
`POST /api/wallets/:userId/transfer` theo backend trong checkout. Chưa có public
P2P Payment/confirm API dành cho USER; chưa triển khai hoặc xác nhận luồng
Payment + PIN + transaction token/hạn mức mới của K10/A3/A4/A9. Không coi test
H8/H11 này là nghiệm thu toàn bộ chuyển tiền Tuần 2.

Backend đã có kiểm thử S12 URL hết hạn và audit với MinIO/PostgreSQL thật.
Frontend dùng fixture TTL 2 giây để kiểm tra tự ẩn ảnh; live test lượt này
không thay TTL 300 giây và không đăng nhập ADMIN để tạo thêm audit.
