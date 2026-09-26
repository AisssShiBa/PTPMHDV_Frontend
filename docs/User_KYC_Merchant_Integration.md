# User Profile, KYC và Merchant

Đã triển khai hai route /profile và /merchant-register trong MainLayout, qua ProtectRoute. Menu desktop/mobile có lối truy cập. Validation theo lựa chọn người dùng: bám backend, hỗ trợ CCCD/Passport; không ép số điện thoại 10 số hoặc CCCD 12 số.

## Chạy frontend

Frontend dùng Gateway http://localhost:3000/api trong development; production mặc định dùng /api trên cùng origin. Có thể đặt VITE_API_BASE_URL theo .env.example. Không đưa secret backend vào biến VITE_*.

    rtk npm run dev

Để chạy dữ liệu thật cần Gateway, Auth, User, Merchant, database tương ứng và object storage cho KYC. Cấu hình khóa nội bộ/JWT giữa service theo tài liệu backend. Không bypass Gateway từ trình duyệt.

## Các thay đổi tích hợp

- Auth: UUID string, bóc response.data.data, lấy user cùng token từ login/refresh, bỏ lời gọi /user/me chưa tồn tại. Refresh đồng thời dùng chung một promise; chỉ retry 401 một lần, không refresh 403; không replay request của tài khoản cũ với token tài khoản khác.
- Signin/signup trả kết quả thành công để form chỉ chuyển trang khi đúng; protected route nhớ đường dẫn quay lại sau login. Logout đợi request refresh đang chạy trước khi xóa cookie phía server.
- Profile: fullName tối đa 200 ký tự, phone tối đa 30, address tối đa 500. Email chỉ đọc. Chỉ gửi trường thay đổi có giá trị; API chưa hỗ trợ xóa bằng null/chuỗi rỗng.
- KYC: idNumber trim dài 1–50; document là một file JPEG/PNG tối đa 5 MiB. Preview dùng object URL và dọn khi đổi file/unmount. NONE/REJECTED cho gửi, PENDING khóa theo UX, APPROVED không cho gửi.
- Ảnh đã gửi: gọi /users/by-auth/:authUserId/kyc/document, mở URL có hạn; tự đóng khi hết expiresIn và cho mở lại. Không lưu ảnh/URL vào localStorage.
- Merchant: businessName bắt buộc, taxId/bankAccount optional. Gửi đúng DTO, không gửi ownerId/địa chỉ/điện thoại. Nếu kết quả POST không rõ do mất mạng/lỗi server, yêu cầu kiểm tra trạng thái trước khi đăng ký lại.

## Backend đi kèm

1. Merchant Service thêm GET /api/merchants/me trước route /:id. Identity từ token được middleware xác minh; chỉ lấy bản ghi ownerId tương ứng và deletedAt: null. Trả HTTP 200 với { success: true, data: merchant } hoặc data: null nếu chưa đăng ký. Lỗi HTTP không đồng nghĩa chưa đăng ký. Không cần migration.
2. Auth Service bỏ fullName khỏi payload POST /api/users lúc signup để khớp schema strict của User Service (chỉ nhận authUserId/email). Việc sửa tên được thực hiện trên Profile. Thay đổi này không sửa logic Wallet.
3. Admin Service bổ sung migration 202609260002_init_admin_audit để tạo bảng AdminAuditLog và index đúng Prisma schema. Lỗi thiếu bảng được phát hiện khi nghiệm thu thật; sau migrate đã xác minh đủ audit duyệt/từ chối. Với database đã tạo bảng bằng db push, cần đối chiếu schema và baseline trước khi deploy migration.

Cần triển khai/restart backend cùng frontend. Nếu backend chưa có /me, frontend hiện lỗi tải và retry, không hiện form đăng ký sai trạng thái. API danh sách merchant active và mở rộng field Merchant chưa thuộc bản triển khai này.

## Kiểm thử

Node 24 được dùng cho bộ test; TypeScript đã có trong devDependencies, không thêm dependency hoặc sửa lockfile cho hạ tầng test.

    rtk npm run lint
    rtk npm run build
    rtk npm test
    rtk npm run test:browser

- npm test: 17 test cho validation, DTO, envelope, multipart, refresh đồng thời, init trùng trong StrictMode, logout và đổi tài khoản.
- npm run test:browser: cần bản production build dùng baseURL tương đối /api (không đặt VITE_API_BASE_URL thành Gateway thật cho bản build test). Script tự mở server fixtures trên loopback và Chrome/Edge headless, rồi dừng server/browser sau kiểm thử. Có thể đặt BROWSER_PATH nếu executable ở vị trí khác.
- Browser smoke: sửa/reload Profile, validate/upload KYC, xem ảnh/hết hạn, pending/approved/rejected, chống double click, giữ bản nháp Profile khi gửi KYC, Merchant lỗi tải/đăng ký/reload/duyệt, auth redirect/login và viewport 1280/390px. Đây là test UI với API mô phỏng, không phải E2E dữ liệu thật.
- Ảnh kiểm tra nằm trong node_modules/.tmp/browser-smoke (không commit): profile-desktop.png, profile-mobile.png, merchant-mobile.png.
- Merchant backend: chạy rtk npm run typecheck và rtk npm test tại services/merchant-service; 17 test đạt, gồm test chống giả mạo chủ sở hữu, null khi chưa đăng ký, token lỗi và database lỗi cho /me.

## Kết quả và giới hạn tại lần triển khai

Frontend build, unit tests, browser smoke và Merchant typecheck/tests đã đạt. Lint còn ba cảnh báo cũ ở Dashboard.tsx, button.tsx và sidebar.tsx; build còn cảnh báo bundle và __dirname trong Vite config.

Ngày 26/09/2026 đã chạy nghiệm thu với Gateway, Auth/User/Merchant/Admin/Wallet, PostgreSQL và MinIO thật: **17/17 nhóm kiểm tra đạt**. Bao gồm signup tạo Profile/Wallet, login/refresh/logout, Profile lưu/reload, KYC upload và signed URL hết hạn thật, Admin duyệt/từ chối và audit log, Merchant đăng ký/trùng/reload/browser độc lập, quyền sở hữu, mobile và offline/retry. Auth và Admin typecheck cũng đạt sau khi cài dependencies.

Môi trường nghiệm thu chạy local cô lập, frontend production tại http://localhost:5173 proxy /api đến Gateway thật. Admin được kiểm tra qua API; chưa nghiệm thu giao diện Admin, production, Payment hoặc RabbitMQ worker. [Báo cáo và bằng chứng](../../Tasks/Bao_Cao_Nghiem_Thu_User_KYC_Merchant_Backend_That.md), [hướng dẫn chạy lại](../../PTPMHDV_Backend/tests/acceptance/README.md).

Chưa commit/tạo PR. package-lock.json có thay đổi từ trước và được giữ nguyên.
