# Quay video demo Sovereign Memory — khoảng 2 phút

## Câu chuyện cần kể: dùng chung ngữ cảnh, không chia sẻ mọi thứ

**Nhân vật:** một sinh viên làm dự án Alpha, dùng một trợ lý học tập và một trợ lý tài chính.

**Bài toán:** trợ lý học tập cần biết hạn thuyết trình nhưng không cần biết ngân sách. Nếu chép toàn bộ ngữ cảnh cho mọi trợ lý, người dùng khó kiểm soát thông tin nào đã chia sẻ. Khi đổi công cụ hoặc kết thúc dự án, họ cũng cần dừng những lần truy cập tiếp theo.

**Giải pháp được demo:** lưu ghi nhớ trong một kho, cấp quyền đọc riêng cho từng trợ lý, thu hồi quyền khi không cần và xem lại lịch sử truy cập. Giá trị là **chia sẻ đủ thông tin cho từng nhiệm vụ mà vẫn kiểm soát việc chia sẻ**, không phải chỉ có một màn hình đăng nhập hay hiển thị mã 200/403.

**Phạm vi thực tế:** prototype hiện là kho ghi nhớ và lớp kiểm soát truy cập. Study Agent và Finance Agent là các danh tính kiểm thử; chưa có chatbot/LLM hay agent tự hành được kết nối. Không thuyết minh rằng AI đã tự lập kế hoạch, nhắc lịch hoặc phân tích ngân sách. Đó chưa phải chức năng hiện có.

Phiên quay dùng **mô phỏng đăng nhập và vai trò**, không phải TideCloak đã kích hoạt thành công. Giữ dòng cảnh báo “SIMULATION — NOT PROTECTED BY TIDECLOAK” trong video. API thực sự quyết định cho đọc/từ chối dựa trên danh tính mô phỏng; không ghép kết quả giả vào video.

## 1. Chuẩn bị

Nếu tải mã nguồn sang máy khác, cài Node.js 24 trở lên rồi mở PowerShell trong thư mục dự án:

```powershell
npm ci
npm run build
npm run demo
```

Mở [http://localhost:3000](http://localhost:3000). Không cần Docker hoặc licence Tide cho chế độ mô phỏng. Nếu app đã chạy thì giữ terminal đó, không mở thêm một server trên cùng cổng.

Trước khi quay:

- Chọn **Demo Owner** → **Prepare demo memories** để có sẵn hai mẫu tổng hợp. Trong video chính, dùng **Monthly project budget** làm ngân sách mà Finance Agent đã được cấp đọc.
- Video sẽ tạo thêm một ghi nhớ học tập thật qua nút **New memory**. Chuẩn bị nội dung để dán, tránh mất thời gian gõ: Title **Lịch thuyết trình Alpha**; Category **Study**; Memory content **Project Alpha thuyết trình vào thứ Sáu.**
- Ghi nhớ mới chưa có grant. Khi quay, chủ động bấm **Grant read** cho **Study Agent** trên chính thẻ mới này, rồi bấm biểu tượng copy ID ở cuối thẻ.
- Ghi nhớ mới không nằm trong hai nút mẫu của Agent Access Lab. Phải dán UUID vừa copy vào **Target memory ID** để đọc đúng ghi nhớ mới tạo. Không bấm nhầm mẫu cũ **Project Alpha briefing** khi kiểm tra thu hồi.
- Nếu đã diễn tập, có thể dùng lại ghi nhớ đã tạo. Để quay cảnh tạo mới, dùng tiêu đề phân biệt cho lần quay tiếp; không cần xóa hay reset dữ liệu. Trước lần quay mới, cấp lại quyền phù hợp bằng **Grant read**. **Prepare demo memories không tự cấp lại quyền đã thu hồi.**
- Có thể chạy `npm run verify:simulation` trong terminal thứ hai để kiểm tra API và đưa hai mẫu tổng hợp về trạng thái có grant phù hợp. Lệnh này chủ động thay đổi grant của dữ liệu demo, không tác động realm hoặc dữ liệu Tide thật.
- Chọn lại **Demo Owner**, về **Overview**, đợi số liệu tải xong.
- Phóng to cửa sổ trình duyệt; ưu tiên khung hình 16:9. Nếu chữ quá nhỏ, tăng zoom trình duyệt một chút và kiểm tra các nút vẫn hiện đủ.
- Đóng tab email, tài khoản GitHub, trình quản lý mật khẩu và thông báo cá nhân. Không quay `.env`, terminal đăng nhập, mã thiết bị, cookie, token, DevTools hay link mời.

## 2. Bật quay trên Windows

Trên Windows 11, mở **Snipping Tool** → chọn **Record** → **New**, hoặc nhấn **Win + Shift + R**. Khoanh vùng cửa sổ app, chọn **Start** và **Stop** khi xong. Đây là cách quay video vùng màn hình trong [hướng dẫn Microsoft](https://support.microsoft.com/en-us/windows/apps/use-snipping-tool-to-capture-screenshots).

Nếu thanh quay có tùy chọn micro, bật micro và quay thử 5 giây để nghe lại. Nếu không thu được giọng, có thể thêm thuyết minh sau bằng **Edit in Clipchamp**. Đừng bắt đầu bản chính trước khi đã nghe thử âm thanh.

Chỉ quay vùng app và thanh địa chỉ localhost; không quay cửa sổ đăng nhập GitHub hoặc terminal đang có mã xác thực. Trong lúc quay, nghỉ khoảng một giây ở mỗi kết quả để người xem đọc được HTTP status.

## 3. Kịch bản chính: bài toán → chức năng → tác dụng

Không đọc HTTP status thành nội dung chính. Hãy nói **người dùng làm gì, được lợi gì**, còn nội dung và trạng thái trên màn hình là bằng chứng. Bỏ màn kiểm tra roster quản trị khỏi bản 2 phút vì nó làm loãng câu chuyện sử dụng.

| Thời gian | Thao tác cần quay | Điều người xem phải hiểu |
| --- | --- | --- |
| 0:00–0:15 — Bài toán | Overview của Demo Owner; chỉ hai loại trợ lý | Người dùng cần chia sẻ ngữ cảnh cho các nhiệm vụ khác nhau, không phải giao mọi dữ liệu cho mọi trợ lý. |
| 0:15–0:35 — Lưu ngữ cảnh | Memory Vault → New memory → dán tiêu đề/nội dung đã chuẩn bị, chọn Study → Create memory | Có thể tự tạo và lưu một ghi nhớ phục vụ công việc. Ghi nhớ không tự động được chia sẻ cho mọi agent. Có thể cắt ngắn phần gõ chữ khi dựng. |
| 0:35–0:48 — Chọn người được đọc | Trên thẻ mới **Lịch thuyết trình Alpha**, bấm Grant read cho Study Agent; để Finance Agent chưa có grant; copy ID của thẻ mới | Chủ sở hữu quyết định riêng từng ghi nhớ được chia sẻ cho trợ lý nào. Ngân sách mẫu có grant riêng cho Finance Agent. |
| 0:48–1:07 — Đúng ngữ cảnh, đúng trợ lý | Chọn Study Agent → Agent Access Lab → dán ID mới → Request access: nội dung lịch xuất hiện. Sau đó chọn Monthly project budget → Request access: bị từ chối | Trợ lý học tập nhận được lịch cần dùng nhưng không lấy được ngân sách. Quyền được kiểm tra khi đọc, không chỉ bằng việc ẩn giao diện. |
| 1:07–1:18 — Vẫn làm được nhiệm vụ khác | Chọn Finance Agent → Agent Access Lab → Monthly project budget → Request access: ngân sách xuất hiện | Chia sẻ có chọn lọc không phải khóa hết thông tin: mỗi trợ lý vẫn nhận được ngữ cảnh đã được cấp cho nhiệm vụ của mình. |
| 1:18–1:42 — Đổi ý và thu hồi | Demo Owner → Memory Vault → Revoke của Study Agent trên đúng thẻ mới; copy lại ID thẻ đó. Chọn Study Agent → Agent Access Lab → dán ID → Request access: bị từ chối | Khi đổi trợ lý hoặc kết thúc nhu cầu chia sẻ, người dùng dừng được những lần đọc tiếp theo. Nội dung từng bị đọc không thể bị xóa khỏi trí nhớ của bên nhận. |
| 1:42–1:52 — Biết điều gì đã xảy ra | Demo Owner → Security Logs; chỉ lần đọc được phép, lần từ chối và thao tác revoke | Có thể xem ai đã yêu cầu đọc, vào lúc nào và kết quả gì; không chỉ tin rằng đã đặt đúng quyền. Đây là log ứng dụng, không phải bằng chứng bất biến trước người vận hành database. |
| 1:52–2:00 — Kết quả và ranh giới | Overview hoặc Governance / Where TideCloak fits | Tóm lại giá trị: một kho ngữ cảnh, chia sẻ có chọn lọc, có thể thu hồi. Danh tính đang mô phỏng; tích hợp Tide thật vẫn chưa được xác minh. |

Sau mỗi lần đổi danh tính, app trở về Overview và xóa giao diện vai trò cũ: hãy mở lại tab cần dùng. Các tab cùng browser profile dùng chung cookie; dùng profile riêng nếu muốn quay nhiều cửa sổ đồng thời.

Việc ghi nhớ có Category Study hay Finance **không tự quyết định quyền**. Trong câu chuyện này, chính Owner cấp grant cho từng agent trên từng ghi nhớ. Nếu Owner chủ động cấp ngân sách cho Study Agent thì nó cũng có thể đọc; không được thuyết minh rằng tên vai trò tự khóa cố định mọi thể loại.

## 4. Lời thuyết minh đọc liền

Đọc tự nhiên, như đang giới thiệu cách giải quyết một việc thực tế. Không cần đọc tên nút hay từng con số status; để hình ảnh chứng minh thao tác. Các đoạn dưới bám theo thứ tự cảnh ở trên:

> Tôi đang làm dự án Alpha. Trợ lý học tập cần biết lịch thuyết trình, còn trợ lý tài chính cần ngân sách. Nhưng tôi không muốn đưa toàn bộ thông tin cho cả hai. Sovereign Memory giúp quản lý phần ngữ cảnh nào được chia sẻ cho từng trợ lý.

> Tôi tạo một ghi nhớ: dự án sẽ thuyết trình vào thứ Sáu. Thông tin được lưu trong kho của tôi, chưa tự động chia sẻ cho mọi trợ lý.

> Tôi cấp quyền đọc ghi nhớ này cho Study Agent. Ngân sách được cấp riêng cho Finance Agent. Cùng dùng một kho ngữ cảnh không có nghĩa là cùng được đọc mọi thứ.

> Chuyển sang Study Agent, tôi nhận được lịch thuyết trình vừa chia sẻ. Nhưng khi yêu cầu ngân sách, ứng dụng từ chối và không trả nội dung. Trợ lý này có đúng phần ngữ cảnh được cấp, thay vì toàn bộ dữ liệu của tôi.

> Finance Agent vẫn đọc được ngân sách của nó. Mỗi trợ lý nhận thông tin phù hợp với nhiệm vụ mà người dùng cho phép.

> Nếu tôi đổi trợ lý hoặc kết thúc việc chia sẻ, tôi có thể thu hồi quyền. Study Agent thử đọc lại ghi nhớ vừa rồi thì bị chặn ngay. Việc này ngăn lần đọc tiếp theo, không xóa được thông tin đã đọc trước đó.

> Trong lịch sử, tôi xem được ai đã yêu cầu truy cập, khi nào và kết quả ra sao. Nhờ đó, việc chia sẻ có thể kiểm tra lại thay vì chỉ dựa vào niềm tin.

> Giá trị chính là dùng chung ngữ cảnh nhưng giữ quyền kiểm soát. Phiên này mô phỏng danh tính các trợ lý; TideCloak thật chưa được xác minh và dữ liệu mẫu hiện chưa mã hóa.

Kết thúc, người xem cần trả lời được ba câu: **Ai cần ứng dụng? Ứng dụng giúp họ làm gì? Điều gì thay đổi so với đưa toàn bộ thông tin cho mọi trợ lý?** Nếu họ chỉ nhớ 200 và 403, video vẫn đang thiên về kiểm thử hơn là demo sản phẩm.

## 5. Cảnh bổ sung nếu được quay dài hơn

- Demo Administrator thử đọc lịch → bị từ chối: giải thích rằng quản trị danh tính không đồng nghĩa với được cấp đọc từng ghi nhớ qua API. Không suy rộng thành “người vận hành database không đọc được”, vì SQLite hiện vẫn plaintext.
- Governance → xem kế hoạch tích hợp Tide: giải thích đây là hướng bảo vệ danh tính và thay đổi quyền quản trị khi Tide thật hoạt động, không phải quorum đã được demo thành công.
- Không thêm cảnh chatbot giả trả lời hay nói agent đã tự lập kế hoạch. Nếu muốn chứng minh AI dùng ngữ cảnh để thực hiện nhiệm vụ, cần xây và kiểm chứng tích hợp LLM/agent thật trước; bản hiện tại chưa có.

## 6. Kiểm tra video trước khi đưa lên GitHub

- Nghe rõ giọng, không có mật khẩu/token/mã đăng nhập trong hình hoặc âm thanh.
- Cảnh báo mô phỏng vẫn hiện; không dùng lời “đã có bảo vệ Tide thật”, “đã mã hóa đầu-cuối” hoặc “đã xác minh quorum”.
- Có cảnh tạo ghi nhớ, chọn người được đọc, dùng ngữ cảnh và thu hồi; không chỉ quay màn hình kiểm thử quyền.
- Kết quả được quay từ app: nội dung lịch mới tạo khi có grant, từ chối không chứa plaintext khi đọc ngân sách, và từ chối chính ghi nhớ mới sau thu hồi.
- Cắt phần chờ hoặc thao tác nhầm; không ghép kết quả giả hay cắt làm thay đổi ý nghĩa kiểm tra quyền.
- Lưu bản cuối thành `docs/demo/sovereign-memory-demo.mp4`; ưu tiên không quá 2 phút và dưới 100 MB. Không commit bản quay thô.
- Xem lại toàn bộ file cuối trước khi công khai. GitHub repo có thể chứa nguồn ngay; video sẽ được thêm sau khi bạn quay xong và duyệt nội dung.

Chưa có file MP4 nào được tạo hoặc cung cấp trong dự án. Bản demo mô phỏng không chứng minh rằng các tiêu chí bắt buộc về Tide thật của hackathon đã được đáp ứng.

## 7. Thêm video đã duyệt vào repo sau khi nguồn được push

Sau khi đã có remote `origin` và nhánh GitHub `main`, đặt đúng file cuối ở `docs/demo/sovereign-memory-demo.mp4`, rồi chạy trong thư mục dự án:

```powershell
git add docs/demo/sovereign-memory-demo.mp4
git commit -m "Add reviewed simulated demo video"
git push origin HEAD:main
```

Không chạy các lệnh này trước khi bạn đã tự xem và duyệt file video. Chỉ stage file video cuối, không dùng `git add .` để đưa bản quay thô hoặc dữ liệu riêng tư vào repo.
