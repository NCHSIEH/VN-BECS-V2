# System Operation & Technical Manual / 全系統操作與技術規格手冊 / Hướng dẫn Vận hành & Thông số Kỹ thuật Hệ thống

## Part 1: 繁體中文 (Traditional Chinese)

### 第一章：捐血者管理與實驗室資訊管理子系統 (Donor Management & LIMS Subsystem)
**業務邏輯與流程 (Workflow Detail)**
從捐血者踏入捐血站開始，系統涵蓋報到登記、健康問卷篩檢、理學檢查（體檢）、血液採集（全血或分離術），以及後續的實驗室檢驗（血型與傳染病篩檢）。
對於「罕見血型捐血者 (Rare Donors)」，系統亦提供專屬的管理流程，包含建檔、定期追蹤與緊急動員，以確保特殊醫療需求能被即時滿足。

**欄位規格與驗證 (Fields & Validations)**
* **越南公民身分證 (CCCD)**: 強制輸入 12 碼數字。系統會以正規表達式 (Regex) 進行格式校驗，並即時比對全國資料庫，防堵重複建檔與替身捐血。
* **年齡與體重限制**: 年齡需介於 18 至 60 歲之間。男性體重必須大於等於 45 公斤，女性大於等於 42 公斤。若輸入數值不符條件，系統會鎖定「下一步」按鈕，無法進入下一關卡。
* **越南衛生部 (MOH) 體檢參數**: 包含血壓、脈搏、血紅素等數值。系統會根據國家標準自動判定合格與否，異常數值將以醒目紅色標示。

**暫緩捐血機制 (Deferral Logic)**
系統內建嚴格的暫緩捐血判定邏輯。根據問卷與體檢結果（如近期刺青、特定國家旅遊史、特定藥物使用）會觸發「暫時性」拒絕，並自動推算並寫入下次可捐血日期；若實驗室傳染病篩檢（HIV, HBV, HCV, 梅毒等）呈現陽性，則觸發「永久性」拒絕（黑名單），該名捐血者未來將無法再次完成報到。

### 第二章：血液製備與庫存管理子系統 (Blood Components & Inventory Management Subsystem)
**業務邏輯與流程 (Workflow Detail)**
全血採集後，在此模組進行離心與分離，製備成紅血球濃厚液 (PRBC)、新鮮冷凍血漿 (FFP)、血小板 (PLT) 等成分血。完成製備與標籤列印後，血袋會移入相應溫層的血庫進行庫存管理。同時包含設備與耗材 (Resources) 的管控。

**欄位規格與驗證 (Fields & Validations)**
* **唯一血袋條碼 / ISBT 128**: 系統強制採用 ISBT 128 標準編碼，具備全球唯一性。母袋與子袋之間有嚴格的繼承關係，系統會防呆阻擋掃描到重複或無效的條碼。
* **效期與儲存溫度驗證**: 系統依據血品種類自動帶入效期（例如：血小板 5 天、PRBC 35/42 天），並嚴格監控儲存溫度條件（PRBC：2-6°C、FFP：-18°C 以下、血小板：20-24°C 且持續震盪）。即將到期的血袋會自動跳出視覺化警告。
* **隔離與放行控制 (Quarantine vs. Available)**: 剛製備完成的血袋預設為「隔離 (Quarantine)」，絕對無法發放。必須等待第一章的實驗室傳染病篩檢結果全部回傳為陰性，系統才會自動解鎖並將狀態轉為「可用 (Available)」。

**資源與耗材管理 (Resources)**
記錄血袋、試劑、離心機等設備的批號、效期與保養狀態。若系統偵測到試劑過期或設備未完成定期保養，將阻擋該批次製備紀錄的提交，確保製程安全。

### 第三章：醫院需求與訂單管理子系統 (Hospital Request & Order Management Subsystem)
**業務邏輯與流程 (Workflow Detail)**
醫院透過此模組提出常規或緊急的輸血需求，包含跨院的血液調撥。訂單確認後，進入物流與冷鏈運輸環節。當發生重大災難或大量失血病患時，可啟動 MTP（大量輸血協定）流程。

**欄位規格與驗證 (Fields & Validations)**
* **訂單資訊**: 包含醫院代碼、病患識別碼、臨床適應症、需求血品種類、ABO/Rh 血型、數量與預計送達時間。缺漏任何必填欄位將無法送出訂單。
* **優先級與警報**: 訂單分為常規 (Routine)、緊急 (Urgent)、極急 (Stat/Emergency)。在緊急訂單激增導致庫存低於安全水位時，系統會自動觸發低庫存警報，提醒中心調整供血策略。

**大量輸血協定 (MTP Cases)**
專為搶救大出血病患設計。系統會記錄 MTP 啟動時間、授權醫師、臨床情境，並以「回合 (Round)」為單位，追蹤目標供血量與實際發放量。系統會自動指派最高優先級，確保第一線醫療團隊不會斷血。

**物流與冷鏈追蹤 (Transport Jobs)**
每一筆訂單出庫後，系統會結合物聯網 (IoT) 溫度感測器，追蹤運送過程中的溫度變化。若發生「冷鏈中斷 (Cold Chain Violation)」（如溫度過高），系統會在血液抵達醫院掃描時自動攔截該批血袋，強制要求進行品質覆核，未覆核前無法入庫。

### 第四章：受血者交叉配對與發血子系統 (Recipient Cross-Matching & Issuance Subsystem)
**業務邏輯與流程 (Workflow Detail)**
醫檢師在發血前，必須為病患檢體與庫存血袋進行交叉配對。配對通過後，才能執行正式的發血出庫作業。確保每一袋血都能安全地送到對的病患手上。

**欄位規格與驗證 (Fields & Validations)**
* **受血者歷史與檢體驗證**: 系統會自動調閱病患過去的輸血紀錄與不規則抗體篩檢結果，並檢查本次檢體是否在有效期間內（例如 72 小時內）。若檢體過期，系統會強制要求重新採檢。
* **嚴格相容性矩陣 (Strict Compatibility Matrix)**: 系統內建電子配血規則。Rh 陰性患者僅能接受 Rh 陰性血液；O 型 PRBC 可作為全適型紅血球；AB 型 FFP 可作為全適型血漿。任何違反相容性矩陣的配對操作將被系統強力阻擋。
* **雙盲驗證與發血控制**: 發血時需由兩人雙重確認（核對病患 ID、血袋 ID 與交叉配對報告）。一旦發現資訊不吻合，系統會立即中斷流程，並留下嚴重的錯誤日誌 (Critical Error Logs)。

### 第五章：輸血安全監控與不良反應子系統 (Hemovigilance & Transfusion Reaction Subsystem)
**業務邏輯與流程 (Workflow Detail)**
涵蓋血液輸注到病患體內後的持續監測。若病患發生輸血不良反應，醫護人員需立即透過系統通報，啟動後續的調查與阻斷機制。

**欄位規格與驗證 (Fields & Validations)**
* **不良反應紀錄**: 記錄發生的症狀（如發燒、發冷、急性溶血反應、TRALI 等）、嚴重程度、通報時間與處置作為。通報送出後，系統會自動通知相關品質主管。
* **雙向追溯邏輯 (Lookback / Traceability Logic)**:
    * **往前追溯 (Forward Lookback)**: 若發現某位捐血者後續檢驗出傳染病，系統會自動追查該捐血者過去所捐的所有血袋目前流向，並凍結尚未使用的血品，甚至自動發出警報通知已輸注的病患所在醫院。
    * **往後追溯 (Backward Lookback)**: 若病患發生嚴重不良反應且懷疑與血品有關，系統可瞬間反查該袋血的捐血者，並追蹤由同一次捐血分離出的其他成分血（如血漿、血小板），一併進行下架隔離。

### 第六章：系統層級工作流合理性與整合安全 (System-Wide Workflow Rationality & Integration Safety)
**子系統間的資料流轉與安全隔離**
這五大子系統在資料庫層級透過嚴密的關聯性設計共享數據，不容許資訊孤島。系統運行的核心精神是「絕對防呆」與「預設不信任」：
* **為何未經檢驗的血袋不能進入第二章 (製備與庫存)**：缺乏檢驗報告的捐血紀錄，其產生的血袋狀態會被死鎖在「隔離 (Quarantine)」，無法被移入可用庫存區，從物理層面防堵人員誤拿。
* **為何隔離的血袋不能在第三章被訂購**：訂單分配與庫存查詢介面，在底層 API 查詢時即過濾掉所有非 Available 的血袋，徹底阻斷被加入訂單的可能。
* **為何配對失敗的血袋不能在第四章發出**：發血模組在最後的儲存 (Commit) 階段，會再次向資料庫驗證該血袋與病患的相容性及狀態。若發現不符，整筆交易 (Transaction) 將被取消 (Rollback)。

**離線事件與網路斷線防禦 (Offline Events)**
越南部分地區可能面臨網路不穩定的挑戰。系統設計了強大的離線容錯機制，確保醫療服務不中斷：
* **斷網時的操作匣**: 當發生網路斷線時，關鍵的床邊核對或緊急發血操作會被加密並暫存在本地端的「離線事件匣 (Offline Events)」。本地端的相容性檢查引擎依然有效，確保離線狀態下的輸血安全不妥協。
* **網路恢復後的同步**: 當網路連線恢復時，系統會在背景自動將離線匣中的紀錄推送到中央伺服器 (Sync Status)。伺服器會進行事後資料一致性校驗。若發現衝突（例如同一袋血在斷線期間被兩地同時操作）或異常，會即時標示並通知管理員介入處理。

---

## Part 2: Tiếng Việt (Vietnamese)

### Chương 1: Phân hệ Quản lý Người hiến máu & Quản lý Thông tin Phòng xét nghiệm (Donor Management & LIMS Subsystem)
**Chi tiết Quy trình (Workflow Detail)**
Từ khi người hiến máu bước vào trung tâm, hệ thống bao gồm đăng ký, sàng lọc qua bảng câu hỏi sức khỏe, khám lâm sàng, thu thập máu (máu toàn phần hoặc gạn tách), và xét nghiệm sau đó (nhóm máu và bệnh truyền nhiễm).
Đối với "Người hiến máu nhóm máu hiếm (Rare Donors)", hệ thống cung cấp quy trình quản lý chuyên biệt, bao gồm lập hồ sơ, theo dõi định kỳ và huy động khẩn cấp.

**Trường dữ liệu & Xác thực (Fields & Validations)**
* **Căn cước công dân Việt Nam (CCCD)**: Bắt buộc nhập 12 chữ số. Hệ thống kiểm tra định dạng bằng Regex và đối chiếu thời gian thực với cơ sở dữ liệu quốc gia để ngăn chặn trùng lặp và hiến máu hộ.
* **Giới hạn Độ tuổi & Cân nặng**: Tuổi từ 18 đến 60. Nam >= 45kg, Nữ >= 42kg. Nếu không đạt, hệ thống khóa nút "Tiếp tục".
* **Thông số khám sức khỏe theo Bộ Y tế (MOH)**: Huyết áp, mạch, hemoglobin. Hệ thống tự động đánh giá Đạt/Không đạt theo tiêu chuẩn quốc gia. Thông số bất thường hiển thị màu đỏ.

**Logic Trì hoãn hiến máu (Deferral Logic)**
Hệ thống tích hợp logic trì hoãn nghiêm ngặt. Dựa trên câu hỏi và khám lâm sàng (ví dụ: mới xăm hình, lịch sử du lịch, sử dụng thuốc), hệ thống kích hoạt từ chối "Tạm thời" và tự động tính ngày hiến máu tiếp theo. Nếu xét nghiệm (HIV, HBV, HCV, Giang mai) dương tính, kích hoạt từ chối "Vĩnh viễn" (Danh sách đen).

### Chương 2: Phân hệ Quản lý Kho & Điều chế Chế phẩm Máu (Blood Components & Inventory Management Subsystem)
**Chi tiết Quy trình (Workflow Detail)**
Máu toàn phần được ly tâm và tách thành Hồng cầu lắng (PRBC), Huyết tương tươi đông lạnh (FFP), Tiểu cầu (PLT). Sau khi in nhãn, túi máu chuyển vào kho với nhiệt độ tương ứng. Phân hệ cũng quản lý Thiết bị và Vật tư (Resources).

**Trường dữ liệu & Xác thực (Fields & Validations)**
* **Mã vạch túi máu độc nhất / ISBT 128**: Bắt buộc dùng chuẩn ISBT 128. Tính duy nhất toàn cầu. Túi mẹ và túi con có tính kế thừa nghiêm ngặt. Hệ thống ngăn chặn quét mã trùng hoặc không hợp lệ.
* **Xác thực Hạn sử dụng & Nhiệt độ**: Tự động tính hạn dùng (ví dụ: Tiểu cầu 5 ngày, PRBC 35/42 ngày) và giám sát nhiệt độ (PRBC: 2-6°C, FFP: -18°C, Tiểu cầu: 20-24°C có lắc). Cảnh báo trực quan khi sắp hết hạn.
* **Kiểm soát Cách ly và Sẵn sàng (Quarantine vs. Available)**: Túi máu mới điều chế mặc định là "Cách ly (Quarantine)", tuyệt đối không được phát hành. Phải đợi kết quả xét nghiệm âm tính từ Chương 1, hệ thống mới mở khóa thành "Sẵn sàng (Available)".

**Quản lý Vật tư & Nguồn lực (Resources)**
Ghi nhận số lô, hạn dùng, trạng thái bảo trì của thiết bị, thuốc thử. Nếu thuốc thử hết hạn hoặc thiết bị chưa bảo trì, hệ thống chặn lưu hồ sơ điều chế.

### Chương 3: Phân hệ Quản lý Đơn hàng & Yêu cầu từ Bệnh viện (Hospital Request & Order Management Subsystem)
**Chi tiết Quy trình (Workflow Detail)**
Bệnh viện gửi yêu cầu truyền máu thường quy hoặc khẩn cấp, bao gồm điều phối máu liên viện. Đơn hàng xác nhận sẽ chuyển sang vận chuyển dây chuyền lạnh. Khi có thảm họa, kích hoạt quy trình Truyền máu khối lượng lớn (MTP).

**Trường dữ liệu & Xác thực (Fields & Validations)**
* **Thông tin Đơn hàng**: Mã bệnh viện, ID bệnh nhân, chỉ định lâm sàng, loại chế phẩm, nhóm máu ABO/Rh, số lượng, thời gian giao. Thiếu trường bắt buộc sẽ không thể gửi đơn.
* **Mức độ Ưu tiên & Cảnh báo**: Thường quy (Routine), Khẩn cấp (Urgent), Tối khẩn (Stat/Emergency). Khi đơn khẩn cấp tăng đột biến làm tồn kho giảm dưới mức an toàn, hệ thống báo động để trung tâm điều chỉnh.

**Giao thức Truyền máu khối lượng lớn (MTP Cases)**
Dành cho bệnh nhân xuất huyết nặng. Ghi nhận thời gian kích hoạt, bác sĩ chỉ định. Theo dõi theo "Vòng (Round)" giữa mục tiêu và thực tế phát hành. Ưu tiên tối đa để đảm bảo không đứt gãy nguồn cung.

**Theo dõi Vận chuyển & Dây chuyền lạnh (Transport Jobs)**
Gắn cảm biến IoT để theo dõi nhiệt độ liên tục. Nếu "Vi phạm Dây chuyền lạnh" (ví dụ: nhiệt độ quá cao), hệ thống sẽ tự động chặn túi máu khi quét tại bệnh viện nhận và bắt buộc kiểm tra chất lượng.

### Chương 4: Phân hệ Phát hành máu & Phản ứng chéo Người nhận (Recipient Cross-Matching & Issuance Subsystem)
**Chi tiết Quy trình (Workflow Detail)**
Kỹ thuật viên xét nghiệm phải làm phản ứng chéo giữa mẫu máu bệnh nhân và túi máu trong kho trước khi phát hành. Đảm bảo máu đúng đến đúng người.

**Trường dữ liệu & Xác thực (Fields & Validations)**
* **Lịch sử Người nhận & Xác thực Mẫu máu**: Hệ thống tự động tra cứu lịch sử truyền máu và kháng thể bất thường. Kiểm tra mẫu máu có còn hạn (ví dụ: trong 72 giờ). Nếu quá hạn, bắt buộc lấy mẫu mới.
* **Ma trận Tương thích Nghiêm ngặt (Strict Compatibility Matrix)**: Tích hợp quy tắc điện tử. Bệnh nhân Rh- chỉ nhận máu Rh-; PRBC nhóm O là nhóm cho phổ thông; FFP nhóm AB là nhóm cho phổ thông. Hệ thống chặn mọi thao tác vi phạm ma trận.
* **Xác minh Mù đôi & Kiểm soát Phát hành**: Phát hành cần 2 người xác nhận (đối chiếu ID bệnh nhân, ID túi máu, kết quả phản ứng chéo). Nếu sai lệch, quy trình dừng ngay lập tức và ghi log lỗi nghiêm trọng (Critical Error Logs).

### Chương 5: Phân hệ Giám sát An toàn Truyền máu & Phản ứng bất lợi (Hemovigilance & Transfusion Reaction Subsystem)
**Chi tiết Quy trình (Workflow Detail)**
Giám sát liên tục sau khi truyền máu. Nếu có phản ứng bất lợi, nhân viên y tế báo cáo trên hệ thống để kích hoạt điều tra.

**Trường dữ liệu & Xác thực (Fields & Validations)**
* **Nhật ký Phản ứng**: Ghi nhận triệu chứng (sốt, ớn lạnh, tan máu cấp, TRALI...), mức độ, thời gian và xử trí. Hệ thống tự động thông báo cho quản lý chất lượng.
* **Logic Truy xuất Nguồn gốc Hai chiều (Lookback / Traceability Logic)**:
    * **Truy xuất Xuôi (Forward Lookback)**: Nếu phát hiện người hiến máu mắc bệnh truyền nhiễm sau này, hệ thống tự tìm các túi máu trước đó của người này, đóng băng túi chưa dùng và cảnh báo bệnh viện đã truyền máu.
    * **Truy xuất Ngược (Backward Lookback)**: Nếu bệnh nhân phản ứng nghiêm trọng nghi do máu, hệ thống tìm ngay người hiến máu và theo dõi các chế phẩm khác (huyết tương, tiểu cầu) từ cùng lần hiến đó để cách ly.

### Chương 6: Tính Hợp lý Quy trình & An toàn Tích hợp Toàn Hệ thống (System-Wide Workflow Rationality & Integration Safety)
**Luồng Dữ liệu & Cách ly An toàn giữa các Phân hệ**
Năm phân hệ chia sẻ dữ liệu liên kết chặt chẽ, không có điểm mù thông tin. Tiêu chí cốt lõi là "Tuyệt đối ngăn chặn lỗi" và "Mặc định không tin cậy":
* **Tại sao túi máu chưa xét nghiệm không thể vào Chương 2**: Trạng thái bị khóa cứng ở "Cách ly (Quarantine)", không thể chuyển vào kho sẵn sàng, ngăn chặn vật lý việc lấy nhầm.
* **Tại sao túi máu cách ly không thể đặt hàng ở Chương 3**: Giao diện đặt hàng và truy vấn kho lọc bỏ hoàn toàn các túi máu không ở trạng thái "Available" ngay từ API cơ sở.
* **Tại sao túi máu sai phản ứng chéo không thể phát hành ở Chương 4**: Ở bước lưu (Commit) cuối cùng, hệ thống kiểm tra lại tương thích và trạng thái trên CSDL. Nếu sai, toàn bộ giao dịch (Transaction) bị hủy (Rollback).

**Sự kiện Ngoại tuyến & Phòng vệ Mất mạng (Offline Events)**
Đối phó với kết nối mạng không ổn định ở một số khu vực. Hệ thống có cơ chế chịu lỗi ngoại tuyến mạnh mẽ:
* **Hộp thao tác khi mất mạng**: Các thao tác quan trọng như đối chiếu tại giường hoặc phát máu khẩn cấp được mã hóa và lưu tạm vào "Hộp sự kiện ngoại tuyến (Offline Events)". Công cụ kiểm tra tương thích cục bộ vẫn hoạt động, đảm bảo an toàn truyền máu không bị thỏa hiệp khi mất mạng.
* **Đồng bộ sau khi có mạng**: Khi kết nối lại, hệ thống tự động đẩy dữ liệu ngoại tuyến lên máy chủ trung tâm (Sync Status). Máy chủ sẽ kiểm tra tính nhất quán. Nếu phát hiện xung đột (ví dụ: cùng một túi máu bị thao tác ở 2 nơi khi mất mạng), hệ thống sẽ đánh dấu và báo quản lý xử lý ngay.

---

## Part 3: English

### Chapter 1: Donor Management & LIMS Subsystem
**Workflow Detail**
From the moment a donor enters the facility, the system covers registration, health questionnaire screening, physical examination, blood collection (whole blood or apheresis), and subsequent laboratory testing (blood typing and infectious disease screening).
For "Rare Donors," the system provides a specialized management workflow, including profiling, routine monitoring, and emergency mobilization.

**Fields & Validations**
* **Vietnamese Citizen ID (CCCD)**: Mandatory 12-digit input. Validated via Regex and real-time national database matching to prevent duplicates and surrogate donations.
* **Age & Weight Restrictions**: Age 18–60. Males >= 45kg, Females >= 42kg. The system disables the "Next" button if criteria are not met.
* **MOH Health Parameters**: Blood pressure, pulse, hemoglobin. System auto-evaluates Pass/Fail based on national standards. Abnormal values are highlighted in red.

**Deferral Logic**
Built-in strict deferral logic. Questionnaire and physical exam results (e.g., recent tattoos, travel history, medication) trigger "Temporary" deferrals with auto-calculated next eligible dates. Positive infectious disease screens (HIV, HBV, HCV, Syphilis) trigger "Permanent" deferrals (blacklisting).

### Chapter 2: Blood Components & Inventory Management Subsystem
**Workflow Detail**
Post-collection, whole blood is centrifuged and separated into PRBC, FFP, and Platelets (PLT). After labeling, components are moved to temperature-controlled inventories. The module also handles Resources (equipment and consumables) management.

**Fields & Validations**
* **Unique Blood Bag Barcode / ISBT 128**: Strictly enforces global ISBT 128 standards. Strict inheritance between parent and child bags prevents duplicate or invalid barcode scanning.
* **Expiration & Temperature Validations**: Auto-calculates expiration (e.g., Platelets 5 days, PRBC 35/42 days) and monitors storage temperatures (PRBC 2-6°C, FFP <= -18°C, Platelets 20-24°C with agitation). Visual alerts for expiring bags.
* **Quarantine vs. Available**: Newly processed bags default to "Quarantine" and cannot be issued. Only when Chapter 1 lab tests return completely negative will the system automatically unlock the status to "Available."

**Resources Management**
Tracks lot numbers, expiration, and maintenance statuses of bags, reagents, and centrifuges. The system blocks processing submissions if reagents are expired or equipment is unmaintained.

### Chapter 3: Hospital Request & Order Management Subsystem
**Workflow Detail**
Hospitals submit routine or emergency requests, including cross-facility transfers. Confirmed orders enter logistics and cold-chain transport. MTP (Massive Transfusion Protocol) can be activated for disasters or massive hemorrhage cases.

**Fields & Validations**
* **Order Info**: Hospital ID, Patient ID, clinical indication, requested components, ABO/Rh, quantity, and delivery timeline. Missing mandatory fields prevents submission.
* **Priority & Alerts**: Classified as Routine, Urgent, or Stat/Emergency. Surges in emergency orders that deplete safety stock levels trigger automatic low-inventory alerts for strategic adjustment.

**MTP Cases**
Designed for massive bleeding. Logs activation time, authorized clinician, and tracks target vs. issued units per "Round." Automatically assigned highest priority to ensure continuous supply.

**Transport Jobs & Cold Chain**
IoT temperature sensors track post-issue transit temperatures. "Cold Chain Violations" (e.g., high temperature) automatically intercept the bag upon receiving scan, enforcing a mandatory QA review before inventory entry.

### Chapter 4: Recipient Cross-Matching & Issuance Subsystem
**Workflow Detail**
Lab technicians must perform cross-matching between the patient sample and inventory bag before issuance, ensuring the right blood goes to the right patient.

**Fields & Validations**
* **Recipient History & Sample Validation**: Auto-retrieves transfusion history and irregular antibody screens. Validates sample freshness (e.g., within 72 hours), mandating a redraw if expired.
* **Strict Compatibility Matrix**: Electronic cross-matching rules. Rh- patients only receive Rh- blood; O PRBC is universal; AB FFP is universal. Violations are heavily blocked by the system.
* **Double-Blind Verification**: Issuance requires two-person verification (matching Patient ID, Bag ID, and cross-match report). Mismatches instantly abort the process and generate Critical Error Logs.

### Chapter 5: Hemovigilance & Transfusion Reaction Subsystem
**Workflow Detail**
Continuous post-transfusion monitoring. Healthcare workers report adverse reactions via the system, initiating investigation and containment.

**Fields & Validations**
* **Reaction Logs**: Records symptoms (fever, chills, acute hemolysis, TRALI), severity, time, and actions taken. Automatically notifies QA managers.
* **Lookback / Traceability Logic**:
    * **Forward Lookback**: If a donor later tests positive for infections, the system traces all past donations, freezes unused components, and alerts hospitals with transfused patients.
    * **Backward Lookback**: Suspected blood-related severe reactions trigger reverse-tracing to the donor, automatically quarantining other components (plasma, platelets) from the same donation.

### Chapter 6: System-Wide Workflow Rationality & Integration Safety
**Data Flow & Safety Isolation**
The 5 subsystems share tightly coupled data with no information silos. The core principles are "Absolute Error Prevention" and "Zero Trust Default":
* **Why untested bags CANNOT enter Chapter 2**: Donations lacking test reports are deadlocked in "Quarantine" status, physically preventing movement to available inventory and misselection.
* **Why quarantined bags CANNOT be ordered in Chapter 3**: Order and query APIs filter out non-Available bags at the database level, preventing them from being added to orders.
* **Why mismatched bags CANNOT be issued in Chapter 4**: At the final commit stage, the issuance module re-verifies compatibility and status against the database. Mismatches trigger a full transaction Rollback.

**Offline Events & Network Outage Defense**
Addressing unstable networks in some Vietnamese regions, the system features robust offline fault tolerance:
* **Offline Operation Outbox**: During outages, critical bedside matching or emergency issuance operations are encrypted and cached locally in "Offline Events." The local compatibility engine remains active, guaranteeing uncompromised safety.
* **Post-Recovery Synchronization**: Upon network restoration, the system auto-syncs the offline outbox to the central server (Sync Status). The server performs consistency checks, flagging conflicts (e.g., simultaneous dual-location operations on one bag) for immediate admin intervention.
