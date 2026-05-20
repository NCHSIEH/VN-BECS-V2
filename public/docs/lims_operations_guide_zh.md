# VN-BECS V1.0 LIMS 操作手冊 (Operational Guide)

本手冊提供 **捐血中心站 (LIMS)** 的詳細操作步驟，涵蓋從捐血者登記到血品放行的完整四階段工作流。

## 第一階段：登記控制 (Registry Control)

此階段負責收集捐血者基本資料，進行越南 12 位身分證 (CCCD) 校驗與即時篩查。

1. **進入 LIMS 站點**
   - 於首頁登入後 (預設系統管理員帳號 `admin` / 密碼 `admin123`)，點擊 **「DONOR CENTER (LIMS)」** 模組進入。
2. **註冊捐血者**
   - 點擊畫面右上角 **「Register Donor」**。
   - **掃描 CCCD 晶片**：點擊 `Scan Chip Card` 按鈕模擬讀取越南晶片身分證，系統將自動填入一組 12 位數合法身分證號。
   - **填寫基本資料**：
     - **姓名 (Name)**：必須為全英文大寫且無數字 (例如：`NGUYEN VAN AN`)。
     - **出生日期 (DOB)**：輸入格式為 `YYYY/MM/DD` (例如：`1995/05/20`)，系統將自動計算年齡，僅允許 16~65 歲者通過。
     - **血型 (Blood Type)**：選擇 ABO 血型與 Rh 因子。若選擇 `Rh- Negative`，系統將觸發高亮黃色標籤標示為罕見血型。
   - 確認資料無誤後，點擊 **「Initialize Record」** 儲存資料。

## 第二階段：採血作業 (Phlebotomy Initiation)

將核定通過的捐贈者綁定國際標準 ISBT-128 捐贈識別碼 (DIN)。

1. **發起採血**
   - 於捐血者列表中找到剛註冊的捐血者，點擊該列右側的 **「Phlebotomy」** 按鈕。
2. **條碼綁定與收集**
   - **Unit Identification (DIN)**：點擊欄位右側的「重新整理 (Refresh)」圖示，系統會自動生成符合標準的 ISBT-128 條碼 (例如 `=W0000 24 123456`)。
   - **Target Volume**：確認採血量 (預設 500 mL)。
   - **Collection Method**：選擇 `WHOLE BLOOD` (全血) 或 `APHERESIS` (分離術)。
   - 點擊 **「Start Collection Run」** 完成採集，此血袋的「數位雙胞胎」正式建立。

## 第三階段：臨床檢驗篩選 (Clinical Screening)

執行傳染病標記 (IDM) 及核酸檢測 (NAT)。檢驗通過前，血袋狀態永久鎖定為「隔離 (PENDING)」。

1. **切換至檢驗視角**
   - 點擊畫面左側導覽列的 **「2. Clinical Screening」**。
2. **執行檢驗 (Process Diagnostics)**
   - 在列表中找到剛採集、狀態為 `Diagnostic Run` (藍色字體) 的血袋，點擊右側的 **「Process Diagnostics」** 按鈕。
   - 系統將模擬檢驗儀器運作。若試劑與設備正常，狀態將轉為綠色的 `CLEARED`。
   - *(注意：若觸發系統安全硬閘門，例如試劑過期或設備需保養，此按鈕將被鎖定並於畫面上方顯示紅色安全警告)*。

## 第四階段：血品加工與釋放 (Component Fabrication & Release)

完成所有品質認證與成分分離，將合格血品數位發布至調度系統 (HUB)。

1. **血品加工 (Fabricate Components)**
   - 點擊畫面左側導覽列的 **「3. Phlebotomy」**。
   - 針對已通過檢驗、標示為 `SAFE` 的全血袋，點擊右側 **「Fabricate Components」**，模擬離心與成分血分離作業。
2. **放行至物流中心 (Release to HUB)**
   - 點擊畫面左側導覽列的 **「4. Lab Logistics」**。
   - 列表中將顯示分離出的各項血品 (如 RBC 紅血球、Plasma 血漿等)。針對準備出庫的血品，點擊右側的 **「RELEASE TO HUB」**。
   - 狀態將從 `READY` 轉為 `HUB INTRANSIT`，象徵血品正式移交給物流中心，完美達成 LIMS 的接收與放行循環。
