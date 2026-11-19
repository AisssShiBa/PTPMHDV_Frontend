# Bàn giao Auth, PIN và QR Web — Đạt (Đ20)

Người phụ trách: Đạt. Phạm vi: hướng dẫn tích hợp phần Auth/PIN/QR của Đạt cho nhóm; không xác nhận hoàn thành nghiệp vụ Payment, Funding hoặc Utilities của thành viên khác.

## 0. Đối chiếu nhiệm vụ Tuần 4 của Đạt: đã hoàn thành và việc còn lại

Nguồn yêu cầu: [bản rà soát Tuần 4 theo từng thành viên](../../../FinVault_Ra_Soat_Nhiem_Vu_Tuan_4_Theo_Tung_Thanh_Vien.docx), các mục Đ17–Đ24. File Word là biên bản ở thời điểm trước sửa; các dòng lỗi biên dịch, chưa chạy Q1/Gateway trong đó không còn phản ánh đầy đủ source và bằng chứng hiện tại. Bảng này đối chiếu đúng phạm vi Đạt, không suy ra feature của người khác đã hoàn thành.

| Mã | Phần đã hoàn thành theo nhiệm vụ Tuần 4 | Phần còn lại / người xử lý | Kết luận |
| --- | --- | --- | --- |
| Đ17 — đăng nhập, đăng xuất, khôi phục phiên, quyền | Auth gọi API thật; chờ initialize, chia sẻ refresh và chặn phiên cũ ghi đè. An/Admin đã có nghiệm thu Web, cookie HttpOnly, F5/logout và quyền; đã sửa đường dẫn quay lại. Đã bỏ mật khẩu ghi sẵn ở hai nút demo | Chủ feature chuyển các test còn dùng MOCK_USER; sau đó Đạt bỏ import/export fixture khỏi store. Logout qua UI sau lần tích hợp form cuối chưa chạy lại; có bằng chứng UI logout ở lượt trước | Chức năng chính đã đạt; chưa đóng toàn bộ Đ17 vì còn fixture và mốc nghiệm thu cuối |
| Đ18 — PinModal và luồng PIN thật | Hết lỗi trùng biến/import/setter/format; props paymentId/amount bắt buộc; không sinh đơn/tiền dự phòng. Đã sửa rollback bộ đếm PIN, A3 khóa 5 lần/30 phút và A4 token 60 giây/chống sai đơn, sai tiền, replay có bằng chứng API/database thật | Đạt kiểm UI status/setup/change/khóa và phản hồi muộn trên bản tích hợp cuối; Khoa/Hữu/Nguyên nghiệm thu call site với mã đơn/số tiền thật trong feature của mình | Lỗi code chính đã sửa; chưa chốt trọn nghiệm thu PIN qua mọi UI/call site |
| Đ19 — QR và script duyệt | QR đúng qrId/nonce, không lộ pollSecret; script mobile duyệt An/Admin, F5 giữ phiên. Trang QR đã đo hết hạn thật 120 giây, dừng poll và mã cũ bị 410. Confirm thiếu token bị chặn; có tạo lại, hủy request, chống duyệt muộn, xử lý Offline. Hai màn dùng chung query/hook/panel; lint đạt | Các ca mở rộng như auto-discovery Redis, REJECTED live, nhiều client cùng polling và đo 120 giây riêng ở tab SignIn chưa được nghiệm thu live; không ghi chúng là đã chạy | Đạt các tiêu chí cốt lõi Đ19 trong Word; các ca mở rộng còn phải ghi rõ phạm vi kiểm |
| Đ20 — nền chung, chất lượng, bàn giao | Đã gỡ lỗi chặn lint/typecheck/build, mã lỗi trùng; hai page Auth/QR không còn API/polling trực tiếp và dùng public entry. Có contract, cách kiểm, người nhận và bằng chứng trong tài liệu này. Check/Vitest/thin-pages có kết quả đạt theo từng mốc bên dưới | Chủ feature hoàn thiện bàn giao/kiến trúc của phần mình, gồm home.md còn placeholder; Đạt phối hợp rà contract/OpenAPI và cảnh báo có giá trị. Chunk trên 500 kB chưa được phân tích/tối ưu | Phần sửa Auth và gỡ blocker đã làm; chưa chứng nhận chất lượng/kiến trúc toàn dự án |
| Đ21 — Gateway utilities/funding/header giả | Utilities tới đúng service; funding có xác thực, exact GET callback public; A5, alias-create, cash-out create/status và QR confirm có kiểm tra request thật. Test Gateway lưu trong repo 4/4; không tin header client giả | Khoa sửa ownership đọc ví khác chủ; chủ User/Wallet đối chiếu profile/ví 404. Đạt probe lại sau khi các bản sửa đó được gộp; không tự sửa nghiệp vụ Wallet | Các ca Gateway thuộc Đạt đã đạt trong phạm vi kiểm; không đồng nghĩa toàn hệ thống phân quyền đã đạt |
| Đ22 — test trình duyệt và nghiệm thu | Auth/QR có nhiều lượt Chrome/Backend thật, mới nhất 12 nhóm tích hợp cùng 5 kiểm tra mật khẩu/bố cục. A3/A4 có bằng chứng thật; file Frontend Auth 18/18, Node suite 64/64, Vitest 211/211 | Chưa có kết quả mới chạy trọn test:browser và test:phase3:live trên cùng revision tích hợp. Cần phối hợp luồng chuyển An→Bình và PIN/UI; kiểm lại profile/ví đang có 404. Phân biệt API-only với thao tác UI | Chưa đóng Đ22; thiếu nghiệm thu toàn luồng, không kết luận mọi phần còn lại là lỗi code Auth |
| Đ23 — tải checkout/confirm | Chưa xác nhận thêm kết quả tải trong đợt sửa này | Nếu giữ: chuẩn bị/chạy 50 người ảo trong 5 phút, ghi p95 checkout/confirm, tỷ lệ lỗi và môi trường. Nếu cắt hạng mục Could: nhóm phải ghi quyết định, không ghi PASS | Chưa xác nhận hoàn thành; chưa tự quyết định cắt |
| Đ24 — diễn tập, slide, video | Word ghi có runbook/video một phần; đợt Auth này không thay đổi hoặc nghiệm thu thêm artifact đó | Đạt điều phối hai lượt demo khoảng 15 phút liên tiếp cùng revision; nhóm hoàn thiện slide/video/seed manifest và biên bản | Chưa xác nhận đủ tiêu chí; đây là bàn giao/diễn tập, không phải lỗi code Auth |

### Việc còn cần sửa code, kiểm tra và phối hợp

- Code còn lại trong Auth: giữ export MOCK_USER để test hiện có không hỏng; chỉ xóa tại useAuthStore.ts sau khi chủ feature chuyển hết import trên revision thực sự merge. Không xóa trước để làm "sạch" store nhưng gây lỗi cho nhóm.
- Việc kiểm tra của Đạt: đóng nghiệm thu UI PIN và logout ở mốc tích hợp cuối; chạy các suite trình duyệt đúng yêu cầu Đ22 sau khi dữ liệu/service liên quan sẵn sàng. Chỉ sửa phần Auth hoặc harness Auth nếu tái hiện được lỗi, không viết lại nghiệp vụ thành viên khác.
- Việc phối hợp: Khoa xử lý ownership Wallet; chủ User/Wallet kiểm tra An có định danh Auth đúng nhưng profile/ví trả 404; Khoa/Hữu/Nguyên xác nhận call site PIN. Chủ các feature chuyển test fixture, hoàn thiện handover và xác nhận contract của mình.
- Việc chất lượng chưa chốt: phân tích cảnh báo chunk trên 500 kB trước khi quyết định tối ưu; không tăng ngưỡng cảnh báo hoặc tắt lint để ghi đạt. Rà các handover/contract còn thiếu theo trách nhiệm tích hợp Đ20.
- Việc môi trường kiểm thử: một lượt trước có báo lỗi cleanup phiên mobile; cần đối chiếu đúng các phiên thử của Đạt trước khi tuyên bố đã thu hồi mọi phiên lịch sử. Không tự thu hồi phiên khác của người dùng.
- Đ23/Đ24 giữ thành đầu việc riêng như bảng; chưa có bằng chứng không đồng nghĩa đã xác nhận source có lỗi.

Phần code Auth/QR vừa làm đã nối vào cả hai page và qua kiểm tra đã liệt kê; không còn cần viết lại phần đăng nhập/QR chỉ vì trạng thái cũ trong Word. Có thể bàn giao phần sửa đã kiểm chứng để review/merge, nhưng chưa đánh dấu hoàn thành toàn bộ Đ17–Đ24. Các file query/hook/component mới phải đi cùng các page/public entry sử dụng chúng. Thay đổi import cục bộ ở dashboard.test.tsx nằm ngoài gói Auth dự kiến; Đạt không tiếp tục sửa feature đó. Chi tiết bằng chứng, giới hạn và lệnh kiểm tra nằm ở các mục sau.

## 1. Trạng thái và bằng chứng

Tài liệu cập nhật ngày 17/11/2026. Frontend nền `e5cf5f5` có các sửa cục bộ ở Auth store, API/query/hook/component Auth, public entry, guards, hai trang đăng nhập và các test đã liệt kê bên dưới. Các file Auth mới vẫn cần được đưa vào commit cùng các trang sử dụng chúng; commit nền chưa chứa phần tái cấu trúc này. Backend nền `bbdf0e6` có sửa cục bộ ở `services/auth-service/src/services/pinService.ts`, `src/controllers/qrLoginController.ts` và `tests/security.test.ts` trong auth-service, cùng `gateway/tests/funding-auth.test.ts`; Auth đã được build/khởi động lại sau sửa. Thay đổi Gateway mới nhất chỉ bổ sung test, không thay middleware đang chạy. Phân biệt các test tự động với nghiệm thu browser/API/database thật trong từng dòng, không coi số commit nền là đã chứa các sửa chưa commit.

| Kiểm tra | Kết quả gần nhất | Giới hạn |
| --- | --- | --- |
| `npm run check` trước khi thêm 3 test QR | Exit 0: lint, typecheck, Node tests 61/61, build thành công | Bằng chứng trước lượt chỉ sửa test; chưa ghi là đã chạy lại toàn check với 64 test. Lint còn cảnh báo, build cảnh báo chunk trên 500 kB; không bao gồm Vitest/browser |
| `npm test` sau khi thêm 3 test QR | 64/64 Node test đạt | Chạy lại toàn Node suite; không đồng nghĩa chạy lại build, Vitest hoặc browser |
| Vitest sau khi nối SignInForm vào page | 28 file, 211/211 test đạt trên source mới nhất đã kiểm tra | Chạy riêng bằng CLI, không nằm trong npm run check; không thay browser/Backend thật |
| `node --import ./tests/register.mjs --test tests/auth-api.test.ts` | Frontend Auth 18/18 đạt, gồm hai ca phiên mới và ba ca QR | 15 ca trước + 3 ca QR mới; nằm trong tổng 64 Node test. Phân biệt với suite Auth service Backend 18/18 bên dưới |
| Vitest chọn hai file axios/transactionSafety sau đổi import fixture | 11/11 test đạt | Xác nhận test lấy fixture trực tiếp vẫn hoạt động |
| Kiểm tra khả năng bắt hồi quy | Hai ca mới đều fail khi đưa hành vi store cũ vào bộ nhớ | Không sửa store trên đĩa; chứng minh test phát hiện được lỗi đã sửa |
| `src/test/transactionSafety.test.tsx` | 7/7 đạt | Gồm 5 ca an toàn PIN và 2 ca VNPAY return |
| Kiểm tra bổ sung sau sửa merge, trong bộ nhớ | 3/3 hành vi PIN và 5/5 mã lỗi đạt | Gửi verify đồng thời; đóng X/phản hồi muộn; countdown bằng đồng hồ điều khiển; mã lỗi duy nhất, tiếng Việt và giữ traceId |
| Kiểm tra bổ sung QR trước đợt pull | QR page 7/7, SignIn 11/11, qr-confirm 15/15 đạt | Bằng chứng lịch sử, chưa chạy lại trong đợt sửa merge; không có file test lưu trong repo |
| `node scripts/check-thin-pages.mjs` | Đạt ở lượt rà sau pull: 21 trang, 0 lỗi axios, 0 cảnh báo Number | Script chỉ kiểm tra các mẫu này, không kiểm hết API import, query hooks hoặc đóng gói feature |
| Browser Chrome thật + Web dev + Gateway thật (Đ17) | 15/15 kiểm tra đạt: 5 luồng khách và 10 luồng phiên An/Admin | Bằng chứng trước khi đổi hai nút thành chọn email; chưa chạy lại đăng nhập thật sau thay đổi đó |
| Đ17: chọn tài khoản thử trên SignInPage | 5 nhóm hành vi trên Chrome đạt; build production trong bộ nhớ loại bỏ phần chọn email | API giả lập; không chứng minh đăng nhập seed thật, không có test file mới trong repo |
| Đ17: chọn tài khoản thử + đăng nhập thật sau sửa SignInPage | 16/16 nhóm live đạt trên Chrome/Web/Gateway thật: 8 nhóm cho mỗi An/Admin | Hai profile riêng, chỉ Auth và request đọc; không thay thế các ca QR/PIN hoặc nghiệm thu mọi trường hợp phiên đồng thời |
| Gateway thật, request đọc không có Bearer (Đ21, lượt trước) | 4/4 bị từ chối 401, gồm header giả | Bằng chứng cũ, được bổ sung bằng nhóm Bearer hợp lệ bên dưới |
| Đ21: Gateway/proxy với Bearer thật | 14 nhóm kiểm tra live đạt, gồm A5, alias-create, cash-out create/status và utilities | Phát hiện riêng lỗi đọc ví chéo chủ ở Wallet; không chốt toàn bộ phân quyền hệ thống đạt |
| Pipeline sanitize/authenticate và whitelist funding | `gateway/tests/funding-auth.test.ts`: 4/4 đạt; Gateway TypeScript không lỗi | Máy chủ HTTP tạm với middleware thật và khóa test trong RAM; không gọi proxy/dịch vụ nghiệp vụ hoặc database |
| Sau khi tách Auth/QR vào feature | 12/12 nhóm Auth/QR live và 5 kiểm tra mật khẩu/bố cục live đạt | Các nhóm chạy riêng; không cộng với bằng chứng cũ thành một suite duy nhất; logout ở lượt cuối là cleanup API |
| QR Login trên Chrome/Gateway thật (Đ19, Q1) | 14/14 kiểm tra live đạt: 9 luồng duyệt/an toàn và 5 luồng hết hạn/phục hồi | Script ở chế độ truyền rõ qrId/nonce; hết hạn 120 giây đo trên trang QR riêng; không phải số test trong repo |
| A3 trên API/database thật | 5 nhóm kiểm tra đạt sau sửa PinService | Chỉ khóa tài khoản thử riêng; chưa thay thế nghiệm thu mọi màn PIN trên browser |
| Auth service: TypeScript + security/rateLimiter/qrLogin | 0 lỗi TypeScript; 18/18 test độc lập đạt | Suite Auth đầy đủ còn phụ thuộc môi trường auth_test/Gateway, chưa chốt toàn bộ npm test đạt |
| Test khóa/ký token Auth và test consumer Payment độc lập | Mỗi file 1/1 đạt | Khóa test trong RAM; các test này không tự chứng minh ledger chống chi trùng |
| A4 qua Gateway/Auth/Payment/Wallet và database thật | 12 bước kiểm tra hoàn tất, gồm cấp tiền test và đối chiếu cuối | 11 bước đầu trong runner; bước số dư/thu hồi chạy tiếp riêng sau khi sửa cách đọc chuỗi tiền có .00; không phải 12 test trong repo |

Lỗi CommonJS/ES module của `scripts/init-secrets.js` đã được xử lý. Kết quả framework Backend 1/4 trước đây thuộc lúc PostgreSQL chưa truy cập được, không phải kết quả mới của cụm đang chạy. Trong lượt nghiệm thu Đ17, Docker Desktop đã được mở, các dịch vụ lên healthy và Gateway health trả 200. Auth/Gateway đã build lại; build toàn cụm dừng ở phần MinIO, sau đó Compose chạy với image sẵn có (`up -d --no-build --wait --wait-timeout 180`). Không khẳng định mọi image nghiệp vụ đều được build lại cùng revision. Giữ nguyên volume, không chạy seed/reset; các job migration/khởi tạo của Compose chạy theo cấu hình hiện có. Chưa chạy lại framework có bước reset dữ liệu.

Phần tách hai trang Auth/QR đã nối xong: SignInPage còn 61 dòng, QrLoginPage còn 46 dòng, dùng component qua public entry của Auth; không còn API hoặc polling trực tiếp trong hai page. Tạo QR/đọc trạng thái dùng TanStack Query; form mật khẩu dùng mutation gọi action signIn hiện có để giữ các chốt phiên. Store vẫn có fixture/export `MOCK_USER`; kiểm kê working tree hiện tại còn 10 file test phụ thuộc export cũ. Đạt không tiếp tục sửa test của feature khác; chủ feature chuyển import rồi Đạt mới bỏ export tương thích. Thay đổi import cục bộ ở dashboard.test.tsx từ lượt trước nằm ngoài gói Auth dự kiến, nên bản commit chỉ Auth có thể vẫn còn 11 nơi dùng; phải quét lại trên revision thực sự merge. Đây không phải bằng chứng đăng nhập đang tạo phiên giả. `check` và thin-pages đạt không chứng minh mọi quy tắc kiến trúc của toàn dự án đã đạt.

### Các hồi quy merge đã sửa

- PinModal: bỏ setter không tồn tại, dùng deadline Backend để tính countdown; khôi phục chốt chống verify đồng thời, nhãn ô PIN và xử lý đóng thống nhất. Giữ giao diện mới của nhóm.
- apiResponse: khôi phục đúng một lần cho mỗi mã PIN_NOT_SETUP, INVALID_PIN, TXN_TOKEN_MISMATCH, TXN_TOKEN_REUSED, IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD. Thông báo token đã dùng yêu cầu kiểm tra trạng thái, không khuyến khích gửi lại.
- Ca kiểm thử PIN sai không có remainingAttempts nay hiển thị đúng thông báo, xóa ô nhập và không gọi confirm. Test đạt không có nghĩa các call site đều tự dùng helper này; chủ feature cần kiểm tra luồng thực tế.

### Đ17/Đ22 — bảo vệ phiên mới và test hồi quy

Trong `useAuthStore.ts`, mỗi lần đăng nhập giữ một mốc `current`; `generation` thay đổi khi trạng thái xác thực bị thay thế/xóa. Sau khi chờ refresh dùng chung, store kiểm tra lại mốc trước khi gọi signin. Nếu lần đăng nhập đã mất hiệu lực, hàm trả false và không gửi request cũ. Catch chỉ hiện thông báo lỗi khi mốc còn khớp, nên lỗi về muộn không làm nhiễu phiên mới.

Hai ca đã lưu tại [tests/auth-api.test.ts](../../tests/auth-api.test.ts):

1. Giữ refresh đang chờ bằng Promise, bắt đầu đăng nhập, nhận phiên mới qua setSession rồi mới trả refresh. Yêu cầu chỉ có request refresh, signin cũ trả false, tài khoản/token mới được giữ và loading được giải phóng.
2. Giữ signin đang chờ, nhận phiên mới rồi cho request cũ trả lỗi. Yêu cầu không hiện toast cũ và không đổi phiên mới; thử thêm lần đăng nhập sai còn hiệu lực vẫn phải báo lỗi. Mock toast tự được khôi phục khi hết test.

Promise điều khiển thứ tự phản hồi, không dùng thời gian chờ phỏng đoán. Bản sửa chặn request chưa gửi sau khi chờ refresh và lọc lỗi muộn; không hủy một request đã gửi, cũng không tự chứng minh refresh cookie/Backend thật an toàn trong mọi tình huống. Phần đó vẫn cần nghiệm thu live.

### Đ19/Đ22 — ba test hồi quy QR đã lưu trong file Auth hiện có

Đã thêm ba test vào [tests/auth-api.test.ts](../../tests/auth-api.test.ts), chỉ thay file test, không đổi hành vi Web:

1. `QR creation fails offline without pausing and reconnect requires explicit retry`: MutationObserver và onlineManager chạy cấu hình mutation thật; API init được giả lập. Offline phải gọi API một lần và nhận lỗi thay vì pause; reconnect không tạo thêm phiên, thao tác retry mới tạo phiên và truyền đúng signal. Cleanup giải phóng mutation/client, khôi phục API và trạng thái online kể cả khi assertion fail.
2. `QR init and polling forward cancellation and reject a late response after abort`: dùng adapter giả và Promise điều khiển thứ tự. Kiểm signal của cả POST init và GET status, đường dẫn QR được encode, pollSecret đúng query/header. Sau abort, response về muộn phải bị Axios từ chối do hủy.
3. `already-aborted QR init and polling never reach the adapter`: signal đã abort trước lời gọi; cả hai API bị từ chối và bộ đếm adapter vẫn bằng 0.

Kết quả: file Frontend Auth 18/18 đạt; toàn bộ Node suite qua npm test 64/64 đạt. ESLint đã chạy riêng với --no-ignore vì cấu hình mặc định bỏ qua thư mục tests. Đã kiểm kiểu TypeScript gồm chính file test bằng compiler program trong RAM, không phát sinh file output; typecheck project cũng đạt. Không suy ra chỉ lệnh npx tsc ở root đã bao phủ toàn bộ test.

Kiểm tra khả năng bắt hồi quy chỉ thay mã nạp trong RAM của tiến trình con:

- Nạp networkMode online thay cho always: test Offline fail, hai test hủy vẫn pass (1 fail/2 pass).
- Bỏ signal ở request polling: hai test hủy fail, test Offline vẫn pass (2 fail/1 pass).

Các tiến trình con kết thúc mã 1 đúng mong đợi; đây là phép thử độ nhạy, không phải lỗi còn tồn tại trên source đã sửa. Không sửa file ứng dụng trên đĩa, không gọi Backend/Docker, không tạo tài khoản, phiên thật hay file test/log phụ. Các test này không thay bằng chứng Chrome, hết hạn 120 giây thật hoặc tính nguyên tử của Backend.

### Đ17 — kết quả nghiệm thu Web/Backend thật

Môi trường: Chrome headless với profile tạm riêng; Web Vite tại `http://localhost:5173`, mock tắt; Gateway `http://localhost:3000/api`. Tài khoản An và Admin đã tồn tại. Đã tìm được cấu hình seed phù hợp tại `Backend/scripts/setup-two-users.mjs`, đối chiếu hash chỉ đọc rồi dùng thông tin trong bộ nhớ để điền form. Không ghi mật khẩu, token hoặc cookie vào tài liệu/source/log; không đổi mật khẩu, vai trò hay số dư. Profile tạm đã xóa; không lưu ảnh/video hoặc file minh chứng theo yêu cầu không tạo file phụ.

Các kết quả trực tiếp:

- Khách mở `/admin` hoặc `/app/profile` được đưa về đăng nhập. Thông tin đăng nhập của một tài khoản thử không tồn tại bị trả 401 và hiện lỗi tiếng Việt.
- Khách F5 vẫn ở đăng nhập, chỉ một refresh cho lần tải được đo; không có refresh cookie hoặc khóa storage nhạy cảm trong kịch bản này.
- An đăng nhập qua form vào `/app`, đúng vai trò USER. Refresh cookie có HttpOnly và path `/api/auth`; access token hiện tại không nằm trong localStorage/sessionStorage.
- An F5: cùng user ID, một refresh cho lần tải được đo, giá trị refresh cookie thay đổi. USER gọi `/api/admin/dashboard` bị 403 và mở `/admin` được chuyển `/403`.
- An đăng xuất qua menu giao diện: cookie bị xóa; F5 vẫn ở đăng nhập.
- Admin đăng nhập qua form vào `/admin`, đúng vai trò ADMIN; API dashboard trả 200. F5 giữ cùng user ID và vai trò; access token hiện tại không nằm trong storage.
- Admin đăng xuất bằng nút giao diện: cookie bị xóa; mở lại `/admin` phải đăng nhập. Không có exception JavaScript chưa bắt trong các luồng đã thử.

Đ21 bổ sung: GET `/users/me` không Bearer; GET `/users/me` có bộ header giả; GET `/admin/dashboard` giả vai trò ADMIN; GET `/auth/pin/status` giả cờ gateway đều bị Gateway trả 401/UNAUTHORIZED. Các header giả không cấp quyền trong bốn ca này. Nhóm bốn ca này chỉ kiểm trường hợp chưa đăng nhập; ma trận Bearer hợp lệ và các route funding/utilities đã được bổ sung ở mục Đ21 bên dưới.

### Đ17 — hai nút tài khoản thử đã đổi thành chọn email

Trước sửa, hai nút An/Admin gọi onSubmit ngay với mật khẩu ghi sẵn khác cấu hình seed, khiến thao tác đăng nhập thất bại. [SignInPage.tsx](../../src/pages/SignInPage.tsx) hiện chỉ hiện phần chọn tài khoản trong development (`import.meta.env.DEV`). Hai nút điền email; người dùng nhập mật khẩu hiện tại rồi bấm Đăng nhập. Không nhúng mật khẩu seed vào source hoặc biến môi trường VITE để gửi xuống browser.

Hàm selectDemoAccount chặn khi loading, dùng resetField cho từng ô để điền email và xóa mật khẩu/lỗi nhập cũ, che mật khẩu và focus ô password. Reset từng ô giữ tham chiếu input cho setFocus; cách reset toàn form đã làm mất focus trong lần thử ban đầu nên được thay và kiểm lại. Nút có type button nên không submit form khi chọn tài khoản.

Năm nhóm hành vi trên Chrome đã đạt với Web thật và API giả lập trong bộ nhớ:

1. Chọn An điền đúng email, xóa mật khẩu cũ, chuyển về kiểu password, focus đúng ô; không gửi signin.
2. Chuyển sang Admin cũng xóa mật khẩu trước đó và không gửi signin.
3. Submit khi mật khẩu trống hiện yêu cầu nhập mật khẩu, không gửi signin.
4. Submit với dữ liệu tự nhập gửi đúng email/password và platform web; hai nút chọn bị khóa trong lúc chờ, bấm không đổi tài khoản hoặc tạo request thứ hai.
5. Sau response từ chối đăng nhập, có thể chọn lại tài khoản và mật khẩu được xóa; không có exception JavaScript chưa bắt trong các luồng đã thử.

Đã chạy riêng build với NODE_ENV=production, giữ output trong bộ nhớ, xác nhận nội dung chọn tài khoản bị loại khỏi bundle. TypeScript (`npx tsc --noEmit` và typecheck theo project references), ESLint riêng file và diff check đạt sau sửa. Profile Chrome tạm đã xóa, không tạo file test/báo cáo trong workspace. Năm nhóm này là bằng chứng hành vi UI với API giả lập; đã bổ sung 16 nhóm live sau sửa ở mục kế tiếp. Bộ 15 kiểm tra live phía trên vẫn là bằng chứng của lượt trước, không đổi số đếm để gộp các lượt chạy. Ở lượt bằng chứng này Đ17 còn fixture và kiến trúc Auth/QR; phần tách hai page đã được hoàn tất và kiểm lại ở mục cập nhật bên dưới. Fixture vẫn cần phối hợp trước khi chốt hoàn thành toàn bộ.

### Đ17/Đ22 — kiểm tra lại Backend thật sau sửa chọn email

Ngày 17/11/2026, đã chạy lại trên Chrome headless với profile tạm riêng cho An và Admin, Vite tại http://localhost:5173 (mock tắt), Gateway tại http://localhost:3000/api. Frontend nền e5cf5f5 kèm sửa cục bộ SignInPage/Auth store; Backend nền bbdf0e6 kèm các sửa cục bộ đã nêu đầu tài liệu. Docker Desktop được mở, Compose `up -d --no-build --wait --wait-timeout 180` hoàn tất; các service dài hạn healthy, Gateway health 200, các job init/migrate kết thúc mã 0. Dùng image sẵn có, không tuyên bố build lại mọi service từ source hiện tại; không seed/reset hoặc xóa volume.

Kết quả 16/16 nhóm đạt, gồm cùng 8 nhóm cho mỗi tài khoản:

| Nhóm | An (USER) | Admin (ADMIN) |
| --- | --- | --- |
| Chọn email | Đúng an@demo.vn, xóa mật khẩu cũ, che mật khẩu, focus ô password; không gửi signin | Đúng admin@demo.vn và cùng hành vi |
| Mật khẩu trống | Validation chặn trước API | Validation chặn trước API |
| Đăng nhập qua form thật | Một signin thành công, đúng email/userId/USER, vào `/app` | Một signin thành công, đúng email/userId/ADMIN, vào `/admin` |
| Cookie và storage | Refresh cookie HttpOnly, path `/api/auth`; access token hiện tại không nằm trong localStorage/sessionStorage | Cùng kết quả |
| API quản trị thật | GET `/api/admin/dashboard` bị 403 | GET `/api/admin/dashboard` trả 200 |
| F5 khi đăng nhập | Giữ userId/role; đúng một refresh trong lần tải đo được; cookie được xoay, token hiện tại không nằm trong storage | Cùng kết quả |
| Đăng xuất trên UI | Menu tài khoản gọi signout thành công, về `/sign-in`, cookie bị xóa | Nút Đăng xuất Quản trị cho cùng kết quả |
| F5 sau đăng xuất | Vẫn ở form đăng nhập, không còn userId/cookie; không có exception JavaScript chưa bắt trong các luồng đã thử | Cùng kết quả |

Lần chạy đầu dừng sau 6 nhóm của An vì thao tác DOM click trong harness không mở menu dropdown. Đã đổi sang sự kiện chuột Chrome qua CDP và chạy lại toàn bộ, kết quả 16/16; không sửa component ứng dụng để làm test đạt. Phiên của lần dừng đã được signout qua API trong cleanup, hai phiên của lần chạy hoàn chỉnh đăng xuất qua UI. Tất cả profile Chrome tạm đã xóa. Credential seed chỉ được đọc/dùng trong RAM, không ghi password/token/cookie vào source, báo cáo hay file phụ. Không tạo giao dịch hoặc thay đổi số dư, mật khẩu, vai trò của seed.

Kết quả này khép lại việc kiểm tra lại signin/F5/logout sau sửa hai nút. Không suy rộng thành toàn bộ Đ17/Đ22 đã hoàn thành: còn fixture và các ca nghiệm thu khác đã ghi riêng; trạng thái kiến trúc mới nhất nằm ở mục cập nhật tiếp theo. Docker và Vite được để chạy để Đạt có thể tự thử tiếp trên Web.

### Đ19 — QR Login đã kiểm tra với Backend thật

Đã chạy thêm hai nhóm kiểm tra trong bộ nhớ với Chrome thật, Web dev mock tắt và Gateway thật: 9 kiểm tra luồng duyệt/an toàn, 5 kiểm tra hết hạn/phục hồi. Không chỉnh đồng hồ hoặc TTL Redis, không sửa tài khoản seed. Dùng chính `scripts/qr-confirm.mjs` theo chế độ truyền qrId/nonce để duyệt, thông tin đăng nhập chỉ tồn tại trong bộ nhớ tiến trình.

Kết quả Q1 và các ca liên quan:

- Trang `/qr-login` tạo QR thật với DTO qrId/nonce/pollSecret/expiresAt. Kiểm tra dữ liệu truyền cho QRCodeSVG chỉ có qrId/nonce, không có pollSecret; đây là kiểm tra props, không phải thử camera điện thoại.
- Confirm thiếu access token bị 401; polling sai pollSecret bị 403; confirm sai nonce bị INVALID_NONCE và không duyệt được QR.
- Script duyệt An thành công; lượt polling của Web nhận đúng USER rồi vào `/app`, có refresh cookie HttpOnly. F5 giữ cùng user ID.
- QR đã được Web nhận phiên không dùng lại: status trả 410 và script confirm lại bị QR_EXPIRED.
- Tab QR trên `/sign-in` duyệt Admin qua script, vào `/admin`; F5 giữ đúng user ID/ADMIN.
- Chuyển từ tab QR về Mật khẩu trước khi duyệt: polling phiên cũ dừng; duyệt phiên cũ sau đó không làm tab mật khẩu tự đăng nhập.
- Ở `/qr-login`, TTL Redis đo được khoảng 120 giây. Đợi hết thời gian thật: UI báo hết hạn, polling cũ dừng và status API trả 410/QR_EXPIRED.
- Khi đã hết hạn, bật Offline rồi bấm làm mới: hiện lỗi inline và nút thử lại, không hiện hết hạn giả. Tắt Offline và thử lại: nhận qrId mới còn hiệu lực; mã cũ vẫn bị từ chối.
- Không có exception JavaScript chưa bắt trong các luồng đã thử. Đã đăng xuất các phiên mobile do script tạo và xóa profile browser tạm; không lưu mật khẩu, token, pollSecret, ảnh hoặc file báo cáo phụ.

Q1 có bằng chứng live trong các luồng trên. Chưa kết luận đã kiểm mọi trường hợp Đ19: chế độ script tự chọn Redis, trạng thái REJECTED, hết hạn 120 giây trên tab QR của SignIn và nhiều client cùng polling một pollSecret chưa được nghiệm thu live trong lượt này. Bằng chứng này thuộc trước tái cấu trúc; hai page đã chuyển sang component/hook dùng chung và được kiểm lại ở mục cập nhật bên dưới. Không dùng kết quả một browser làm bằng chứng chống mọi cuộc đua đồng thời ở Backend.

### Đ17/Đ19/Đ20/Đ22 — cập nhật sau khi nối component Auth vào hai page

Phần code trong lượt tái cấu trúc thuộc Đạt:

- [auth.api.ts](../../src/features/auth/api/auth.api.ts): initQrLogin/getQrStatus nhận AbortSignal tùy chọn và truyền xuống Axios; giữ endpoint, DTO và lời gọi cũ không có signal.
- [auth.queries.ts](../../src/features/auth/api/auth.queries.ts): mutation tạo QR không retry; networkMode always để Offline trả lỗi thay vì xếp hàng chờ mạng. Query trạng thái dùng refetchInterval 2 giây, dừng khi hết hạn/kết thúc hoặc lỗi HTTP 4xx, truyền signal xuống adapter. Query key không chứa pollSecret, gcTime bằng 0 khi không còn observer.
- [useQrLogin.ts](../../src/features/auth/hooks/useQrLogin.ts): quản lý tạo/đổi phiên, hủy request, countdown theo expiresAt và nhận duyệt một lần. Theo dõi Auth store để bỏ phiên QR cũ khi tài khoản thay đổi, kiểm deadline lần nữa trước khi nhận phiên; countdown dùng timer hiển thị, không dùng timer để gọi API.
- [QrLoginPanel.tsx](../../src/features/auth/components/QrLoginPanel.tsx): dùng chung cho trang QR và tab QR; có loading, QR/countdown, lỗi/thử lại, hết hạn và từ chối. QR chỉ chứa qrId/nonce; có chế độ compact.
- [SignInForm.tsx](../../src/features/auth/components/SignInForm.tsx): React Hook Form/schema, mutation gọi signIn của store; không tạo cơ chế token riêng. Khóa submit đồng thời, không retry; reset observer sau hoàn tất để bỏ bản sao credential trong mutation. Hai nút development chỉ điền email, xóa/che mật khẩu cũ và focus ô password; validation inline có aria-invalid/aria-describedby. Thông báo lỗi API vẫn do store xử lý, không thêm thông báo trùng.
- [guards.tsx](../../src/app/guards.tsx): RequireAuth lưu pathname/search/hash; RedirectIfAuthed dùng đường dẫn nội bộ đã lưu thay vì ghi đè về /app. Loại đường dẫn ngoài app, dấu backslash/ký tự điều khiển và đích Auth có thể điều hướng lặp; mặc định /app. ADMIN vẫn ưu tiên /admin, RequireRole tiếp tục chặn USER ở route quản trị.
- [public entry](../../src/features/auth/index.ts): công khai SignInForm và QrLoginPanel; SignInPage/QrLoginPage chỉ ghép UI và điều hướng. SignInPage dài 61 dòng, hàm trang 43 dòng; QrLoginPage dài 46 dòng. Form mật khẩu được unmount khi rời tab nên dữ liệu nhập của form không giữ qua lần chuyển sang QR rồi trở lại.

Bằng chứng được phân biệt theo phạm vi:

| Lượt kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Query/hook/panel QR trong bộ nhớ | 6 nhóm query, 10 nhóm lifecycle hook, 9 nhóm UI panel đạt ở các lượt riêng | API giả lập; timer/đồng hồ điều khiển không thay hết hạn thật |
| SignInForm trong bộ nhớ | 10/10 nhóm đạt; thêm một ca DEV=false ẩn picker đạt | Kiểm tra validation, bấm đúp, lock, vai trò, phản hồi muộn, Offline và dọn mutation; không phải đăng nhập seed thật |
| Guard trong bộ nhớ | 19 ca đích điều hướng + 2 ca giữ URL đầy đủ/chặn USER vào ADMIN đạt | Kiểm Router phía client, không thay kiểm quyền Backend |
| Trang /qr-login dùng panel mới | 11 nhóm live đã hoàn tất trước bước Offline; hết hạn 120 giây đo thật, dừng poll và Backend 410 | Runner dừng ở bước Offline do mutation mặc định bị pause; không ghi runner toàn bộ PASS |
| Sửa Offline tạo QR | Tái hiện cấu hình cũ trong RAM; 4 nhóm Chrome/Backend thật đạt sau networkMode always | Bật mạng không tự tạo QR; chỉ thao tác thử lại mới tạo đúng một phiên; không đổi networkMode toàn app |
| Sau khi nối SignInForm vào SignInPage | 12/12 nhóm Auth/QR live và 5 kiểm tra mật khẩu/bố cục live đạt | Hai lượt riêng; thử seed An/Admin với profile Chrome riêng, mock tắt |
| Cổng kiểm tra source sau tích hợp form, trước khi thêm 3 test QR | npm run check exit 0 với 61 Node test, Vitest 211/211 ở 28 file, thin-pages quét 21 trang không lỗi theo mẫu script | Sau đó chỉ thêm test: npm test 64/64 và Auth 18/18 đạt riêng. Còn lint warning và chunk trên 500 kB; chưa phân tích/tối ưu bundle hoặc đổi ngưỡng cảnh báo |

Các ca live sau nối form gồm: tab mật khẩu không tự tạo QR; chuyển sang QR có phiên thật; về mật khẩu dừng polling và không nhận duyệt cũ; quay lại tạo qrId mới; QR An/Admin vào đúng vai trò và F5 giữ đúng userId; form mật khẩu/chọn email/validation vẫn hoạt động; Offline hiện lỗi và nút thử lại, bật mạng không tự gửi, bấm thử lại tạo đúng một QR. Đăng nhập An từ /app/profile?tab=security#pin bằng cả mật khẩu và QR quay lại đúng URL; Admin vẫn về /admin. Form đã đo ở 390/768/1280 px: không tràn ngang, font input ít nhất 16 px, nút hiện mật khẩu ít nhất 44 px. Không có exception JavaScript chưa bắt trong các luồng cuối đã thử.

Có các lượt harness dừng trước khi hoàn thiện phép đo: init trả 201 trong khi bộ đọc ban đầu chờ 200; import trực tiếp store qua module URL trên Vite hot reload có thể đọc instance khác. Phép đo cuối dùng Bearer của request Web thực tế, so danh tính với Auth response của client mobile và kiểm URL/cookie, không dùng module store nhập thêm làm bằng chứng duy nhất. Những lỗi đo này được tách khỏi lỗi thật về Offline và guard; cả hai lỗi sản phẩm đã sửa và chạy lại.

Credential chỉ dùng trong RAM, không đưa vào source/VITE env, ảnh hoặc báo cáo. Các lượt cuối đăng xuất phiên Web/mobile qua API và xóa profile tạm; không tính cleanup API là đã chạy lại logout qua UI sau lần tích hợp cuối. Một lượt đo trước đó có báo lỗi cleanup phiên mobile; chưa đối chiếu toàn bộ session của các lượt đó nên không tuyên bố mọi phiên thử trong lịch sử đã được thu hồi. Không tạo giao dịch hoặc đổi số dư, mật khẩu, vai trò seed trong lượt Auth/QR này.

Phát hiện phối hợp ngoài Auth: khi thử An, GET /api/users/me và GET /api/wallets/me có lượt trả 404, dù đăng nhập/QR có đúng định danh Auth. Đây chưa phải kết luận lỗi source hay nguyên nhân provisioning; chủ User/Wallet cần đối chiếu userId Auth với hồ sơ/ví trên môi trường hiện chạy. Không dùng việc QR đăng nhập được để chốt nghiệp vụ profile/ví đạt; Đạt chưa sửa các service đó. Lỗi đọc ví chéo chủ đã ghi riêng bên dưới vẫn cần Khoa xử lý.

### Đ18/Đ22 — A3: lỗi rollback bộ đếm PIN đã được sửa

Tái hiện trước sửa: hai lần nhập sai đều báo còn 4 lượt, database vẫn ghi failedAttempts = 0. Nguyên nhân: PinService cập nhật số lần sai rồi throw AppError ngay trong callback Prisma transaction, khiến bản cập nhật bị rollback.

[PinService](../../../Backend/services/auth-service/src/services/pinService.ts) hiện trả kết quả lỗi dự kiến từ callback để commit số lần sai/khóa, sau đó mới throw ở ngoài transaction. Vẫn giữ SELECT FOR UPDATE để xếp hàng các yêu cầu cùng user. Lỗi database ngoài dự kiến vẫn rollback.

Kết quả API/database thật sau sửa: số lần sai lưu 1..5; lần thứ 5 khóa 30 phút; lần thứ 6 nhập PIN đúng vẫn bị chặn và không kéo dài deadline; status xác nhận khóa, đổi PIN không vượt khóa. PIN đúng khi chưa khóa reset bộ đếm và cấp token 60 giây. Sáu request sai đồng thời cho 4 INVALID_PIN, 2 PIN_LOCKED, database dừng ở 5 lần sai.

[security.test.ts](../../../Backend/services/auth-service/tests/security.test.ts) có ba ca A3 lưu trong repo: commit số lần sai/khóa; chặn cả PIN đúng trong thời gian khóa; rollback lỗi database và giữ lỗi gốc. Mock transaction chỉ commit khi callback kết thúc bình thường, được khôi phục sau test và không dùng DB thật. Khi nạp PinService cũ trong RAM, test commit bộ đếm fail, hai test kiểm soát còn lại pass; bản sửa đạt cả ba. Đây là test hồi quy, tách biệt với bằng chứng API/database thật.

Đã sửa lỗi kiểu qrId tại [qrLoginController.ts](../../../Backend/services/auth-service/src/controllers/qrLoginController.ts): kiểm tra chuỗi không rỗng trước service, bỏ ép kiểu pollSecret. Auth service hiện typecheck sạch; 15 test độc lập cũ cùng 3 test A3 thành 18/18 đạt. Không tuyên bố toàn bộ suite tích hợp Auth đạt khi auth_test/Gateway test còn chưa được cấu hình hoàn chỉnh.

### Đ18/Đ22 — A4: token giao dịch đã được thử với đơn thật

Ngày 17/11/2026, chỉ tạo hai tài khoản USER thử riêng, cấp 10.000 VND mô phỏng cho bên gửi qua API ADMIN hiện có, tạo ba đơn checkout thật. An/Admin không làm bên chuyển/nhận. ADMIN chỉ dùng quyền cấp/thu hồi tiền mô phỏng, không sửa trực tiếp SQL hoặc source Wallet/Payment.

Các trường hợp kiểm tra:

| Trường hợp | Kết quả thực tế | Đối chiếu tác động |
| --- | --- | --- |
| Thiếu transactionToken | 401/UNAUTHORIZED | Không đổi số dư, held, ledger, payment hoặc token đã dùng |
| Token đúng chữ ký nhưng sai paymentId | 403/TXN_TOKEN_MISMATCH | Trạng thái không đổi |
| Token ghi amount 1001 cho đơn 1000 | 403/TXN_TOKEN_MISMATCH | Trạng thái không đổi |
| Token thuộc user khác | 403/TXN_TOKEN_MISMATCH | Trạng thái không đổi |
| Chữ ký bị sửa | 403/TXN_TOKEN_MISMATCH | Trạng thái không đổi |
| Token header và body khác nhau | 403/TXN_TOKEN_MISMATCH | Trạng thái không đổi |
| Token chờ quá 60 giây thật | 401/TXN_TOKEN_EXPIRED | Trạng thái không đổi; không đổi clock/exp trong DB |
| Token mới, đúng đơn/người/tiền | 200/SUCCESS | Đúng hai bút toán cho capture của đơn |
| Gửi lại token đã thành công | 409/TXN_TOKEN_REUSED | Không trừ tiền, ghi sổ hoặc tiêu thụ token thêm |
| Hai confirm đồng thời dùng cùng token | Một 200/SUCCESS, một 409/TXN_TOKEN_REUSED | Chỉ hai bút toán capture cho đơn đó |

Sau test có đúng hai giao dịch 1.000 VND thành công, đơn còn lại đã hủy qua API; đúng hai token được tiêu thụ. Đối chiếu thấy ví gửi 8.000 VND, ví nhận 2.000 VND, held cả hai bằng 0.

Runner ban đầu dừng ở bước đối chiếu vì gọi BigInt trực tiếp trên chuỗi tiền `8000.00`; đó là lỗi script kiểm tra, không phải lỗi số dư của sản phẩm. Bước đối chiếu và dọn được chạy tiếp bằng chuẩn hóa chuỗi VND có phần thập phân toàn số 0, không dùng số thực. Đã thu hồi đủ tiền test bằng API ADMIN debit và xác minh balance/held của cả hai ví về 0. Phiên mobile tạo cho test đã đăng xuất; giữ account, payment, token-consumption và ledger làm dấu vết, không xóa sổ cái.

Tài khoản test A4: `dat_a4_sender_26e37ce95d1b`, `dat_a4_receiver_a509df1b8db0`. Không lưu password, PIN, JWT, khóa ký hoặc refresh cookie vào tài liệu/file phụ. Chưa thấy lỗi cần sửa trong các ca A4 này; đây là nghiệm thu API/database, chưa phải chạy toàn bộ thao tác PIN/confirm qua mọi màn Web. Tách trách nhiệm: Đạt cấp token/kiểm thử bảo mật; Khoa quản lý nghiệp vụ đơn và consumer token của Payment.

### Đ21 — header giả, funding và utilities đã kiểm tra live

Ngày 17/11/2026, 14 nhóm kiểm tra qua Gateway thật đạt trên tài khoản USER thử riêng có ví 0 VND. Có kiểm soát bằng ADMIN thật; chỉ đăng nhập/đăng xuất các phiên thử, không đổi vai trò, PIN, số dư An/Admin.

- Bearer USER hợp lệ kèm x-user-id/role giả ADMIN, x-gateway-token giả, x-gateway-verified và x-internal-key giả vẫn đọc đúng profile/ví của chính USER. USER không vào được API dashboard quản trị; ADMIN thật vẫn được phép dù client tự gán header USER.
- Thiếu/sai Bearer kèm header giả bị 401. A5: giả cờ gateway không mở được các route tạo funding hoặc confirm QR khi chưa đăng nhập.
- Pipeline sanitizer/authenticate được thử riêng với khóa ES256 test trong RAM: xóa cả năm header nội bộ do client gửi, sau đó ký token mới chứa sub/role đúng từ Bearer, TTL 60 giây. Không dùng khóa ký production cho phép thử này.
- Utilities: bill lookup qua Gateway cần Bearer; Bearer hợp lệ cùng header giả vẫn nhận dữ liệu mô phỏng đúng. GET order UUID không tồn tại trả 404 từ utilities; thiếu Bearer bị Gateway chặn 401.
- Callback VNPAY: chỉ exact GET ipn/return được public ở cả funding và payments/topups. Không có checksum hợp lệ: IPN trả RspCode 97; return trả 400/INVALID_SIGNATURE. POST và đường dẫn có thêm suffix vẫn bị 401. Không gửi callback hợp lệ hoặc mở URL thanh toán.
- GATEWAY-ALIAS-CREATE: POST `/funding/vnpay/create` với Bearer USER và header giả nhận 201. Database ghi đúng userId thật, status PENDING; gọi `/payments/topups` cùng Idempotency-Key trả cùng topupId, không tạo yêu cầu thứ hai.
- GATEWAY-CASHOUT-ROUTE: POST `/funding/cash-out` nhận 201, GET status nhận 200; userId đúng USER thật, status REQUESTED. Không gọi confirm nên workflow vẫn IDLE, tokenJti null và không tạo hold/payout.
- USER giả ADMIN gọi credit bằng body trống bị 403 trước nghiệp vụ; header nội bộ giả không mở được internal payment confirm. Không có số dư nào được cấp trong lượt Đ21 này.

Database xác nhận ví tài khoản chạy hoàn chỉnh `dat_gateway_eefc5b391585` có balance = 0, held = 0, ledger count = 0. Giữ topup PENDING và cash-out REQUESTED làm dấu vết, không giả lập hoàn thành nạp/rút. Hai tài khoản probe `dat_gateway_cf3e131d3560`, `dat_gateway_2baf130cb8da` chỉ dùng cho profile/đọc ví trước nhóm hoàn chỉnh. Các phiên đăng nhập thử đã đăng xuất. Không sửa source Gateway/Wallet/Payment/Utilities trong lượt này.

Giới hạn: image Wallet đang chạy chưa trả kycTier ở cấp DTO được kiểm tra; không dùng lượt này để chốt nhiệm vụ metadata/hạn mức K18. Các kiểm tra UI và nghiệp vụ nạp/rút/tiện ích cuối cùng vẫn do chủ feature phối hợp nghiệm thu.

### Đ21 — test hồi quy Gateway đã lưu trong repo

Đã bổ sung ba ca vào [funding-auth.test.ts](../../../Backend/gateway/tests/funding-auth.test.ts), giữ ca whitelist cũ; tổng 4/4 đạt, `npx tsc --noEmit` không lỗi và `git diff --check` đạt. Trước đó kiểm tra pipeline mới chỉ chạy trong RAM, chưa được lưu thành test tự động cho những lần merge tiếp theo.

- Bearer hợp lệ của USER/ADMIN: gửi kèm header mạo danh với ID khác và quyền ngược lại. Cả năm header do client gửi phải bị xóa trước authenticate; danh tính mới phải lấy từ Bearer. Token nội bộ được xác minh chữ ký ES256, issuer/audience, sub/role và TTL 60 giây; không giữ internal-key hay cờ gateway tĩnh.
- Callback công khai: GET `/api/funding/vnpay/ipn` không cần Bearer nhưng vẫn phải xóa header giả, không tự cấp danh tính người dùng. Mã 204 ở ca này do endpoint quan sát trong test trả về, không phải kết quả xử lý IPN/VNPAY thật. Ca whitelist cũ kiểm riêng hai callback và hai alias.
- Route funding cần đăng nhập: POST `/api/funding/cash-out` với Bearer thiếu hoặc sai vẫn trả 401 dù có đủ bộ header giả.

Hàm gatewayPipeline dựng Express trên cổng ngẫu nhiên tại loopback, chạy sanitizeHeaders trước authenticate, quan sát header ở ranh giới hai middleware rồi tự đóng server sau mỗi test. Khóa ES256 sinh mới trong bộ nhớ; không dùng secret thật, không cần Docker, không tạo tài khoản hoặc giao dịch. Các header x-test-* chỉ tồn tại trong ứng dụng test, không thêm vào Gateway thật.

Đã thử vô hiệu hóa sanitizeHeaders chỉ trong bộ nhớ của tiến trình kiểm tra: ba ca mới đều fail, ca whitelist cũ vẫn pass (1 pass/3 fail như mong đợi). Phép thử này xác nhận các assertion bắt được việc mất bước xóa header; không sửa middleware trên đĩa. Kết quả 4/4 của bản thật không chứng minh thứ tự middleware trong entrypoint deploy, phân quyền Wallet hoặc toàn bộ luồng nạp/rút đều đúng; dùng cùng bằng chứng live và kiểm tra ownership riêng.

### Phát hiện cần Khoa phối hợp — đọc ví khác chủ chưa bị chặn

Mức ưu tiên P1: Bearer USER hợp lệ gọi GET `/api/wallets/<userId_khác>/balance` trả 200, trong khi chính sách middleware yêu cầu 403. Đã xác nhận bằng An (USER) đọc ví test 0 VND của `dat_gateway_cf3e131d3560`; có và không có header giả đều trả cùng dữ liệu. Đây là lỗi phân quyền đọc dữ liệu, không phải bằng chứng giả vai trò ADMIN thành công tại Gateway.

Vị trí để Khoa sửa:

- [wallet.routes.ts](../../../Backend/services/wallet-service/src/routes/wallet.routes.ts): `router.use(requireOwnerOrAdmin)` chạy trước route `/:userId/balance`.
- [requireOwnerOrAdmin.ts](../../../Backend/services/wallet-service/src/middlewares/requireOwnerOrAdmin.ts): đọc req.params.userId lúc params chưa có, nên bỏ qua so sánh chủ ví.

Harness chỉ chạy trong RAM đã tái hiện: guard ở router.use thấy params rỗng và cho qua; cùng guard đặt sau khi route đã match tham số trả 403 cho cùng USER/target. Chưa sửa file của Khoa. Khoa cần gắn kiểm tra chủ ví tại các route đã có userId và rà các route đọc khác dùng cùng cách đăng ký, bổ sung test USER đọc ví người khác phải bị chặn. Đạt chạy lại probe qua Gateway sau khi bản sửa được gộp/deploy. Không tự kết luận các route khác đều lỗi khi chưa thử.

## 2. File nguồn và đường vào Web

- [Auth API](../../src/features/auth/api/auth.api.ts): adapter gọi API qua axios dùng chung.
- [Auth store](../../src/features/auth/stores/useAuthStore.ts): phiên đăng nhập, initialize/refresh/signout.
- [Public exports](../../src/features/auth/index.ts): điểm import cho thành viên khác.
- [PinModal](../../src/features/auth/components/PinModal.tsx): xác thực PIN gắn với đơn đã có.
- [SignInPage](../../src/pages/SignInPage.tsx), [QrLoginPage](../../src/pages/QrLoginPage.tsx): đăng nhập mật khẩu/QR.
- [qr-confirm](../../scripts/qr-confirm.mjs): giả lập client mobile duyệt QR phục vụ kiểm thử.
- [SignInForm](../../src/features/auth/components/SignInForm.tsx), [QrLoginPanel](../../src/features/auth/components/QrLoginPanel.tsx): component Auth dùng qua public entry.
- [useQrLogin](../../src/features/auth/hooks/useQrLogin.ts), [auth queries](../../src/features/auth/api/auth.queries.ts): vòng đời QR và TanStack Query trong feature.

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

Web polling bằng refetchInterval của TanStack Query khoảng 2 giây, dùng chung query theo qrId để tránh request đồng thời cho cùng query. PENDING tiếp tục chờ; APPROVED nhận phiên rồi điều hướng; REJECTED/hết hạn dừng. Backend có thể trả HTTP 410/QR_EXPIRED khi hết hạn. Rời trang/đổi tab/hủy phiên phải bỏ qua phản hồi cũ. Lỗi khởi tạo hiện thông báo và nút thử lại.

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

Kiểm tra thêm phần chọn tài khoản ở development (`npm run dev`):

1. Mở `/sign-in`, nhập một mật khẩu bất kỳ và bật hiện mật khẩu. Bấm Điền email khách hàng: email thành an@demo.vn, mật khẩu trống và được che, con trỏ ở ô mật khẩu. Trong Network không phát sinh POST `/auth/signin` do thao tác chọn; request refresh lúc tải trang là việc khác.
2. Nhập lại mật khẩu bất kỳ rồi chọn Điền email quản trị viên: email thành admin@demo.vn và mật khẩu cũ được xóa; chưa đăng nhập.
3. Bấm Đăng nhập khi mật khẩu trống: có thông báo yêu cầu nhập, không gửi signin. Nhập thông tin hợp lệ của môi trường rồi submit để kiểm tra USER vào `/app`, ADMIN vào `/admin`; cần Backend thật cho bước này.
4. Dùng Network throttling làm chậm signin: trong lúc đang gửi, hai nút chọn phải bị khóa. Sau phản hồi thất bại, có thể chọn lại tài khoản. Không chia sẻ request body chứa mật khẩu.
5. Ở bản production, phần chọn tài khoản thử không hiện; vẫn có form mật khẩu và tab QR. `npm run dev -- --mode production` vẫn là dev server, không dùng để chứng minh giao diện của bản build production.

Kiểm tra URL quay lại và tab QR sau tái cấu trúc:

1. Dùng cửa sổ riêng tư mở `/app/profile?tab=security#pin`. Sau khi chuyển sang đăng nhập, thử mật khẩu An; phải quay lại đúng cả path/query/hash. Thử riêng lần khác bằng tab QR; kết quả tương tự. ADMIN vẫn vào `/admin`.
2. Trong tab mật khẩu, Network không có POST tạo QR. Sang QR mới tạo phiên; quay lại mật khẩu phải dừng polling và không nhận duyệt QR cũ. Sang QR lần nữa phải có qrId mới.
3. Bật Offline ở tab mật khẩu rồi mở QR: hiện lỗi và nút thử lại. Tắt Offline chưa tự tạo QR; bấm Thử tạo lại mã QR mới gửi tạo phiên. Khi QR đang hiện rồi mất mạng, đó là lỗi polling riêng, không đồng nhất với lỗi tạo phiên.
4. Thử tại 390/768/1280 px; form/QR không tràn ngang. Dữ liệu form mật khẩu được xóa khi rời tab rồi quay lại vì component form được unmount.

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
5. Dùng Network throttling làm chậm verify rồi đóng modal bằng X, Esc, bấm ngoài hoặc nút Đóng xác thực: phản hồi về muộn không gọi confirm/hiển thị biên nhận. Đóng chỉ kết thúc UI xác thực, không hủy đơn trên Backend. Lặp lại khi chuyển tài khoản bằng quy trình phiên của ứng dụng.
6. A3: chỉ dùng tài khoản thử riêng để kiểm tra sai 5 lần/khóa 30 phút; countdown phải giảm theo thời hạn Backend. Đóng mở, F5 và gọi API vẫn phải bị Backend chặn trong thời gian khóa. Hết countdown chỉ cho phép thử lại; Backend tiếp tục quyết định chấp nhận hay từ chối PIN.
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

Có thể kiểm tra nhanh riêng hai ca phiên mới mà không cần Docker/Backend; adapter trong test trả dữ liệu giả để kiểm tra hành vi store:

```powershell
node --import ./tests/register.mjs --test --test-name-pattern "signin waiting for refresh|a stale signin failure" tests/auth-api.test.ts
```

Lệnh này không thay thế đăng nhập Web, F5, đăng xuất và kiểm tra vai trò ở mục 6.2. Khi sửa hoặc bỏ logic generation, hai ca trên phải phát hiện hồi quy; không xóa assertion để làm xanh kiểm thử.


Kiểm tra các ca QR đã lưu trong repo, chạy từ Frontend, không cần Docker/Backend:

```powershell
node --import ./tests/register.mjs --test tests/auth-api.test.ts
node --import ./tests/register.mjs --test --test-name-pattern "QR " tests/auth-api.test.ts
npm test
```

Kỳ vọng lần lượt: file Auth 18/18, nhóm QR 3/3, toàn Node suite 64/64. Số đếm là mốc source đang bàn giao; nếu nhóm thêm test hợp lệ thì cập nhật số, không bỏ test để khớp mốc. Ba ca mới chỉ dùng MutationObserver/API giả/adapter giả; không đo mạng thật. Có thể lint riêng bằng `npx eslint --no-ignore tests/auth-api.test.ts`; npm run check mặc định không lint các file trong tests. Các script typed test đang dùng loader riêng, cần phân biệt phạm vi typecheck app và test.

Kiểm tra riêng Đ21 từ Gateway, không cần Docker; khóa và HTTP server dùng riêng trong tiến trình test:

```powershell
cd D:\PTPMHDV\Backend\gateway
npx tsc --noEmit
npx tsx --test tests/funding-auth.test.ts
```

Kỳ vọng: TypeScript không lỗi, 4 test đạt. Nếu lỗi, gửi tên ca và thông báo lỗi đã che dữ liệu nhạy cảm. Lệnh này không kiểm tra Wallet ownership hoặc thay thế các probe qua Gateway thật; thay đổi test không làm đổi giao diện Web.

Việc còn lại của Đạt: phối hợp chủ feature chuyển các import fixture rồi bỏ MOCK_USER khỏi store; hoàn tất kiểm tra giao diện/call site PIN và các ca QR còn thiếu đã ghi riêng. Phần tách hai page Auth/QR, lỗi Offline tạo QR và đường dẫn quay lại đã sửa và nghiệm thu như mục cập nhật. Theo dõi cảnh báo bundle; chưa coi toàn bộ quy tắc kiến trúc của dự án đã đạt. Đã kiểm tra lại signin/F5/logout sau sửa chọn email với 16/16 nhóm live đạt. Ba test QR mới đã lưu trong file Auth, đạt 3/3; file Auth 18/18 và Node suite 64/64. Test hồi quy pipeline header đã lưu trong file Gateway hiện có và đạt 4/4. Đ21 đã có 14 nhóm live ở mục 1, nhưng phải phối hợp Khoa sửa lỗi đọc ví chéo chủ và kiểm lại trước khi chốt phân quyền tổng thể. A3/A4 đã có kết quả API/database thật ở mục 1; chưa suy ra toàn bộ màn nghiệp vụ của nhóm đã đạt. Q1 và hết hạn QR ở trang riêng đã có kết quả live ở mục 1. Các luồng mật khẩu, cookie, F5, logout và vai trò đã có kết quả live ở mục 1; cần chạy lại khi thay đổi phần liên quan. Khi thay đổi contract tiếp, sửa lại tài liệu này ở một lượt riêng. Không mở rộng sang sửa nghiệp vụ của thành viên khác chỉ để làm xanh kiểm thử.

Biên bản nghiệm thu nên ghi: ngày, phiên bản FE/BE, môi trường, tài khoản thử đã che thông tin, ca thử, kết quả mong đợi/thực tế và requestId nếu có lỗi. Không lưu cookie, Authorization, PIN, token hay secret vào biên bản.

## 8. Người nhận bàn giao và việc cần phối hợp

| Người nhận | Việc trong feature của mình | Kết quả cần báo lại |
| --- | --- | --- |
| Khoa — Wallet/Payment/Transfer | Ưu tiên sửa kiểm tra chủ ví ở router Wallet theo phát hiện mục 1; đồng thời giữ contract PIN/confirm của Payment | USER đọc ví người khác phải bị chặn; test ownership và probe Gateway đạt; chuyển tiền/PIN/timeout đúng contract |
| Hữu — Withdraw | Đối chiếu contract PIN/token của rút tiền với Backend và thử theo mục 4, mục 6.4 | Đóng PIN không hủy đơn; token đã dùng không mở đường confirm lần hai; đọc trạng thái khi chưa rõ kết quả |
| Nguyên — Utilities | Đối chiếu mã đơn/tiền đã tạo, dùng token đúng contract và theo dõi đơn tới trạng thái cuối | PIN sai hoặc phản hồi muộn không confirm; chỉ báo kết quả theo trạng thái Backend |

Đây là yêu cầu phối hợp tích hợp và nghiệm thu, không khẳng định các thành viên đang thiếu hoặc làm sai các phần trên. Đạt phụ trách sửa Auth/PIN/QR, nền thông báo lỗi, Gateway và bằng chứng nghiệm thu bảo mật; từng chủ feature chịu trách nhiệm nghiệp vụ của mình.

### Phối hợp chuyển fixture của test trước khi bỏ export MOCK_USER

Kiểm kê working tree hiện tại còn các file: cashoutFlow.test.tsx, topupFlow.test.tsx, funding.test.tsx, merchantTools.test.tsx, merchantOnboarding.test.tsx, userProfile.test.tsx, notificationBell.test.tsx, utilities.test.tsx, transactions.test.tsx và transactions-filters.test.tsx. Chủ từng feature chỉ cần chuyển phần import Auth/fixture, giữ assertion và nghiệp vụ của mình:

```ts
import { useAuthStore } from '@/features/auth'
import { MOCK_AUTH_USER as MOCK_USER } from '@/features/auth/fixtures/auth.fixtures'
```

Chạy lại suite test đã sửa và typecheck, báo revision cho Đạt. Đạt quét lại từ Frontend:

```powershell
rg -n 'import.*MOCK_USER.*stores/useAuthStore' src/test
```

Chỉ bỏ export tương thích sau khi hết nơi dùng trên revision tích hợp thật. Import ở dashboard.test.tsx đang có thay đổi cục bộ từ lượt trước, nhưng không nằm trong gói Auth dự kiến; nếu không lấy thay đổi đó thì vẫn còn thêm dashboard cần chủ feature chuyển. Đạt không tự mở rộng sửa các file test này. Giữ export hiện tại không có nghĩa signIn dùng mock.

Sau merge/pull, đọc diff ở các file Auth dùng chung rồi chạy mục 7 trước khi báo hoàn thành. Không chọn nguyên một phía Current/Incoming cho cả file nếu làm mất logic tích hợp cần giữ. Bản bàn giao này chưa chốt hoàn thành toàn bộ nhiệm vụ tuần 4 của Đạt.
