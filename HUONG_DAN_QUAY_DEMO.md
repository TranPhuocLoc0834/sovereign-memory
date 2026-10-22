# Quay video demo Sovereign Memory — khoảng 2 phút

Đây là bản **mô phỏng đăng nhập và vai trò**, không phải demo TideCloak đã kích hoạt thành công. Giữ dòng cảnh báo “SIMULATION — NOT PROTECTED BY TIDECLOAK” trong video. Các kết quả HTTP là quyết định thật của backend với danh tính mô phỏng; không giả lập chữ 200/403 trong video.

## 1. Chuẩn bị

Nếu tải mã nguồn sang máy khác, cài Node.js 24 trở lên rồi mở PowerShell trong thư mục dự án:

```powershell
npm ci
npm run build
npm run demo
```

Mở [http://localhost:3000](http://localhost:3000). Không cần Docker hoặc licence Tide cho chế độ mô phỏng. Nếu app đã chạy thì giữ terminal đó, không mở thêm một server trên cùng cổng.

Trước khi quay:

- Chỉ dùng hai ghi nhớ tổng hợp: **Project Alpha briefing** và **Monthly project budget**.
- Chọn **Demo Owner** → **Prepare demo memories**. Trong **Memory Vault**, kiểm tra Study Agent được cấp đọc ghi nhớ học tập và Finance Agent được cấp đọc ngân sách.
- Nếu đã diễn tập thu hồi, hãy bấm **Grant read** để cấp lại đúng quyền trước lần quay tiếp. **Prepare demo memories không tự cấp lại quyền đã thu hồi.**
- Có thể chạy `npm run verify:simulation` trong terminal thứ hai để kiểm tra API và đưa hai mẫu tổng hợp về trạng thái có grant phù hợp. Lệnh này chủ động thay đổi grant của dữ liệu demo, không tác động realm hoặc dữ liệu Tide thật.
- Chọn lại **Demo Owner**, về **Overview**, đợi số liệu tải xong.
- Phóng to cửa sổ trình duyệt; ưu tiên khung hình 16:9. Nếu chữ quá nhỏ, tăng zoom trình duyệt một chút và kiểm tra các nút vẫn hiện đủ.
- Đóng tab email, tài khoản GitHub, trình quản lý mật khẩu và thông báo cá nhân. Không quay `.env`, terminal đăng nhập, mã thiết bị, cookie, token, DevTools hay link mời.

## 2. Bật quay trên Windows

Trên Windows 11, mở **Snipping Tool** → chọn **Record** → **New**, hoặc nhấn **Win + Shift + R**. Khoanh vùng cửa sổ app, chọn **Start** và **Stop** khi xong. Đây là cách quay video vùng màn hình trong [hướng dẫn Microsoft](https://support.microsoft.com/en-us/windows/apps/use-snipping-tool-to-capture-screenshots).

Nếu thanh quay có tùy chọn micro, bật micro và quay thử 5 giây để nghe lại. Nếu không thu được giọng, có thể thêm thuyết minh sau bằng **Edit in Clipchamp**. Đừng bắt đầu bản chính trước khi đã nghe thử âm thanh.

Chỉ quay vùng app và thanh địa chỉ localhost; không quay cửa sổ đăng nhập GitHub hoặc terminal đang có mã xác thực. Trong lúc quay, nghỉ khoảng một giây ở mỗi kết quả để người xem đọc được HTTP status.

## 3. Thứ tự thao tác và lời nói

| Thời gian | Thao tác | Lời thuyết minh gợi ý |
| --- | --- | --- |
| 0:00–0:15 | Overview; chỉ vào cảnh báo mô phỏng | “Sovereign Memory cho các AI agent dùng chung ngữ cảnh nhưng chỉ đọc phần được cấp quyền. Đây là bản mô phỏng danh tính; TideCloak thật chưa được kích hoạt.” |
| 0:15–0:35 | Demo Owner → Memory Vault; chỉ hai ghi nhớ và từng grant | “Owner quản lý hai ghi nhớ tổng hợp: lịch thuyết trình và ngân sách. Study Agent chỉ được cấp đọc lịch; Finance Agent được cấp đọc ngân sách. Dữ liệu SQLite hiện chưa mã hóa.” |
| 0:35–1:00 | Chọn Study Agent → Agent Access Lab → Project Alpha briefing → Request access; sau đó chọn Monthly project budget và gửi lại | “Với cùng một danh tính, ghi nhớ được cấp trả HTTP 200. Ngân sách không được cấp trả 403 và không có nội dung. Quyền được kiểm tra ở backend, không chỉ bằng việc ẩn nút.” |
| 1:00–1:25 | Demo Owner → Memory Vault → Revoke của Study Agent trên Project Alpha; chọn lại Study Agent → Agent Access Lab → Project Alpha → Request access | “Owner thu hồi quyền. Request tiếp theo bị từ chối ngay. Thu hồi chặn lần đọc sau, không xóa được nội dung đã từng đọc.” |
| 1:25–1:45 | Study Agent → Governance → Call admin-only role API: 403; chọn Demo Administrator → Governance → gọi lại: 200 | “Vai trò Agent không được xem roster quản trị. Administrator được phép, nhưng đây vẫn chỉ là vai trò mô phỏng, không phải phê duyệt quorum của Tide.” |
| 1:45–2:00 | Demo Administrator → Agent Access Lab → Project Alpha → 403; nếu còn thời gian chọn Owner → Security Logs | “Quản trị viên không tự có quyền đọc ghi nhớ. Kế hoạch Tide sẽ thay danh tính demo bằng đăng nhập, xác minh token và DPoP thật. Quorum và mã hóa chưa được chứng minh trong bản này.” |

Sau mỗi lần đổi danh tính, app trở về Overview và xóa giao diện của vai trò cũ: hãy mở lại tab cần dùng. Để quay đồng thời nhiều danh tính ở các cửa sổ, dùng các browser profile riêng; các tab cùng profile dùng chung cookie.

Không cần thao tác Finance Agent trong bản 2 phút nếu đã đủ thời lượng. Có thể quay bổ sung để cho thấy Finance đọc ngân sách 200 và bị từ chối lịch học 403.

## 4. Kiểm tra video trước khi đưa lên GitHub

- Nghe rõ giọng, không có mật khẩu/token/mã đăng nhập trong hình hoặc âm thanh.
- Cảnh báo mô phỏng vẫn hiện; không dùng lời “đã có bảo vệ Tide thật”, “đã mã hóa đầu-cuối” hoặc “đã xác minh quorum”.
- Kết quả được quay từ app: 200 cho lần đọc có grant, 403 không chứa plaintext, và 403 sau thu hồi.
- Cắt phần chờ hoặc thao tác nhầm; không ghép kết quả giả hay cắt làm thay đổi ý nghĩa kiểm tra quyền.
- Lưu bản cuối thành `docs/demo/sovereign-memory-demo.mp4`; ưu tiên không quá 2 phút và dưới 100 MB. Không commit bản quay thô.
- Xem lại toàn bộ file cuối trước khi công khai. GitHub repo có thể chứa nguồn ngay; video sẽ được thêm sau khi bạn quay xong và duyệt nội dung.

Chưa có file MP4 nào được tạo hoặc cung cấp trong dự án. Bản demo mô phỏng không chứng minh rằng các tiêu chí bắt buộc về Tide thật của hackathon đã được đáp ứng.

## 5. Thêm video đã duyệt vào repo sau khi nguồn được push

Sau khi đã có remote `origin` và nhánh GitHub `main`, đặt đúng file cuối ở `docs/demo/sovereign-memory-demo.mp4`, rồi chạy trong thư mục dự án:

```powershell
git add docs/demo/sovereign-memory-demo.mp4
git commit -m "Add reviewed simulated demo video"
git push origin HEAD:main
```

Không chạy các lệnh này trước khi bạn đã tự xem và duyệt file video. Chỉ stage file video cuối, không dùng `git add .` để đưa bản quay thô hoặc dữ liệu riêng tư vào repo.
