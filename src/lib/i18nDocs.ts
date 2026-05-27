export type DocSectionType = 'text' | 'alert' | 'table' | 'steps' | 'list';

export interface DocSection {
  type: DocSectionType;
  subtitle?: string;
  content?: string;
  items?: string[];
  tableData?: { headers: string[], rows: string[][] };
  alertType?: 'info' | 'warning' | 'danger';
}

export interface DocModule {
  title: string;
  desc: string;
  sections: DocSection[];
}

export type DocsLanguageDict = {
  Sys: DocModule;
  LIMS: DocModule;
  LAB: DocModule;
  HUB: DocModule;
  HOSPITAL: DocModule;
  NATIONAL: DocModule;
  MDM: DocModule;
};

export const docsTranslations: Record<string, DocsLanguageDict> = {
  'en': {
    Sys: {
      title: 'VN-BECS V1.0 Mission-Critical Command Center',
      desc: 'The VN-BECS platform has evolved from a linear SOP model into a comprehensive vein-to-vein Command Center. It integrates 6 core operational nodes, fully aligned with AABB, ISBT-128, and Vietnamese Circular 26 standards to ensure sterile blood logistics safety.',
      sections: [
        { type: 'text', subtitle: 'Clinical Strategic Vision', content: 'Our architecture enforces complete data synchronicity, active database transaction consistency, offline edge-node outbox playback, and strict clinical CDSS safety gates. Every node acts as an interactive checkpoint in the national blood grid.' },
        { type: 'list', subtitle: 'The 6 Vein-to-Vein Security Nodes', items: [
          'Node 1: Donor intake via National CCCD chip parsing & Circular 26 compliance.',
          'Node 2: High-speed centrifugation lineage tracking & LIMS IDM digital release gating.',
          'Node 3: Standardized ISBT-128 printing & mandatory post-shelving physical Verify-Scan.',
          'Node 4: Hospital B2B Ordering via AI HICI, emergency STAT releases, & IoT cold chain telemetry.',
          'Node 5: Recipient registry, 72h sample expiry, antibody screening EXM/AHG routing, & bedside Verify-Scan.',
          'Node 6: Post-transfusion adverse reaction hemovigilance reporting & automated bidirectional Lookback.'
        ] },
        { type: 'table', subtitle: 'System Demo Accounts & Default Roles', tableData: {
          headers: ['Target Role', 'Demo Username', 'Default Access Password', 'Subsystem Permissions'],
          rows: [
            ['System Admin', 'admin', 'admin123', 'MDM, IAM, ALL Subsystems Authorization'],
            ['Hospital Operator', 'operator', 'password123', 'HOSPITAL Clinical Order Requisition, HUB Inventory'],
            ['Clinical Nurse', 'nurse_hosp_1', '123', 'LIMS Donor, LAB Testing, HOSPITAL Clinical Bedside']
          ]
        }}
      ]
    },
    LIMS: {
      title: 'Node 1: Donor Intake & Circular 26 Qualification (LIMS)',
      desc: 'Manages the primary entrance of the blood supply chain. Focuses on donor identity verification, Circular 26 clinical criteria, and physical-to-digital collection bag binding.',
      sections: [
        { type: 'steps', subtitle: 'Operational Registration Workflow', items: [
          'Verify Donor identity via high-speed scanning of the National CCCD chip card.',
          'Enforce Circular 26 criteria: Male >= 45kg, Female >= 42kg; Age between 18 and 60.',
          'Execute interval safety check: 12-week deferral for Whole Blood, 2-week for Platelets.',
          'Generate and apply ISBT-128 DIN barcode tags to the collection bag.',
          'Mark collection record status as COLLECTED and transmit event to Central Sync.'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: '7-Parameter Clinical Safety Survey Gate', content: 'LIMS enforces a strict clinical-grade 7-parameter medical screening (tattoo, malaria, wellness, high-risk diseases, vaccines, dental surgery, pregnancy/lactation) in compliance with Vietnamese national guidelines. Any unsafe answer dynamically triggers visual warnings explaining deferral periods and blocks the registration.' },
        { type: 'list', subtitle: 'Pre-Donation Questionnaire Deferral Tracking', items: [
          'All answers are permanently stored in answersJson for auditing.',
          'Clinical screening deferral reasons and estimated eligibility dates are browseable instantly.',
          'Enforces backend checks to prevent manual API bypass by rogue clients.'
        ] }
      ]
    },
    LAB: {
      title: 'Node 2: Centrifugation Lineage & LIMS IDM Gating (LAB)',
      desc: 'The technical gateway for blood safety. Governs component separation and LIMS infectious disease marker release gating.',
      sections: [
        { type: 'list', subtitle: 'Critical Processes', items: [
          'Trace parent Whole Blood bag to child lineage trees (PRBC, FFP, PLT components).',
          'Maintain absolute parent-child pedigree mapping inside the database.',
          'Infectious Disease Marking (IDM): HIV, HBV, HCV, and Syphilis metric ingestion.',
          'Automatic chain-reaction discard of all siblings if parent DIN tests REACTIVE.',
          'Hold cleared negative units in quarantined lock prior to Verify-Scan release.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Quarantine Lock Gating Protocol', content: 'Newly fabricated blood bags remain in a locked QUARANTINE state. They are strictly blocked from B2B requisitions, ordering, or manual dispatching until LIMS feeds all negative IDM markers and operators release the quarantine.' }
      ]
    },
    HUB: {
      title: 'Node 3: Inventory Verify-Scan & FEFO Stock (HUB)',
      desc: 'Centralized warehouse and inventory ledger engine. Minimizes wastage using smart FEFO algorithms and prevents mislabeling through Verify-Scan.',
      sections: [
        { type: 'steps', subtitle: 'Verify-Scan & Shelving Workflow', items: [
          'Print standardized ISBT-128 physical bag labels containing dynamic DIN barcodes.',
          'Force operator to physically scan the barcode tag prior to placing the bag on shelves.',
          'Backend verifies the physical scan against LIMS cleared parameters.',
          'Dynamically transition blood bag state to AVAILABLE available stock.',
          'Prevent mislabeling disaster (e.g. A-type bag mislabeled as B-type) by locking mismatching units.'
        ] },
        { type: 'list', subtitle: 'Logistics Dispatching & Stock Optimization', items: [
          'Intelligent FEFO (First-Expire, First-Out) picking recommendations to prevent inventory decay.',
          'Ensures real-time stock allocation locks (RESERVED) during multi-operator concurrent dispatching.',
          'Database enforces Optimistic Locking (version tracking) on all inventory rows.'
        ] }
      ]
    },
    HOSPITAL: {
      title: 'Node 4: Hospital Requisition & IoT Cold Chain (HOSPITAL)',
      desc: 'Connects B2B requisitions to logistics. Ensures STAT emergency release and cold chain integrity during transport.',
      sections: [
        { type: 'steps', subtitle: 'B2B Requisition and Transit Operations', items: [
          'Hospitals submit digital B2B orders with specific priority ratings (Routine, ASAP, STAT).',
          'System evaluates inventory using the HICI AI priority scoring algorithm.',
          'Activate Massive Transfusion Protocol (MTP) for trauma releases.',
          'Pack units in specialized cold chain boxes equipped with GPS & Temperature IoT loggers.',
          'Monitor real-time telemetry stream; cumulative excursion (>6°C for >30m) locks bags for waste.'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: 'MTP Break-Glass Emergency Bypass', content: 'In critical trauma, MTP activates a Break-Glass release bypass. This allows clinicians to instantly issue uncrossmatched O-type units, overriding typical specimen expired checks (>72h) or patient antibody histories, while generating logs for retrospective auditing.' }
      ]
    },
    NATIONAL: {
      title: 'Node 5: Recipient Crossmatch & Bedside Verification (CLINICAL)',
      desc: 'Point-of-care clinical safety check. Controls recipient compatibility, issuance timing, and bedside barcode validation.',
      sections: [
        { type: 'list', subtitle: 'Recipient Gating Safeguards', items: [
          'Validate recipient specimen collection date; strictly block use of samples older than 72 hours.',
          'Historical Antibody Route: If the patient has a positive antibody screening history, Electronic Crossmatching (EXM) and Immediate Spin (IS) are blocked, forcing manual Antiglobulin (AHG) crossmatching.',
          'Start issue-to-use chronometer tracking immediately upon issuing bags (ISSUED state).',
          'Enforce Golden 30-Minute Return Rule: server overrides nurse evaluation if returned after 30 minutes, marking units as WASTED.',
          'Bedside Scan-to-Verify: double-blind scan matching recipient wristband, blood bag barcode, and nurse ID.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Bedside Verification Hard Lock', content: 'Bedside Scan-to-Verify is the final clinical shield. If the scanned blood bag is not RESERVED for the patient, or if there is an ABO/Rh mismatch, the PDA app hard locks with an alarm, providing absolutely no bypass or override buttons to the nurses.' }
      ]
    },
    MDM: {
      title: 'Node 6: Hemovigilance reporting, Lookback, & MDM Control',
      desc: 'Global data governance. Coordinates adverse reaction reporting, automated bidirectional Lookback tracking, and the relational admin database control.',
      sections: [
        { type: 'steps', subtitle: 'Adverse Reaction & Automated Lookback', items: [
          'Ward nurses report adverse transfusion reactions (e.g. hemolytic, fever, hives) in Hemovigilance.',
          'Instantly trigger automated bidirectional Lookback engine inside a single ACID Database Transaction.',
          'Auto-quarantine all在庫 and in-transit sibling components (FFP, PLT from same parent DIN).',
          'Defer the original donor eligibility status in MDM (Multi-Donor Registry) to prevent exposures.',
          'Broadcast global secure alerts and write immutable audit event records.'
        ] },
        { type: 'list', subtitle: 'Superuser Spreadsheet Database Control', items: [
          'Access via secure purple cyber-portal gate reserved for authorized Admin roles.',
          'Interactive grid allows editing all 17 clinical database tables across 4 dependency layers (G1-G4).',
          'Duplicate Primary Key Block prevents data corruption.',
          'Orphan Foreign Key Block rejects invalid parent references.',
          'Restrict Deletion Block prevents parent row removal when active child records exist.',
          'Dynamic Schema translation in English, Traditional Chinese, and Vietnamese.'
        ] }
      ]
    }
  },
  'zh-TW': {
    Sys: {
      title: 'VN-BECS V1.0 臨床血液指揮中心功能架構',
      desc: 'VN-BECS 平台已從線性 SOP 模式進化為「血管到血管」的作戰指揮中心。系統整合 6 大核心功能節點，完全對齊 AABB、ISBT-128 及越南 Circular 26 臨床標準，確保冷鏈無縫與血液生命週期安全。',
      sections: [
        { type: 'text', subtitle: '臨床戰略願景', content: '我們的架構專注於實時數據同步、強一致性 ACID 資料庫事務、離線節點日誌重播機制，以及極其嚴格的臨床 CDSS 安全閘門。每個節點都是血液網格中的關鍵臨床哨口。' },
        { type: 'list', subtitle: '血液安全閉環控制節點', items: [
          '節點 1：使用國民身分證 (CCCD) 晶片感應與越南 Circular 26 間隔檢核的捐血登記。',
          '節點 2：高精度成分分離親子袋血緣追溯與 LIMS IDM 數位安全放行閘門。',
          '節點 3：標準 ISBT-128 標籤印刷與強制性上架前「實體回掃 Verify-Scan」二次核對。',
          '節點 4：醫院端 B2B 線上訂血 AI HICI 優先級評估、STAT 緊急領用與在途冷鏈 IoT 溫控軌跡。',
          '節點 5：受血者 72 小時檢體時效防線、抗體史 EXM/AHG 配血分流、發血退回 30 分鐘計時與床邊核對。',
          '節點 6：輸血不良反應 Hemovigilance 即時通報與自動化雙向追溯 (Lookback) 凍結引擎。'
        ] },
        { type: 'table', subtitle: '系統預設演示帳號與權限憑證', tableData: {
          headers: ['系統角色', '演示使用者帳號', '預設登入密碼', '子系統授權範圍'],
          rows: [
            ['最高管理員 (Admin)', 'admin', 'admin123', 'MDM, IAM 及所有子系統最高管轄權限'],
            ['醫院端操作員 (Operator)', 'operator', 'password123', 'HOSPITAL 臨床訂單申請、HUB 供應中心庫存'],
            ['臨床護理師 (Nurse)', 'nurse_hosp_1', '123', 'LIMS 捐血登記、LAB 檢驗判定、HOSPITAL 床邊核對']
          ]
        }}
      ]
    },
    LIMS: {
      title: '節點 1: 捐血者登記與 Circular 26 健康篩檢 (LIMS)',
      desc: '管理血液供應鏈的源頭輸入，專注於捐血人身份晶片驗證、Circular 26 體檢法規與血袋實體數位綁定。',
      sections: [
        { type: 'steps', subtitle: '捐血登記與採血標準作業流程', items: [
          '掃描越南 CCCD 晶片卡實時讀取並驗證捐血者基本個資。',
          'Circular 26 規定檢核：男性 >= 45kg，女性 >= 42kg；年齡限於 18 至 60 歲。',
          '強制執行捐血間隔：全血間隔為 12 週，血小板分離術為 2 週，逾期未滿者自動鎖定。',
          '產生符合 ISBT-128 標準之 DIN 唯一採集編號並張貼於血袋。',
          '寫入採集紀錄，狀態變更為 COLLECTED 並將同步日誌寫入 Event Outbox。'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: '7 參數臨床健康篩檢與安全阻擋門檻', content: '捐血中心強制執行符合越南國家標準之 7 參數臨床篩檢問卷（包含：刺青/紋身、瘧疾旅遊史、自覺不適、高風險傳染病、疫苗接種、牙科手術、妊娠及哺乳）。若勾選不安全項目，將即時以紅黃色橫幅顯示延緩規則說明並鎖定登記按鈕。' },
        { type: 'list', subtitle: '唯讀問卷報告卡 (Questionnaire Report Card)', items: [
          '問卷答題歷史永久保存於資料庫 answersJson 欄位以供稽核。',
          '在捐血人列表點選 ClipboardList 即可快速開啟問卷卡，呈現詳細通過或延緩原因。',
          '強制於伺服器後端執行所有檢核 API，防止前端惡意封包修改繞過。'
        ] }
      ]
    },
    LAB: {
      title: '節點 2: 成分血分離與 LIMS 檢驗安全門 (LAB)',
      desc: '血液製備與品質把關的前哨站。負責全血高速離心拆分親子家族樹，與 LIMS 傳染病多重指標數位安全閘門。',
      sections: [
        { type: 'list', subtitle: '關鍵品質控制作業', items: [
          '將全血（Whole Blood）離心拆分為 PRBC、FFP、PLT 三大成分。',
          '在資料庫中完整建立血源親子譜系關係樹，追溯單一 DIN 衍生出的所有子血袋。',
          'LIMS 傳染病標記（IDM）核對：包含 HIV、HBV、HCV、梅毒四大篩選指標。',
          '若任一 IDM 指標呈陽性反應，系統連鎖觸發 Discard 報廢程序，銷毀同 Din 的所有兄弟袋。',
          '陰性陰檢血袋暫時留存於隔離區（Quarantine）鎖定狀態，待 Verify-Scan 進行放行。'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: '隔離安全閘門鎖定協定', content: '所有新製備的成分血袋預設均處於強制隔離（QUARANTINE）狀態，嚴禁被預訂、發血或手動點收。唯有在 LIMS 判定全指標陰性通過且進行 Verify-Scan 數位稽核後方可解鎖。' }
      ]
    },
    HUB: {
      title: '節點 3: 條碼 Verify-Scan 庫存放行與 FEFO 揀選 (HUB)',
      desc: '中央庫存與發貨管理引擎。透過 Verify-Scan 消除貼錯標籤的生物安全災難，並實施智慧先進先出（FEFO）物流。',
      sections: [
        { type: 'steps', subtitle: 'Verify-Scan 二次實體回掃放行流程', items: [
          '當檢驗放行後，系統列印符合 ISBT-128 標準的實體標籤。',
          '操作員必須使用條碼槍「實體回掃」血袋上的 ISBT-128 DIN 與產品條碼。',
          '系統實時校對掃描條碼與 LIMS 陰性放行檔案屬性（確保型別、血型完全吻合）。',
          '比對無誤後，將血袋狀態從 Quarantine 正式解鎖變更為 AVAILABLE 可用庫存並上架。',
          '若出現條碼不匹配（例如 A 型血誤貼為 B 型），系統發出紅字警報並將血袋移入 HOLD 待查。'
        ] },
        { type: 'list', subtitle: '先進先出 FEFO 與併發控制', items: [
          '全面啟用先進先出（FEFO）揀貨機制，優先推薦即將到期的血袋以最大化降低血液報廢率。',
          '高併發揀貨防護：在多名調度員並發作業時，系統自動鎖定 RESERVED 狀態，並在 `Inventory` 導入資料庫樂觀鎖（Version column check），避免一血雙配。'
        ] }
      ]
    },
    HOSPITAL: {
      title: '節點 4: 醫院端需求申請、緊急 MTP 與 cold chain 物流 (HOSPITAL)',
      desc: '串聯 B2B 用血訂單與供應鏈。保障 STAT 緊急釋放與全程冷鏈物流安全。',
      sections: [
        { type: 'steps', subtitle: '醫院 B2B 訂購與運輸作業流程', items: [
          '醫院端發起線上 B2B 用血申請，標註優先級（Routine 常規、ASAP 儘速、STAT 緊急）。',
          '系統利用 HICI AI 優先級評估演算法自動進行訂單排序。',
          '危急創傷情境時，醫師特許啟動大量輸血協定（MTP）緊急領用。',
          '血品打包放入配備 GPS 與溫度傳感器之 IoT 冷鏈物流箱中出庫運輸。',
          'IoT 每分鐘回傳實時軌跡，若溫度偏離 2~6°C 累計超過 30 分鐘，系統於收貨時強制鎖死報廢。'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: 'MTP 一鍵破窗緊急釋放 (Break-Glass Bypass)', content: '在嚴重創傷大出血的生死關頭，MTP 允許啟動 Break-Glass 破窗釋放機制。系統將繞過常規受血者檢體到期（>72小時）或病患歷史抗體篩檢，特許強制發放 O 型血品，但會在系統補登看板掛載追蹤以利 retrospective 審計。' }
      ]
    },
    NATIONAL: {
      title: '節點 5: 受血者配血、黃金 30 分鐘與床邊防呆 (CLINICAL)',
      desc: '輸血現場的最後防線。管理受血者檢體效期、交叉配血路由分流、發血退回計時與床邊驗證。',
      sections: [
        { type: 'list', subtitle: '臨床用血安全 CDSS 防護網', items: [
          '嚴格驗證病患檢體日期，若檢體採集時間 > 72 小時，系統硬性鎖死配血功能。',
          '抗體史交叉配血分流：若病患在院內 LIS 中具有抗體陽性歷史紀錄，系統徹底封鎖電子配血（EXM）與即時離心配血（IS），強制必須採用手動抗球蛋白配血（AHG）。',
          '發血出庫時（ISSUED 狀態），啟動伺服器端黃金 30 分鐘退回計時器。',
          '伺服器時間覆寫：退回血袋時，系統自動計算 issuedAt 差值，若 > 30 分鐘，不論人工檢查是否合格，伺服器直接覆寫為 WASTED 強制報廢。',
          '床邊核對（Scan-to-Verify）：使用 PDA 雙盲掃描病患手環 Mrn、血袋 DIN 與雙人護理師識別證。'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: '床邊核對 ABO/RhD 不匹配鎖死機制', content: '床邊 Scan-to-Verify 是病患體內的最後一道防線。若掃描比對發現血袋並非為該病患 RESERVED，或是 ABO/Rh 存在不相容，PDA 應用程式將發出劇烈紅色警報並完全鎖死，不提供任何「跳過」或「醫師覆寫」按鈕，強行中止臨床誤輸血。' }
      ]
    },
    MDM: {
      title: '節點 6: 不良反應通報、雙向追溯 Lookback 與 MDM 試算表',
      desc: '全域數據治理核心。管理臨床輸血反應 Hemovigilance 登錄、自動化雙向 Lookback 引擎以及 17 張關係試算表之超級控制台。',
      sections: [
        { type: 'steps', subtitle: '不良反應即時通報與 Lookback 關聯鎖定', items: [
          '若病患於輸注時發生發燒、溶血、蕁麻疹等症狀，護理師立即在系統登錄輸血不良反應。',
          '系統在寫入不良反應的同一個 ACID Database Transaction 中，一鍵觸發雙向 Lookback 追溯。',
          '自動且強制將全庫房、運送箱內同一 DIN 的所有兄弟成分袋（如該 DIN 拆分出的 FFP、PLT）狀態改寫為 QUARANTINE 凍結。',
          '在 MDM 系統中自動將該捐血人狀態設為「暫停捐血/永久禁捐」，防止其再次捐血。',
          '廣播全域系統級警報，並寫入不可篡改的 AuditEvent 稽核日誌。'
        ] },
        { type: 'list', subtitle: '超級使用者關聯式試算表控制台 (Superuser Spreadsheet)', items: [
          '入口位於側邊欄底部紫色發光賽博按鈕，僅授權具備 Admin 最高權限之管理員登入。',
          '網格化控制台支援對 4 大依賴分組（G1-G4）共 17 張關係表進行流暢的增刪查改（CRUD）。',
          '唯一性鎖定防止重複主鍵 (PrimaryKey Protection)；孤兒外鍵防護防止無效外鍵關聯 (ForeignKey Protection)。',
          '防止連鎖刪除（Restrict Deletion）：若子表存在依賴數據，嚴禁直接刪除父表資料。',
          '智慧 ID 生成器：點選插入新列時，系統依據資料表格式自動生成 ORD-****, DNR-**** 等符合格式之主鍵。'
        ] }
      ]
    }
  },
  'vi': {
    Sys: {
      title: 'Kiến trúc Chức năng Chỉ huy Lâm sàng VN-BECS V1.0',
      desc: 'Nền tảng VN-BECS đã tiến hóa từ mô hình SOP tuyến tính sang Trung tâm Chỉ huy khép kín từ "Tĩnh mạch đến Tĩnh mạch". Tích hợp 6 nút chức năng, tuân thủ nghiêm ngặt AABB, ISBT-128 và Thông tư 26 Bộ Y tế Việt Nam.',
      sections: [
        { type: 'text', subtitle: 'Tầm nhìn Lâm sàng', content: 'Kiến trúc của chúng tôi thực thi đồng bộ dữ liệu thời gian thực, tính nhất quán ACID Database Transaction, phát lại nhật ký ngoại tuyến Outbox, và cơ chế CDSS an toàn lâm sàng nghiêm ngặt.' },
        { type: 'list', subtitle: '6 Nút An toàn Truyền máu', items: [
          'Nút 1: Tiếp nhận người hiến bằng quét chip CCCD & kiểm tra Thông tư 26.',
          'Nút 2: Tách thành phần máu phả hệ cha-con & Cổng cách ly an toàn LIMS IDM.',
          'Nút 3: In nhãn tiêu chuẩn ISBT-128 & bắt buộc quét Verify-Scan trước khi lên kệ kho.',
          'Nút 4: Đặt hàng B2B qua ưu tiên AI HICI, phát khẩn cấp MTP & giám sát nhiệt độ IoT chuỗi lạnh.',
          'Nút 5: Xét nghiệm chéo受血者, hạn mẫu 72g, phân luồng EXM/AHG, quy tắc 30 phút & đối chiếu tại giường.',
          'Nút 6: Báo cáo tai biến Hemovigilance & tự động kích hoạt truy xuất hai chiều Lookback.'
        ] },
        { type: 'table', subtitle: 'Tài khoản Demo Hệ thống & Vai trò Mặc định', tableData: {
          headers: ['Vai trò mục tiêu', 'Tên đăng nhập Demo', 'Mật khẩu mặc định', 'Quyền truy cập phân hệ'],
          rows: [
            ['Quản trị viên (Admin)', 'admin', 'admin123', 'Quyền hạn tối cao trên MDM, IAM và tất cả phân hệ'],
            ['Nhân viên Bệnh viện (Operator)', 'operator', 'password123', 'Yêu cầu đơn hàng HOSPITAL, Kho hàng HUB'],
            ['Điều dưỡng Lâm sàng (Nurse)', 'nurse_hosp_1', '123', 'Đăng ký LIMS, Xét nghiệm LAB, Kiểm tra tại giường HOSPITAL']
          ]
        }}
      ]
    },
    LIMS: {
      title: 'Nút 1: Tiếp nhận & Kiểm tra điều kiện Thông tư 26 (LIMS)',
      desc: 'Quản lý đầu vào sơ cấp của chuỗi cung ứng máu. Tập trung vào xác minh danh tính người hiến qua CCCD, kiểm tra y tế Thông tư 26 và liên kết túi máu.',
      sections: [
        { type: 'steps', subtitle: 'Quy trình Tiếp nhận và Hiến máu', items: [
          'Xác minh danh tính người hiến bằng cách quét nhanh chip CCCD.',
          'Tuân thủ Thông tư 26: Nam >= 45kg, Nữ >= 42kg; Tuổi từ 18 đến 60.',
          'Kiểm tra khoảng cách hiến: hiến máu toàn phần khóa 12 tuần, hiến tiểu cầu khóa 2 tuần.',
          'Tạo mã vạch tiêu chuẩn ISBT-128 DIN dán lên túi máu thu hoạch.',
          'Đổi trạng thái túi máu thành COLLECTED và truyền nhật ký Outbox đồng bộ.'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: 'Bảng hỏi Sàng lọc An toàn 7 Tiêu chí Lâm sàng', content: 'LIMS bắt buộc thực hiện bảng câu hỏi sàng lọc y tế 7 tiêu chuẩn (hình xăm, sốt rét, sức khỏe tổng quát, bệnh truyền nhiễm, tiêm chủng, phẫu thuật nha khoa, thai kỳ & cho con bú) theo quy định Bộ Y tế. Các câu trả lời không an toàn sẽ kích hoạt cảnh báo trì hoãn và khóa đăng ký hiến máu.' },
        { type: 'list', subtitle: 'Thẻ Báo cáo Bảng hỏi Hiến máu', items: [
          'Kết quả bảng hỏi lưu trữ vĩnh viễn trong answersJson để phục vụ hậu kiểm.',
          'Xem báo cáo sàng lọc nhanh tại dòng người hiến bằng cách bấm vào biểu tượng ClipboardList.',
          'Thực thi kiểm tra backend API nghiêm ngặt để ngăn chặn hành vi bypass.'
        ] }
      ]
    },
    LAB: {
      title: 'Nút 2: Tách thành phần phả hệ & Cổng duyệt LIMS IDM (LAB)',
      desc: 'Cửa ngõ chất lượng máu lâm sàng. Quản lý ly tâm tách thành phần máu và cổng xét nghiệm LIMS IDM.',
      sections: [
        { type: 'list', subtitle: 'Hoạt động Kỹ thuật LAB', items: [
          'Tách máu toàn phần thành các thành phần PRBC, FFP, PLT bằng ly tâm tốc độ cao.',
          'Duy trì phả hệ liên kết túi máu cha-con trong cơ sở dữ liệu.',
          'Nhận chỉ số xét nghiệm IDM: HIV, HBV, HCV và Giang mai từ máy LIMS.',
          'Nếu bất kỳ chỉ số nào dương tính (REACTIVE), tự động hủy bỏ (Discard) tất cả túi máu cùng DIN.',
          'Giữ các túi máu âm tính ở trạng thái cách ly (QUARANTINE) trước khi Verify-Scan.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Giao thức Cổng duyệt cách ly an toàn LIMS', content: 'Mọi túi máu mới sản xuất mặc định ở trạng thái khóa cách ly QUARANTINE. Hệ thống chặn hoàn toàn việc đặt hàng hoặc phát máu cho đến khi nhận đủ chỉ số âm tính từ LIMS và nhân viên quét Verify-Scan.' }
      ]
    },
    HUB: {
      title: 'Nút 3: Quét Verify-Scan duyệt kho & Thuật toán FEFO (HUB)',
      desc: 'Động cơ quản lý kho trung tâm. Áp dụng Verify-Scan loại bỏ rủi ro dán nhãn nhầm và thuật toán FEFO để tối ưu kho.',
      sections: [
        { type: 'steps', subtitle: 'Quy trình quét Verify-Scan nhập kho', items: [
          'In nhãn tiêu chuẩn ISBT-128 chứa mã vạch DIN và sản phẩm.',
          'Bắt buộc nhân viên dùng đầu đọc quét mã vạch trên nhãn vật lý trước khi đưa lên kệ.',
          'Hệ thống đối chiếu mã quét với thuộc tính陰 tính đã được duyệt trong LIMS.',
          'Nếu khớp hoàn toàn, chuyển trạng thái túi máu sang AVAILABLE để đưa vào sử dụng.',
          'Nếu quét lệch (ví dụ túi máu A dán nhãn B), kích hoạt chuông cảnh báo đỏ và khóa vào HOLD.'
        ] },
        { type: 'list', subtitle: 'Tối ưu hóa FEFO và Kiểm soát đồng thời', items: [
          'Áp dụng thuật toán FEFO (Hết hạn trước, Xuất trước) để giảm thiểu tỷ lệ hủy máu do quá hạn.',
          'Kiểm soát đồng thời: Kho dữ liệu áp dụng khóa lạc quan (Optimistic Locking, check version) khi nhiều điều phối viên cùng lấy một túi máu, tránh trùng lặp.'
        ] }
      ]
    },
    HOSPITAL: {
      title: 'Nút 4: Đặt máu B2B Bệnh viện, khẩn MTP & Logistics IoT (HOSPITAL)',
      desc: 'Kết nối yêu cầu lâm sàng với chuỗi cung ứng. Quản lý phát khẩn STAT, phác đồ MTP và chuỗi lạnh vận chuyển IoT.',
      sections: [
        { type: 'steps', subtitle: 'Đơn hàng B2B và Hoạt động Vận chuyển', items: [
          'Bệnh viện gửi yêu cầu B2B online với các độ khẩn Routine, ASAP hoặc STAT.',
          'Hệ thống chấm điểm thứ tự ưu tiên bằng thuật toán AI HICI.',
          'Kích hoạt phác đồ truyền máu khối lượng lớn (MTP) cho cấp cứu chấn thương.',
          'Đóng gói túi máu vào thùng IoT chuyên dụng có đo nhiệt độ và GPS.',
          'Cập nhật đo đạc mỗi phút; lệch 2-6°C tích lũy quá 30 phút tự động hủy (WASTED) khi nhận hàng.'
        ] },
        { type: 'alert', alertType: 'warning', subtitle: 'Kích hoạt Khẩn cấp MTP Break-Glass Bypass', content: 'Trong chấn thương nguy kịch, MTP kích hoạt cơ chế Break-Glass cấp phát khẩn. Cho phép bác sĩ phát ngay túi máu O chưa làm phản ứng chéo, bỏ qua kiểm tra mẫu máu hết hạn (>72g) hoặc kháng thể bệnh nhân, và tự động ghi log để phục vụ hậu kiểm.' }
      ]
    },
    NATIONAL: {
      title: 'Nút 5: Phản ứng chéo受血者, Hạn 30 phút & Đối chiếu tại giường (CLINICAL)',
      desc: 'Lá chắn an toàn cuối cùng tại giường bệnh. Kiểm soát mẫu bệnh nhân, phân luồng phản ứng chéo, hạn trả máu 30 phút và quét tại giường.',
      sections: [
        { type: 'list', subtitle: 'Lá chắn An toàn Lâm sàng CDSS', items: [
          'Chặn hoàn toàn việc làm phản ứng chéo nếu mẫu máu bệnh nhân quá 72 giờ.',
          'Phân luồng chéo: Nếu bệnh nhân có tiền sử kháng thể dương tính, hệ thống khóa cứng phương pháp EXM (điện tử) và IS, bắt buộc làm phản ứng chéo thủ công AHG.',
          'Khi phát máu (ISSUED), đồng hồ đếm ngược 30 phút trên server lập tức kích hoạt.',
          'Ghi đè thời gian server: Trả lại máu quá 30 phút, server tự động chuyển sang WASTED bất kể cảm quan đạt.',
          'Đối chiếu tại giường (Scan-to-Verify): Quét mã vòng tay bệnh nhân, mã túi máu ISBT-128 và ID điều dưỡng.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Khóa cứng Bất tương thích ABO/Rh tại giường bệnh', content: 'Quét tại giường Scan-to-Verify là bước phòng vệ cuối cùng. Nếu quét phát hiện túi máu không được RESERVED cho bệnh nhân này, hoặc ABO/Rh bất tương thích, ứng dụng PDA lập tức khóa cứng và báo động đỏ, không cung cấp bất kỳ nút bỏ qua nào để tránh truyền nhầm nhóm máu.' }
      ]
    },
    MDM: {
      title: 'Nút 6: Báo tai biến Hemovigilance, Lookback & Siêu bảng tính MDM',
      desc: 'Nút quản trị dữ liệu toàn cầu. Quản lý báo cáo tai biến truyền máu, tự động kích hoạt công cụ Lookback và bảng điều khiển siêu cơ sở dữ liệu.',
      sections: [
        { type: 'steps', subtitle: 'Báo cáo Tai biến & Tự động Truy xuất Lookback hai chiều', items: [
          'Điều dưỡng lâm sàng gửi báo cáo phản ứng có hại (sốt,溶 huyết, dị ứng) lên hệ thống Hemovigilance.',
          'Hệ thống lập tức kích hoạt công cụ truy xuất Lookback hai chiều trong cùng một ACID Database Transaction.',
          'Tự động khóa cách ly (QUARANTINE) khẩn cấp toàn bộ túi máu thành phần liên đới cùng DIN còn trong kho/vận chuyển.',
          'Chuyển trạng thái người hiến máu sang tạm hoãn/cấm hiến trên cơ sở dữ liệu MDM.',
          'Phát cảnh báo toàn hệ thống và ghi nhận AuditEvent không thể sửa xóa.'
        ] },
        { type: 'list', subtitle: 'Bảng điều khiển Siêu cơ sở dữ liệu Excel (Superuser Spreadsheet)', items: [
          'Lối vào qua nút Cyber màu tím phát sáng tại sidebar, yêu cầu đăng nhập bằng tài khoản có vai trò Admin.',
          'Hỗ trợ CRUD mượt mà trên toàn bộ 17 bảng dữ liệu lâm sàng thuộc 4 nhóm phụ thuộc (G1-G4).',
          'Khóa trùng PK ngăn ngừa hỏng dữ liệu; Khóa ngoại FK chặn liên kết rác.',
          'Ngăn xóa liên hoàn (Restrict Delete): Chặn xóa dữ liệu cha khi có dữ liệu con đang tham chiếu.',
          'Tự động sinh mã ID (ORD-***, DNR-***) tương thích định dạng bảng khi thêm dòng mới.'
        ] }
      ]
    }
  }
};
