# Bàn giao Home — Đ20

Cập nhật 23/11/2026, working tree chưa commit. Đạt thực hiện.

`HomePage` là trang mỏng, ghép `HomeLanding` qua public entry
`features/home/index.ts`. Landing công khai không có API riêng; các CTA vẫn tới
sign-in, sign-up và QR login. Không tạo endpoint `/home` giả.

Đã bỏ tên An, số dư 1.250.000đ, hạn mức còn lại giả và badge xác minh giả khỏi
thẻ giới thiệu. Thẻ hướng dẫn đăng nhập để xem hồ sơ/số dư thật; số dư thật vẫn
ở Dashboard. Bố cục, các mục giới thiệu/hạn mức và footer đồ án mô phỏng giữ theo
thiết kế. Source: [HomeLanding](../../src/features/home/components/HomeLanding.tsx),
[HomePage](../../src/pages/HomePage.tsx).

Tự kiểm tra: mở `/` khi chưa đăng nhập, kiểm ba CTA và anchor, thử kích thước
390px, xác nhận không có API giao dịch/phiên giả và không hiển thị dữ liệu An
như tài khoản của người xem. Khi đã đăng nhập, guard đưa tới trang phù hợp.

Wallet/Dashboard bàn giao Khoa, hướng dẫn tại [wallet.md](wallet.md).
