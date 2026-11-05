# Mẫu Bàn Giao Feature: <Tên Feature>

## 1. Trang và Component đã dựng
- **Routes**:
  - `/path/to/page`: `<PageName>`
- **Components** (`features/<feature>/components`):
  - `<ComponentName>`: Mô tả chức năng và vị trí hiển thị

## 2. Hook giả cần thay
| Tên Hook | File định nghĩa | Endpoint dự kiến | Phương thức | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `useXxx` | `features/<feature>/api/<feature>.queries.ts` | `/api/...` | GET / POST | Đang dùng `useFixtureQuery` |

## 3. Câu hỏi hở Contract / TODO(contract)
- Danh sách các trường dữ liệu cần kiểm tra lại với backend hoặc Postman collection:
  - [ ] `field_name`: mô tả thắc mắc...

## 4. Thay đổi giao diện sau khi gắn API (nếu có)
- Ghi rõ lý do tại sao phải sửa component và đã được xác nhận chưa.
