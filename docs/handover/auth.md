# Bàn giao Auth, PIN và QR Web — Đạt (Đ20)

Người phụ trách: Đạt. Phạm vi: hướng dẫn tích hợp phần Auth/PIN/QR của Đạt cho nhóm; không xác nhận hoàn thành nghiệp vụ Payment, Funding hoặc Utilities của thành viên khác.

## 1. Trạng thái và bằng chứng

Tài liệu cập nhật ngày 16/11/2026. Các kết quả dưới đây là lần chạy gần nhất trước lượt sửa tài liệu này, không phải nghiệm thu trên Backend thật.

| Kiểm tra | Kết quả gần nhất | Giới hạn |
| --- | --- | --- |
| `npm run check` | Exit 0: lint, typecheck, Node tests 59/59, build thành công | Lint còn 29 cảnh báo; lệnh này không chạy Vitest và browser |
| `npm run test:unit` | 28 file, 209 test đạt | Kiểm thử tự động không thay thế nghiệm thu dịch vụ thật |
| `src/test/transactionSafety.test.tsx` | 7/7 đạt | Gồm 5 ca an toàn PIN và 2 ca VNPAY return |
| Kiểm tra bổ sung trong bộ nhớ | QR page 7/7, SignIn 11/11, qr-confirm 15/15 đạt | Không lưu thành file; không nằm trong các lệnh test của repo |
| Browser + Gateway/Auth/Redis thật | Chưa nghiệm thu lại | Chưa đủ bằng chứng kết luận A3 khóa PIN, A4 chống dùng lại/hết hạn token và Q1 QR live đạt |

Ở lần kiểm tra hạ tầng trước, Docker Engine chưa chạy. Không lấy lỗi thiếu hạ tầng làm bằng chứng chức năng sai. Cũng không lấy test mock đạt làm bằng chứng Backend thật hoạt động đúng.

Những điểm còn phải rà trong phạm vi Đạt: store vẫn có fixture/export `MOCK_USER`; các trang Auth/QR vẫn còn gọi API trực tiếp và polling theo interval, chưa hoàn tất kiến trúc page mỏng/TanStack Query. `check` xanh không chứng minh toàn bộ quy tắc kiến trúc đã đạt. Kiểm tra page mỏng riêng trước đây còn báo import axios trong TransferPage; đây là điểm tích hợp cần phối hợp chủ nhiệm màn hình.

## 2. File nguồn và đường vào Web

- [Auth API](../../src/features/auth/api/auth.api.ts): adapter gọi API qua axios dùng chung.
- [Auth store](../../src/features/auth/stores/useAuthStore.ts): phiên đăng nhập, initialize/refresh/signout.
- [Public exports](../../src/features/auth/index.ts): điểm import cho thành viên khác.
- [PinModal](../../src/features/auth/components/PinModal.tsx): xác thực PIN gắn với đơn đã có.
- [SignInPage](../../src/pages/SignInPage.tsx), [QrLoginPage](../../src/pages/QrLoginPage.tsx): đăng nhập mật khẩu/QR.
- [qr-confirm](../../scripts/qr-confirm.mjs): giả lập client mobile duyệt QR phục vụ kiểm thử.

Các đường vào: `/sign-in`, `/sign-up`, `/qr-login`; người dùng vào `/app`, quản trị vào `/admin`. Thiết lập/đổi PIN qua phần Bảo mật & PIN của `/app/profile`. Việc liệt kê màn hình không có nghĩa từng màn đã được nghiệm thu live.

## 3. Contract hiện dùng

Base URL Gateway thường là `http://localhost:3000/api`. Các path dưới đây tương đối với base URL. Dữ liệu thành công nằm trong envelope `data`; adapter bóc bằng `unwrap`. Không thêm `/api` lần thứ hai khi gọi qua instance đã cấu hình.

| Method | Path | Dữ liệu/quy ước chính |
| --- | --- | --- |
| POST | `/auth/signin` | `{ username, password, platform: 'web' }`; phiên trả accessToken/user và refresh cookie cho Web |
| POST | `/auth/signup` | Adapter gửi email, username, password, firstName, lastName |
| POST | `/auth/refresh` | Body `{}`; dùng refresh cookie; adapter nhận phiên AuthSession |
| POST | `/auth/signout` | Body `{}`; kết thúc phiên |
| GET | `/users/me` | Người dùng hiện tại; không phải `/user/me` |
| GET | `/auth/pin/status` | hasPin, isLocked, lockedUntil; có thể có attemptsRemaining |
| POST | `/auth/pin/setup` | `{ pin, confirmPin }` |
| POST | `/auth/pin/change` | `{ oldPin, newPin, confirmNewPin }` |
| POST | `/auth/pin/verify` | `{ pin, paymentId, amount }`; amount là chuỗi; nhận transactionToken |
| POST | `/auth/qr-login/init` | `{}`; nhận qrId, nonce, pollSecret, expiresAt |
| GET | `/auth/qr-login/:qrId/status` | Gửi pollSecret bằng query và header x-poll-secret; APPROVED có phiên để đăng nhập |
| POST | `/auth/qr-login/confirm` | `{ qrId, nonce }`, kèm Authorization của client mobile đã đăng nhập |

Access token chỉ ở bộ nhớ; refresh token Web nằm trong cookie HttpOnly. Khôi phục phiên phải chờ initialize trước khi guard điều hướng. Refresh dùng chung promise cho yêu cầu đồng thời; không retry 403. Guard ADMIN ở giao diện hỗ trợ điều hướng, quyền thật vẫn do Backend kiểm tra.

## 4. Tích hợp PinModal

Import qua public entry của feature:

```tsx
import { PinModal, useAuthStore } from '@/features/auth'
```

| Prop | Kiểu | Yêu cầu |
| --- | --- | --- |
| open | boolean | Bắt buộc |
| paymentId | string | Bắt buộc, lấy từ kết quả tạo đơn Backend |
| amount | string | Bắt buộc, đúng số tiền của đơn đã tạo |
| onSuccess | (transactionToken: string) => void | Bắt buộc; caller tiếp tục confirm bằng API nghiệp vụ |
| onOpenChange | (open: boolean) => void | Tùy chọn; cập nhật trạng thái hiển thị |
| onCancel | () => void | Tùy chọn; xử lý hủy ở UI |
| title, description | string | Tùy chọn |

Luồng bắt buộc cho người tích hợp:

1. Gọi API tạo đơn/checkout thật của feature mình qua adapter/hook hiện có. Chỉ mở modal sau khi nhận mã đơn và số tiền hợp lệ.
2. Truyền chính mã đơn và số tiền đó vào PinModal. Không tự sinh UUID thay mã đơn, không hardcode tiền, không đọc lại tiền từ form đang cho phép sửa.
3. Trong onSuccess, gửi token ngay đến API confirm của feature mình theo đúng contract. Không tự chọn body/header nếu contract không quy định.
4. Chỉ báo giao dịch thành công khi API confirm trả thành công. Nhập đúng PIN chỉ chứng minh đã nhận token.
5. Giữ nguyên Idempotency-Key của cùng một thao tác khi timeout/retry theo contract nghiệp vụ; khóa thao tác đang gửi để tránh bấm đúp. Không tự động phát lại lệnh chi tiền.
6. onCancel/đóng modal chỉ đóng UI, không mặc nhiên hủy đơn trên server. Muốn hủy đơn phải dùng API hủy được feature hỗ trợ.

Ví dụ phần gắn modal dưới đây giả định `order` đã được tạo thành công từ Backend; `handlePinSuccess` là callback của feature thực sự gọi confirm và xử lý kết quả. Đây là đoạn ghép, không phải một component hoàn chỉnh:

```tsx
{order && (
  <PinModal
    open={pinOpen}
    onOpenChange={setPinOpen}
    paymentId={order.id}
    amount={order.amount}
    onSuccess={handlePinSuccess}
    onCancel={() => setPinOpen(false)}
  />
)}
```

PinModal yêu cầu PIN 6 số, chặn verify đồng thời và từ chối thông tin đơn thiếu/tiền không hợp lệ. Phản hồi verify về sau khi đóng modal hoặc đổi tài khoản bị bỏ qua. Đổi chủ phiên, mã đơn hoặc số tiền sẽ tạo lại phiên nhập PIN.

Khi INVALID_PIN, số lần còn lại được đọc từ `error.details.remainingAttempts`. Khi PIN_LOCKED, modal đọc lockedUntil/remainingSeconds từ Backend; thiếu thời hạn thì đọc lại `/auth/pin/status` và giữ trạng thái chặn trong lúc chưa biết. Đóng/mở lại cùng wrapper còn mounted giữ khóa đã biết; unmount toàn wrapper không bảo đảm giữ bộ nhớ khóa. Backend luôn là nguồn quyết định khóa.

Contract cần nghiệm thu: token giao dịch dùng một lần, hiệu lực 60 giây; chính sách sai PIN 5 lần khóa 30 phút. Phải kiểm chứng trên dịch vụ thật. UI đếm ngược hoặc mock đạt chưa chứng minh cơ chế chống replay và khóa phía Backend.

Không lưu PIN, accessToken, transactionToken, pollSecret vào localStorage/sessionStorage; không ghi chúng vào log hay ảnh bàn giao. Mỗi thành viên giữ trách nhiệm API confirm, idempotency, trạng thái đơn và cập nhật dữ liệu của feature mình.

## 5. Luồng QR và công cụ duyệt

QR hiển thị chỉ chứa JSON `{ qrId, nonce }`; pollSecret dành cho Web polling, không đưa vào QR. Phiên dự kiến 120 giây; giao diện tính thời gian theo expiresAt từ server, không tự cộng lại 120 giây cho QR đã hết hạn.

Web polling khoảng 2 giây, tối đa một yêu cầu đang chạy. PENDING tiếp tục chờ; APPROVED nhận phiên rồi điều hướng; REJECTED/hết hạn dừng. Backend có thể trả HTTP 410/QR_EXPIRED khi hết hạn. Rời trang/đổi tab/hủy phiên phải bỏ qua phản hồi cũ. Lỗi khởi tạo hiện thông báo và nút thử lại.

Script yêu cầu `QR_PASSWORD` qua biến môi trường; `QR_USER` mặc định an@demo.vn. Dùng đúng tài khoản seed hiện có, không giả định mật khẩu. Script đăng nhập với platform mobile rồi gọi confirm. Thông báo script duyệt thành công chưa chứng minh browser đã nhận phiên.

- Không truyền đối số: script tìm đúng một phiên PENDING trong Redis Docker; nhiều phiên sẽ từ chối để tránh duyệt nhầm.
- Truyền `qrId nonce`: chọn phiên cụ thể, không cần script đọc Redis local. Backend đích vẫn phải hoạt động.
- `API_BASE_URL` mặc định `http://localhost:3000/api`; `QR_REDIS_CONTAINER` mặc định `backend-redis-1`. Đổi theo môi trường thực tế.

## 6. Cách tự kiểm tra trên Web (Windows PowerShell)

### 6.1. Chuẩn bị dịch vụ

Với Backend đã cấu hình secret/env/database theo README, mở Docker Desktop và đợi Engine chạy. Không chạy lại script init/reset dữ liệu chỉ để thử giao diện. Nếu dùng cụm local:

```powershell
cd D:\PTPMHDV\Backend
docker compose up -d --build --wait --wait-timeout 180
Invoke-RestMethod http://localhost:3000/health
```

Kiểm tra Gateway/Auth/Redis sẵn sàng; luồng chi tiền cần thêm các dịch vụ nghiệp vụ liên quan. Nếu health không truy cập được, xử lý hạ tầng trước. Container one-shot migrate/init kết thúc mã 0 có thể là bình thường. Nếu Backend đã chạy ở máy khác, dùng địa chỉ môi trường đó.

Khởi động Frontend ở terminal khác:

```powershell
cd D:\PTPMHDV\Frontend
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = 'http://localhost:3000/api'
npm run dev
```

Mở đúng URL Vite in ra (thường http://localhost:5173). Dùng nhất quán hostname localhost; không trộn localhost và 127.0.0.1 khi kiểm tra cookie. Mỗi tài khoản nên dùng browser profile riêng; các tab thông thường cùng origin chia sẻ cookie.

### 6.2. Mật khẩu, khôi phục phiên và quyền

1. Mở `/sign-in` trong cửa sổ riêng tư; nhập sai mật khẩu: thấy lỗi tiếng Việt, không vào `/app`.
2. Nhập tài khoản hợp lệ: USER vào `/app`, ADMIN vào `/admin`. Trong lúc đang gửi, bấm đúp không tạo đăng nhập đồng thời.
3. F5 sau khi đăng nhập: phiên được khôi phục qua cookie, không tự lấy người dùng từ fixture.
4. USER truy cập `/admin`: bị guard chặn; đồng thời Backend phải từ chối API quản trị trái quyền.
5. Đăng xuất rồi F5/Back: không được khôi phục lại phiên đã đăng xuất. Dùng tài khoản khác để kiểm tra phản hồi phiên cũ không ghi đè tài khoản mới.

### 6.3. QR được duyệt, hết hạn và đổi tab

Mở duy nhất một QR ở `/qr-login` hoặc tab QR của `/sign-in`. Chạy terminal sau để nhập mật khẩu không ghi thẳng vào lịch sử lệnh:

```powershell
cd D:\PTPMHDV\Frontend
$qrCredential = Get-Credential -UserName 'an@demo.vn' -Message 'Tai khoan seed de duyet QR'
$env:QR_USER = $qrCredential.UserName
$env:QR_PASSWORD = $qrCredential.GetNetworkCredential().Password
try {
  node .\scripts\qr-confirm.mjs
} finally {
  Remove-Item Env:\QR_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable qrCredential -ErrorAction SilentlyContinue
}
```

Nếu có nhiều QR hoặc không đọc Redis local, trong khối try thay lệnh node bằng ba dòng sau. Lấy hai giá trị tương ứng từ `data` của response `/auth/qr-login/init` trong DevTools Network; không chia sẻ response chứa pollSecret:

```powershell
$qrId = Read-Host 'qrId cua phien Web'
$qrNonce = Read-Host 'nonce cua phien Web'
node .\scripts\qr-confirm.mjs $qrId $qrNonce
```

Kỳ vọng: script duyệt thành công; Web nhận phiên ở lượt polling kế tiếp, vào đúng vai trò; F5 vẫn đăng nhập. Tạo QR khác và chờ hết khoảng 120 giây: polling dừng, có cách tạo lại; mã mới có qrId mới. Rời tab QR trước khi duyệt: phản hồi muộn không tự đăng nhập tab mật khẩu. Bật Offline khi tạo QR: hiển thị lỗi/thử lại, không báo hết hạn giả; tắt Offline rồi thử lại.

### 6.4. PIN gắn đơn và phản hồi muộn

1. Dùng tài khoản thử nghiệm đã thiết lập PIN, đủ điều kiện giao dịch. Ở `/app/transfer`, chọn người nhận hợp lệ và tiền hợp lệ, tạo đơn rồi mở PIN.
2. DevTools Network: kiểm tra `/auth/pin/verify` gửi paymentId và amount đúng đơn vừa tạo; không có mã tự sinh thay đơn. Không chụp/lưu PIN hoặc token.
3. PIN đúng: nhận token rồi caller mới gọi confirm; chỉ báo thành công sau confirm thành công.
4. PIN sai: thấy lỗi/số lần còn lại theo Backend; không được gọi confirm. Đóng/mở lại cùng đơn không tạo đơn khác chỉ để mở modal.
5. Dùng Network throttling làm chậm verify rồi đóng modal: phản hồi về muộn không gọi confirm/hiển thị biên nhận. Lặp lại khi chuyển tài khoản bằng quy trình phiên của ứng dụng.
6. A3: chỉ dùng tài khoản thử riêng để kiểm tra sai 5 lần/khóa 30 phút; đóng mở, F5 và gọi API vẫn phải bị Backend chặn trong thời gian khóa.
7. A4: dùng harness/API test đã được nhóm thống nhất để thử cùng token lần hai, sau 60 giây, đổi paymentId hoặc amount. Backend phải từ chối; xác minh không có giao dịch/ghi sổ trùng. Luồng UI thành công một lần chưa đủ kết luận A4.

Đối với màn của Khoa/Hữu/Nguyên, áp dụng cùng contract PIN và phối hợp chủ nhiệm màn hình nghiệm thu nghiệp vụ; tài liệu này không thay thế bàn giao các feature đó.

## 7. Lệnh kiểm tra và việc còn lại

Chạy từ Frontend khi có thay đổi mã nguồn:

```powershell
npm run check
npm run test:unit
node scripts/check-thin-pages.mjs
```

`check` hiện chạy Node tests, không phải Vitest; vì vậy cần lệnh test:unit riêng. Kiểm tra page mỏng cũng là lệnh riêng. Không ghi “toàn bộ đạt” nếu một bước chưa chạy hoặc còn lỗi.

Việc còn lại của Đạt: nghiệm thu Web/Gateway thật theo mục 6; ghi nhận A3/A4/Q1 bằng kết quả thật; rà fixture của Auth store và cấu trúc Auth/QR theo luật frontend. Khi thay đổi contract tiếp, sửa lại tài liệu này ở một lượt riêng. Không mở rộng sang sửa nghiệp vụ của thành viên khác chỉ để làm xanh kiểm thử.

Biên bản nghiệm thu nên ghi: ngày, phiên bản FE/BE, môi trường, tài khoản thử đã che thông tin, ca thử, kết quả mong đợi/thực tế và requestId nếu có lỗi. Không lưu cookie, Authorization, PIN, token hay secret vào biên bản.
