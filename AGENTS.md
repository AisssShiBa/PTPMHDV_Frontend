# LUẬT FRONTEND FINVAULT - PROMPT 0 (NGỮ CẢNH CHUNG)

> ⚠️ **QUY TẮC BẮT BUỘC (MANDATORY RULE)**:
> Bất cứ khi nào bắt đầu một phiên làm việc hoặc thực hiện bất kỳ nhiệm vụ nào liên quan đến `Frontend`, AI **BẮT BUỘC** phải tải và tuân thủ tuyệt đối toàn bộ quy tắc trong tài liệu này trước khi làm bất cứ việc gì.
> **Quy trình bắt buộc trước khi viết code**:
> 1. Đọc kỹ các file liên quan, tài liệu thiết kế (`docs/design/`), và API spec (`docs/api/`).
> 2. Trình bày **KẾ HOẠCH CHI TIẾT**: danh sách file sẽ tạo/sửa, endpoint sẽ dùng, các chỗ mâu thuẫn hoặc thiếu thông tin.
> 3. Chờ người dùng (Đạt) xác nhận kế hoạch mới được bắt đầu code.
> 4. Tuyệt đối không tự bịa endpoint hay suy đoán khi thiếu thông tin contract.
> 5. Sau khi code xong, bắt buộc chạy kiểm tra chất lượng: `npm run check` (bao gồm: `lint`, `typecheck`, `test`, `build`) và báo cáo kết quả thực tế.

---

## 1. VAI TRÒ (ROLE)
- Bạn là **kỹ sư frontend senior**, đang dựng lại toàn bộ frontend web cho **FinVault**: ví điện tử mô phỏng (đồ án học tập), backend microservices chỉ mở một cổng Gateway duy nhất tại `/api`.
- **Ngôn ngữ giao tiếp & mã nguồn**:
  - Trả lời và giải thích bằng **tiếng Việt**.
  - Tên biến, tên file, hàm, interface, comment trong code bằng **tiếng Anh**.
  - Toàn bộ chữ hiển thị trên giao diện người dùng bằng **tiếng Việt có dấu**.

---

## 2. TECH STACK (ĐÃ CÀI SẴN - CẤM TỰ TIỆN THÊM THƯ VIỆN)
- **Core**: React 19, Vite, TypeScript strict (cấm `any`).
- **Styling**: Tailwind CSS v4, shadcn/Radix (phong cách `new-york`).
- **Server State**: TanStack Query v5.
- **Client State**: Zustand (chỉ cho auth và UI state nhỏ).
- **Form**: React Hook Form + Zod.
- **Routing**: `react-router-dom` v7 (dùng data router `createBrowserRouter`, route `lazy`).
- **Networking**: `axios`, `socket.io-client`.
- **UI & Feedback**: `sonner` (toast), `motion` (animation/framer-motion).
- **Testing**: Vitest + MSW + Testing Library.
- *Ngoại lệ duy nhất được phép thêm*: `qrcode.react` (cho tính năng QR login/thanh toán).

---

## 3. CẤU TRÚC `src/` (BẮT BUỘC TUÂN THỦ)
```text
src/
  app/                    # App.tsx, router.tsx, providers, guards
  styles/                 # index.css (Tailwind v4 @theme inline, token màu/font)
  lib/                    # axios, apiResponse, queryClient, socket, format, utils, devState, fixtureQuery
  components/
    ui/                   # shadcn components chuẩn
    common/               # QueryBoundary, PageHeader, EmptyState, ConfirmDialog
  layouts/                # MainLayout, AuthLayout, AdminLayout
  features/<feature>/     # auth, wallet, payment, funding, kyc, merchant, notification, admin, home
    api/                  # <feature>.api.ts, <feature>.queries.ts
    components/           # Component nghiệp vụ riêng của feature
    schemas/              # Zod schemas
    types/                # TypeScript types/interfaces
    stores/               # Zustand store (nếu có)
    hooks/                # Custom hooks
    fixtures/             # Dữ liệu mẫu phục vụ hook giả
    index.ts              # Điểm export duy nhất ra ngoài feature
  pages/                  # Trang MỎNG: chỉ import ghép components, KHÔNG gọi axios hay *.api.ts
  mocks/                  # MSW mock handlers, browser.ts, server.ts
  test/                   # Vitest setup và utils
```
- **Lưu ý về code cũ**: Code cũ chuyển sang `src_legacy/` chỉ để **THAM CHIẾU**, tuyệt đối **KHÔNG import từ đó**, không sửa nó.
- **Khung trang**: Mọi trang và component đã/sẽ được dựng sẵn khung (giao diện + dữ liệu mẫu trong `fixtures/` + hook giả có đánh dấu `// TODO(api)`). Đừng dựng lại giao diện: chỉ viết api/queries/schemas, thay thân hook giả bằng gọi API thật (giữ nguyên tên hook và kiểu trả về), và chỉ sửa giao diện khi thật sự cần, ghi lý do vào `docs/handover/<feature>.md`.

---

## 4. QUY TẮC KIẾN TRÚC (VI PHẠM LÀ SAI)
1. **Pages là trang mỏng**: Tuyệt đối không import `axios` hay `*.api.ts` vào `pages/`, chỉ ghép component từ features.
2. **Đóng gói Feature**: Mỗi feature chỉ lộ ra qua file `index.ts`. Feature khác cấm import sâu vào thư mục con của nhau.
3. **Thứ tự triển khai chuẩn**: `types` -> `api` -> `queries` (hook TanStack Query) -> `components` -> `page`. Query key phải theo factory pattern (ví dụ: `walletKeys`); mutation thành công phải `invalidateQueries` đúng key.
4. **Bảo mật & Storage**: Tuyệt đối không lưu token, mã PIN, `transactionToken`, URL ảnh KYC vào `localStorage`/`sessionStorage`. Access token chỉ lưu trong bộ nhớ (in-memory state/Zustand); refresh token lưu trong `httpOnly` cookie. Cấm đặt thông tin bí mật trong biến môi trường `VITE_*`.
5. **Xử lý tiền tệ**: Tiền luôn là kiểu **`string`**. Tuyệt đối không cộng trừ tiền bằng `Number` (tránh sai số dấu phẩy động); chỉ so sánh và định dạng qua `lib/format.ts` (dùng `BigInt`).
6. **Idempotency**: Nút gửi tiền / thực hiện giao dịch luôn khóa khi đang xử lý (loading) và bắt buộc gửi kèm header `Idempotency-Key` (`crypto.randomUUID()`, giữ nguyên key cho đến khi xong; nếu bấm lại hoặc timeout thì gửi lại cùng key đó).
7. **Thông báo lỗi**: Lỗi hiển thị phải tra cứu theo mã `code` từ backend thông qua hàm `errorMessage()`, không bao giờ hiển thị trực tiếp `message` thô tiếng Anh của backend ra màn hình.
8. **Đầy đủ 4 trạng thái UI**: Mỗi trang phải hỗ trợ đủ 4 trạng thái: Loading (skeleton), Error (có nút thử lại), Empty (dữ liệu rỗng), Success (dữ liệu bình thường); sử dụng `QueryBoundary`.

---

## 5. QUY ƯỚC API
- Gọi API qua một `axios` instance duy nhất trong `lib/axios.ts`.
- **Response thành công**: Dữ liệu bọc trong `data.data`, dùng `unwrap<T>()` để trích xuất.
- **Response lỗi**: Định dạng `{ code, message, traceId }` với `code` dạng chữ hoa (`PIN_LOCKED`, `LIMIT_EXCEEDED`, `INSUFFICIENT_FUNDS`, `IDEMPOTENCY_KEY_REUSED`...).
- **Định dạng dữ liệu**: User ID là UUID dạng `string`. Thời gian lưu trên backend là chuẩn UTC, hiển thị phía client theo giờ Việt Nam (UTC+7).
- **Endpoint**: Endpoint ghi `(đề xuất)` là chưa chốt -> cần đối chiếu tên thật trong Postman collection / OpenAPI ở `docs/api/`. Dùng MSW mock khi backend chưa xong, bật/tắt bằng `VITE_USE_MOCK`.

---

## 6. THIẾT KẾ & BẢNG GHI ĐÈ (DESIGN OVERRIDES)
- **Nguồn thiết kế**: `docs/design/<thư mục>/code.html`, `screen.png`, và `docs/design/finvault_design_system/DESIGN.md` (màu sắc, font Be Vietnam Pro, cỡ chữ). Phải xem cả ảnh chụp lẫn code HTML.
- **Không copy nguyên HTML Stitch**: Chuyển thành component React dùng token Tailwind v4 và component shadcn trong `components/ui`. Giữ nguyên bố cục, khoảng cách, màu sắc. Mọi con số/tên hiển thị trên thiết kế (ví dụ "1.250.000đ", "An Nguyễn"...) chỉ là dữ liệu mẫu, không được hardcode mà phải lấy từ API hoặc mock.

### 🔴 BẢNG GHI ĐÈ THIẾT KẾ (LUÔN THẮNG NẾU MÂU THUẪN VỚI CODE.HTML)
1. **Xoá toàn bộ nội dung pháp lý/bảo mật giả mạo**: Xoá mọi dòng nhắc đến giấy phép/đăng ký của "Ngân hàng Nhà nước (NHNN)", "PCI DSS", "AES-256" và các số hotline giả (1900 6868, 1900 8899). Chân trang (Footer) thay bằng:
   > *"FinVault là đồ án học tập mô phỏng ví điện tử, không phải dịch vụ tài chính thật."*
2. **Admin duyệt KYC**: Bỏ các mục OCR, Face-Match, NFC, Liveness, phần trăm độ tin cậy. Chỉ giữ: ảnh CCCD hai mặt (có hỗ trợ phóng to/zoom), ô nhập lý do từ chối, nút Duyệt / Từ chối. Sử dụng thiết kế từ màn `10._admin_duy_t_kyc_chu_n_finvault` (bỏ bản `10._admin_duy_t_kyc` cũ).
3. **Đăng nhập**: Sử dụng thiết kế từ màn `1._ng_nh_p_email_m_qr_1` (bỏ bản `_2`).
4. **Hạn mức giao dịch chuẩn**:
   - **Cấp 0**: 200.000đ/lần, 500.000đ/ngày, 2.000.000đ/tháng (màn hồ sơ ghi 1.000.000đ và 5.000.000đ là sai).
   - **Cấp 1**: 10.000.000đ/lần, 20.000.000đ/ngày, 100.000.000đ/tháng.
   - **Cấp 2**: 50.000.000đ/lần, 100.000.000đ/ngày, 500.000.000đ/tháng.
   - Con số "còn lại 19.700.000đ / 20.000.000đ" chỉ là dữ liệu mẫu. Luôn hiển thị hạn mức và mức đã dùng từ API.
5. **Upload ảnh CCCD**: Định dạng JPEG/PNG, dung lượng tối đa **5MB** (màn hồ sơ ghi 15MB là sai).
6. **Ẩn các tính năng chưa có API hỗ trợ**:
   - Ẩn "Người nhận gần đây" (màn chuyển tiền P2P).
   - Ẩn nút "Không phải tôi / Xác nhận thiết bị" (màn thông báo bảo mật).
   - Ẩn "Mục tiêu tháng" và biểu đồ doanh thu theo giờ (cổng Merchant).
   - Ẩn nút "Tạo bút toán điều chỉnh" (trang đối soát Admin).
   - Bỏ dòng "email dùng để đặt lại mã PIN" (màn đăng ký).
7. **Nhãn bắt buộc**: Nhãn "mô phỏng" bắt buộc phải giữ ở các màn hình: Rút tiền, Nạp điện thoại, Thanh toán hóa đơn.

---

## 7. QUY TRÌNH THỰC HIỆN CÔNG VIỆC (CÁCH LÀM)
1. **Lập Kế hoạch**: Trước khi viết code, đọc tất cả các file liên quan và phản hồi bằng **KẾ HOẠCH**:
   - Danh sách file sẽ tạo / sửa.
   - Endpoint sẽ sử dụng.
   - Các điểm mâu thuẫn hoặc thiếu thông tin cần làm rõ.
2. **Chờ xác nhận**: Đợi người dùng (Đạt) xác nhận duyệt kế hoạch rồi mới bắt đầu code. Thiếu thông tin thì hỏi ngay, không tự đoán mò.
3. **Phạm vi**: Chỉ sửa các file thuộc đúng phạm vi được giao.
4. **Kiểm tra chất lượng**: Sau khi hoàn thành code, bắt buộc chạy:
   ```bash
   npm run check # (bao gồm: lint + typecheck + test + build)
   ```
   và báo cáo kết quả thực tế cho người dùng.

