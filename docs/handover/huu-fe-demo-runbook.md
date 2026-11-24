# Runbook demo và tái kiểm chứng trục Hữu

## Diễn tập chung Tuần 4 — cập nhật 24/11/2026

Phần này thay các mô tả thiếu P2P/W4 trong lịch sử bên dưới. Web hiện đã có
kiểm thử P2P/PIN/QR, manual topup, Utilities/Notification, cashout và A8 thật trên
cụm acceptance riêng. W4 được Đạt chốt **khôi phục cache theo ledger**, không
đảo giao dịch; giữ nguyên ledger và heldBalance. Tên nút đã sửa theo nghiệp vụ.

### Lịch trình trình bày 15 phút

| Thời gian | Người trình bày làm gì | Bằng chứng/điều phải nói |
| --- | --- | --- |
| 00:00–02:00 | Mở `TaiLieu/week4-demo/output.pptx`, trình bày 3 slide | Gateway, checkout/PIN/confirm và outbox/inbox; dùng ghi chú 40 giây/slide. |
| 02:00–04:00 | Đăng nhập, F5, chuyển P2P và mở biên lai | Khóa nút, cùng idempotency key; số dư người gửi/nhận khớp, không quay PIN/password. |
| 04:00–06:00 | QR login, xác nhận đúng phiên, chỉ ra hết hạn | QR phải hết hạn tự nhiên 120 giây; che QR còn hiệu lực trong video chia sẻ. |
| 06:00–08:00 | Nạp tiền, xem trạng thái chờ; Admin duyệt/từ chối | IPN tổng hợp có chữ ký chỉ là phương án dự phòng. Không gọi đó là VNPAY sandbox thật. |
| 08:00–10:00 | Nạp điện thoại thành công/hoàn tiền và mở thông báo | Provider mô phỏng; tiền và trạng thái thật trong DB, thông báo WebSocket đúng chủ. |
| 10:00–12:00 | Rút tiền SUCCEEDED/FAILED/UNKNOWN | Payout mô phỏng; UNKNOWN giữ chỗ và chỉ đọc trạng thái, không tạo lệnh mới. |
| 12:00–14:00 | Admin đối soát, sửa fixture lệch và đối soát lại | A8 chỉ sửa cache; ledger và khoản đang giữ không đổi; audit và reference cố định. |
| 14:00–15:00 | Đưa số p95/tỷ lệ lỗi và kết luận giới hạn | Đọc `load-result.json` mới nhất; phân biệt đo tải có giãn nhịp với khả năng thông lượng tối đa. |

Hai video tự động là diễn tập kỹ thuật theo thời gian chạy thật, không có lời
thuyết trình. Đọc thời lượng trong `rehearsal-summary.json`; không coi video
khoảng 5 phút là đã hoàn thành hai lượt thuyết trình 15 phút. Người demo cần chạy
lịch trình trên hai lần với đồng hồ và ghi lại sự cố/nếu không có sự cố.

### Chạy kỹ thuật và quay video trên Windows

Docker Desktop phải chạy. Chọn manifest **cụm riêng** do Backend tạo; không dùng
DB nhóm. Thiết lập payout stand-in chỉ trong override của cụm riêng theo Backend
acceptance README; giữ production Compose nguyên trạng. Build FE trước khi chạy,
không build đồng thời với browser test.

```powershell
# Từ Frontend; thay <id> bằng run vừa dựng, không dùng đường dẫn cũ trong lịch sử.
$env:LIVE_ACCEPTANCE_RUN_FILE='D:\PTPMHDV\Backend\.cache\acceptance-week2\finvault-acceptance-<id>\run.json'
$env:LIVE_PHASE3_SCOPE='all'
$env:LIVE_DEMO_RECORD='1'
$env:BROWSER_EVIDENCE_DIR='node_modules/.tmp/week4-demo-local'
node tests/phase3-live.mjs
```

`result.json` phải PASS trước khi dùng video. File `demo.webm` có nhãn dữ liệu
tổng hợp/IPN tổng hợp/payout mô phỏng. Recorder thay màn đăng nhập/PIN/QR bằng
khung che; không thay logic ứng dụng. Chỉ chia sẻ video và JSON đã lược bỏ bí mật;
không chia sẻ browser profile, `.env`, `secrets` hoặc nguyên thư mục cache.

Kiểm riêng A8: đổi `LIVE_PHASE3_SCOPE='reconciliation'`. Harness tạo hold thật
50000, chỉ làm lệch cache fixture +5000, bấm đúp khôi phục qua Admin UI, kiểm
ledger/hold/audit và chạy RC1. Lỗi phải giữ FAIL; không chạy SQL lên DB nhóm để
làm đẹp báo cáo. Nếu ca thất bại, harness gỡ đúng cache corruption do nó tạo
và hủy đúng lệnh giữ chỗ của ca thử.

### VNPAY sandbox còn thiếu gì

Đã tìm `.env`, tài liệu text và Word trong workspace: terminal và secret có sẵn,
`VNP_URL` là sandbox, nhưng IPN/return đều localhost, chưa có URL HTTPS công khai.
Không thay cấu hình nhóm hoặc sinh callback giả rồi ghi sandbox PASS. Chủ terminal
cần cấu hình IPN công khai và khớp return/deployment; sau đó chạy nạp 100000 từ Web,
nhận IPN từ VNPAY, kiểm +100000 đúng một lần và replay không cộng thêm.
Return chỉ hiển thị, IPN cập nhật trạng thái theo [đặc tả VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

Mẫu bàn giao Hữu (thay domain thực; không đưa secret vào đây):

```text
IPN terminal: https://<gateway-public>/api/payments/topups/vnpay/ipn
VNP_RETURN_URL: https://<web-public>/app/topup/result
VITE_VNPAY_PAYMENT_URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Chỉ đổi `VNP_IPN_URL` trong `.env` không thay cấu hình IPN đã đăng ký ở terminal
VNPAY. Return route Backend hiện trả JSON; nếu muốn trở về giao diện thì dùng
đúng route Web trên. Web tìm lệnh thuộc chủ đang đăng nhập bằng `vnp_TxnRef`,
rồi GET trạng thái server; không tin `vnp_ResponseCode=00` để tự cộng tiền.


> **Cập nhật closeout:** [regression, demo accounts và video đã hoàn tất](huu-fe-closeout.md). Các dòng “chưa seed/chưa video/chưa rerun” bên dưới là trạng thái trước closeout. VNPAY sandbox, active Transfer UI/K18 và review/rollout/merge vẫn còn mở.

13/11/2026. **Đồ án mô phỏng.** Tài khoản Phase 8 chưa seed và chưa diễn tập/video. Các lệnh live ghi thêm dữ liệu synthetic vào đúng project acceptance; không dùng DB dùng chung. Không chụp PIN, password, token, signed KYC URL hoặc modal API key raw.

## Chuẩn bị môi trường đã kiểm chứng trên máy này

Mở terminal ở thư mục gốc chứa hai repository. Có Node 22.23.1, npm dependencies FE, Podman/Docker Compose, Chromium đã cài; `pdftotext` cần cho harness tools. Stack đã down, volumes vẫn còn; các image acceptance hiện có. Lệnh dưới tái bật đúng project và private config đã tồn tại, không tự tạo lại project/credentials.

Terminal A, giữ chạy trong lúc test:

```bash
podman system service --time=0 unix:///tmp/huu-fe-podman.sock
```

Terminal B, từ thư mục backend:

```bash
cd PTPMHDV_Backend
export DOCKER_HOST=unix:///tmp/huu-fe-podman.sock
export DEMO_RUN_DIR="$PWD/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537"

docker compose --project-directory "$PWD" --env-file "$DEMO_RUN_DIR/.env" \
  -p finvault-acceptance-dadc7eef7537 -f docker-compose.yml \
  -f "$DEMO_RUN_DIR/compose.json" up -d

docker compose --project-directory "$PWD" --env-file "$DEMO_RUN_DIR/.env" \
  -p finvault-acceptance-dadc7eef7537 -f docker-compose.yml \
  -f "$DEMO_RUN_DIR/compose.json" ps
curl --fail http://127.0.0.1:40825/health
```

Chờ dependencies/services healthy rồi chạy test; startup broker có thể lâu hơn Gateway. Private override payment đã dùng `NODE_ENV=test`, `MOCK_PAYOUT_ENABLED=true`, `VNP_TMN_CODE=SYNTH_TMN_CODE`. Không in `.env`/secrets ra console hoặc đưa private config vào PR. Nếu image chưa có hoặc đổi source backend, build các image tương ứng trước `up`; payment Dockerfile tự generate Prisma/build/migrate khi start. Migration mới phải có trước FE.

Nếu ở máy khác hoặc không còn private run directory, dùng hướng dẫn tạo **fresh acceptance stack** của backend và run.json mới; không dựng secret/port bằng cách copy config demo này vào DB dùng chung. [Backend acceptance README](../../../PTPMHDV_Backend/tests/acceptance/README.md), [runtime](../../../PTPMHDV_Backend/tests/acceptance/week2/runtime.mjs) là nguồn để owner chuẩn bị stack mới.

## Chạy suite tự động và ứng dụng

Terminal C, từ repo frontend; chạy các suite **tuần tự**, mỗi browser harness có thể build lại dist. Không chạy npm build song song suite browser. Đợi cửa sổ rate-limit giữa các suite live; nếu 429, ghi lần chạy đó và chỉ chạy lại sau Retry-After.

```bash
cd PTPMHDV_Frontend
export DOCKER_HOST=unix:///tmp/huu-fe-podman.sock
export LIVE_ACCEPTANCE_RUN_FILE="$PWD/../PTPMHDV_Backend/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/run.json"
export LIVE_API_ORIGIN=http://127.0.0.1:40825
export BROWSER_PATH=/home/nguyenhuu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome

npm run check
npm run test:unit
npm run test:browser
npm run test:topup:browser
npm run test:cashout:browser
npm run test:merchant:browser
npm run test:profile:live
npm run test:phase3:live
npm run test:merchant:live
npm run test:merchant:tools:live
npm run test:funding:live
```

Đây là danh sách tái kiểm, không phải tuyên bố đã chạy toàn bộ cùng revision. Funding live tự đợi giữa ca cashout để tuân thủ per-user rate-limit, có thể mất vài phút. Một số harness hardcode evidence dir: backup evidence cũ trước chạy và lưu kết quả mới riêng; `BROWSER_EVIDENCE_DIR` chỉ được những harness có hỗ trợ sử dụng. Không biến exit fail thành PASS bằng cách bỏ assertion.

Demo tương tác: đặt `.env.local` FE `VITE_API_BASE_URL=http://localhost:40825/api`, chỉ đặt `VITE_VNPAY_PAYMENT_URL` khi endpoint HTTPS đã xác nhận. Chạy `npm run dev` và dùng origin `localhost` theo CORS hiện hữu (cổng in trên terminal). Không sửa CORS để dùng origin khác. Với bản production preview, cấu hình API/return theo deployment trước build; không mặc định `/api` được proxy trong preview.

## Dữ liệu synthetic cần chuẩn bị cho buổi demo

Danh sách dưới là **fixture manifest cần seed/verify**, không phải tài khoản đã tồn tại và đăng nhập được. Harness test sinh account trong RAM và không xuất password để tái dùng tương tác. Lưu credential bằng phương thức private của người demo; không ghi vào markdown/screenshot/log/URL/repository.

| Nhãn logic | Trạng thái cần có | Cách kiểm trước demo |
|---|---|---|
| USER-0 / USER-1 / USER-2 | Tier 0/1/2, profile tổng hợp, balance từ backend | Signup thật, chờ User/Wallet provisioning; tier do Admin API cấp hợp lệ; GET profile/wallet đối chiếu |
| MERCHANT-PENDING / MERCHANT-APPROVED | Hai owner synthetic riêng, status server khác nhau | Register qua API; chỉ Admin synthetic đổi status; reload portal kiểm gate |
| TOPUP-SYNTHETIC | Một topup và callback HMAC synthetic trên DB thử | `test:funding:live` tự tạo/đối chiếu, không dùng thay REAL_VNPAY_SANDBOX |
| TOPUP-SANDBOX | Giao dịch VNPAY sandbox thật | NOT_RUN; chỉ chuẩn bị khi terminal/return/redirect được xác nhận |
| CASHOUT-SUCCESS / FAIL / UNKNOWN | Số dư đủ; kết quả payout mô phỏng tương ứng | Harness Funding dùng amount 10000 / 10111 / 10222, PIN đúng lệnh, DB hold capture/release/pending |
| MERCHANT-OUTLET | Outlet ký QR, key tạo rồi thu hồi | Dùng owner approved; không quay/screenshot lúc raw key hiển thị |

Backend có `demo-seed.mjs fresh` nhưng yêu cầu DB mới trống, tạo cả nhiều lịch sử P2P ngoài scope và có thể vướng K18. Chưa chạy script đó trong Phase 8; không chạy `fresh` vào project đang có dữ liệu, không xóa DB để làm seed qua. `verify-only` chỉ dùng với run directory thật có `demo-context.json`, không tự trỏ tới run.json bất kỳ.

## Kịch bản trình bày khoảng 8–10 phút

1. Profile: đăng nhập USER synthetic → `/app/profile`, sửa tên/reload; chọn một mặt bị chặn rồi hai mặt PNG/JPEG synthetic, chứng minh PENDING/tier/reason từ server.
2. Topup: `/app/topup`, nhập tiền chuỗi → create một lệnh, chưa tăng balance. Khi chưa có sandbox config, trình bày rõ redirect bị chặn. Dùng evidence HTTP live để giải thích HMAC/IPN duplicate/ledger; không bấm callback 00 rồi gọi đó là giao dịch thành công thật.
3. Cashout **MÔ PHỎNG**: `/app/withdraw`, create → PIN gắn order/amount → confirm; đọc status server và balance. Trình bày FAILED release và UNKNOWN giữ hold qua evidence/harness, không tự giải phóng hoặc tạo lệnh thay thế.
4. Merchant: pending chưa mở tools, approved mở outlet/QR; QR lấy từ server, in standee. Tạo key chỉ khi không quay màn hình raw secret, đóng rồi không thể xem lại, thu hồi bằng keyId.
5. Đổi account/reload: chứng minh không thấy profile/merchant của owner trước. Nêu full K18/transfer UI chưa nghiệm thu, thay vì trình bày luồng demo như đã live.

## Minh chứng dự phòng có sẵn

| Tệp | Nguồn / lưu ý |
|---|---|
| [KYC browser live](../evidence/huu-fe-week4/fixes/phase3-live/live-kyc-two-sided.png) | Synthetic KYC, Gateway/User/MinIO thật, sau sửa |
| [Topup đang chờ](../evidence/huu-fe-week4/fixes/topup-browser/return-pending.png) và [receipt](../evidence/huu-fe-week4/fixes/topup-browser/return-approved.png) | HTTP fixtures, không phải VNPAY sandbox |
| [Cashout success](../evidence/huu-fe-week4/cashout-browser/cashout-success.png), [failed](../evidence/huu-fe-week4/cashout-browser/cashout-failed.png), [pending](../evidence/huu-fe-week4/cashout-browser/cashout-pending.png) | Browser HTTP fixtures trước bản sửa Funding; ledger live xem result mới |
| [Funding HTTP live result](../evidence/huu-fe-week4/fixes/funding-live/result.json) | Backend/ledger thật, IPN synthetic, payout mô phỏng; không chứa credential |
| [Merchant live](../evidence/huu-fe-week4/merchant-live/merchant-approved.png) | Gateway/Postgres thật, trước sửa Funding |
| [QR standee PDF](../evidence/huu-fe-week4/merchant-tools-live/merchant-qr.pdf) | QR công khai, browser print thật trước sửa Funding |

Video mới: NOT_RUN. Không chọn file `live-phase3-failure.png` làm ảnh demo thành công; đó là artifact lần test lỗi lịch sử.

## Dừng stack sau demo

Tại terminal B, sau khi các suite kết thúc:

```bash
docker compose --project-directory "$PWD" --env-file "$DEMO_RUN_DIR/.env" \
  -p finvault-acceptance-dadc7eef7537 -f docker-compose.yml \
  -f "$DEMO_RUN_DIR/compose.json" down --remove-orphans
```

Không thêm `-v`. Sau đó Ctrl+C dịch vụ Podman API ở terminal A. Không dừng project khác hoặc xóa volume chứa evidence/data của người khác.
