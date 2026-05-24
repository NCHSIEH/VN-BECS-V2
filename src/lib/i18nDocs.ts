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
      title: 'VN-BECS V1.0 Functional Architecture',
      desc: 'The VN-BECS platform has evolved from a linear SOP model into a mission-critical "Command Center" architecture. It is organized into 6 core functional nodes that ensure a seamless "Vein-to-Vein" blood management lifecycle.',
      sections: [
        { type: 'text', subtitle: 'Strategic Vision', content: 'Our architecture focuses on real-time data synchronization, multi-tenant isolation, and clinical safety. Every node represents a specific operational station in the national blood supply grid.' },
        { type: 'list', subtitle: 'The 6 Core Command Nodes', items: ['Donor Center (LIMS): Frontline registration and phlebotomy.', 'Quality Lab (LAB): Precision screening and component fabrication.', 'Supply Hub (HUB): Centralized logistics and FEFO inventory.', 'Clinical Node (HOSPITAL): Requisition and bedside safety.', 'Strategic Hub (NATIONAL): National visibility and crisis modeling.', 'Master Database (MDM): Global governance and RBAC control.'] },
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
      title: 'Node 1: Donor Center (LIMS)',
      desc: 'Manages the primary intake of the blood supply chain. Focuses on donor safety, eligibility, and the physical-to-digital binding of units.',
      sections: [
        { type: 'steps', subtitle: 'Registration & Collection', items: ['Verify Donor via National ID (CCCD).', 'Execute 7-Parameter Medical Screening & Survey.', 'Generate and apply ISBT-128 barcodes.', 'Digital binding of collection bag to donor record.', 'Real-time phlebotomy volume monitoring.'] },
        { type: 'alert', alertType: 'warning', subtitle: '7-Parameter Clinical Safety Gatekeeper', content: 'LIMS enforces a strict clinical-grade 7-parameter medical screening (tattoo, malaria, wellness, high-risk diseases, vaccines, dental surgery, pregnancy/lactation) in compliance with Vietnamese national guidelines. Any unsafe answer dynamically triggers visual warnings explaining deferral periods and blocks the registration.' },
        { type: 'list', subtitle: 'Pre-Donation Questionnaire Report Cards', items: ['All answers are permanently stored in answersJson.', 'Easily browse clinical screening records directly from donor rows.', 'Displays Passed/Deferred status, exact reasons, and estimated eligibility dates.'] }
      ]
    },
    LAB: {
      title: 'Node 2: Quality & Testing (LAB)',
      desc: 'The technical gateway for blood safety. Ensures every unit is cleared for infectious diseases and accurately typed.',
      sections: [
        { type: 'list', subtitle: 'Critical Processes', items: ['Automated Infectious Disease Marking (IDM).', 'NAT (Nucleic Acid Testing) verification.', 'Precision ABO/RhD Grouping.', 'Component separation (RBC, FFP, PLT).', 'QA Release to Hub Inventory.'] },
        { type: 'alert', alertType: 'danger', subtitle: 'Quarantine Protocol', content: 'Units remain in a hard-gated "Quarantine" state until dual-signature lab release is performed. Any reactive marker results in immediate discard.' }
      ]
    },
    HUB: {
      title: 'Node 3: Supply Chain (HUB)',
      desc: 'The centralized logistics engine. Manages national inventory distribution using smart FEFO algorithms.',
      sections: [
        { type: 'text', subtitle: 'FEFO Dispatching', content: 'The Hub utilizes First-Expire, First-Out (FEFO) logic to minimize wastage. Operators are guided by the system to pick the optimal units for every hospital requisition.' },
        { type: 'steps', subtitle: 'Logistics Workflow', items: ['Receive Hospital B2B Requisitions.', 'Execute FEFO Picking.', 'Validate Cold Chain Entry.', 'Assign Courier & IoT Tracking Box.', 'Monitor real-time GPS & Temperature status.'] }
      ]
    },
    HOSPITAL: {
      title: 'Node 4: Clinical Node (HOSPITAL)',
      desc: 'Point-of-care execution. Manages hospital-side inventory, emergency ordering, and patient safety.',
      sections: [
        { type: 'list', subtitle: 'Clinical Operations', items: ['Digital B2B Ordering (Routine/ASAP/STAT).', 'Bedside Barcode Verification (Patient/Bag).', 'Adverse Reaction Reporting (SOP 7).', 'MTP (Massive Transfusion Protocol) Activation.', 'Issue/Return and 30-Minute Rule Monitoring.'] },
        { type: 'alert', alertType: 'warning', subtitle: 'Safety Breach', content: 'Any scan mismatch during bedside verification results in a hard system lock. Override is only possible with Physician authorization.' }
      ]
    },
    NATIONAL: {
      title: 'Node 5: Strategic Hub (NATIONAL)',
      desc: 'High-level oversight for national commanders. Provides a real-time macro-grid of the entire blood supply chain.',
      sections: [
        { type: 'text', subtitle: 'Crisis Intelligence', content: 'Monitors national inventory levels, demand spikes, and logistics efficiency. Features crisis simulation tools for pandemic or mass-casualty event modeling.' },
        { type: 'table', subtitle: 'Key Performance Indicators', tableData: {
          headers: ['Metric', 'Target', 'Critical Threshold'],
          rows: [
            ['STAT Response', '< 15 mins', '> 45 mins'],
            ['Cold Chain Integrity', '100%', '< 98%'],
            ['Wastage (Expiry)', '< 2%', '> 5%'],
            ['Inventory Days', '7-10 Days', '< 3 Days']
          ]
        }}
      ]
    },
    MDM: {
      title: 'Node 6: Master Database (MDM)',
      desc: 'Global governance and system configuration. Manages the physical network and user RBAC policies.',
      sections: [
        { type: 'text', subtitle: 'Excel-Style Relational Spreadsheet DB Console', content: 'MDM has been upgraded with a powerful, secure Superuser Spreadsheet DB Console allowing admins to view, insert, update, and delete records inside all 17 database tables across 4 dependency groups (G1-G4).' },
        { type: 'list', subtitle: 'Relational Constraint Protection Engine', items: [
          'Duplicate Primary Key Block: Prevents duplicate row IDs.',
          'Orphan Foreign Key Block: Rejects saving invalid parent references (e.g. invalid orgId).',
          'Restrict Deletion Block: Prevents deleting parent rows (e.g. organization, donor, patient) when dependent child records exist.',
          'Dynamic Schema Label Translation: Real-time dynamic column headers in English, Chinese, and Vietnamese.',
          'PK Code Generator: Automatically generates correct ID prefix formats (ORD, DNR, QST, etc.) on row insertion.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Dynamic Admin Secure Gateway', content: 'Entering the Superuser Console requires successful login authentication on a glowing purple cyber portal, matching credentials against active database records and verifying a role of Admin (highest privilege).' }
      ]
    }
  },
  'zh-TW': {
    Sys: {
      title: 'VN-BECS V1.0 功能架構導引',
      desc: 'VN-BECS 平台已從傳統的線性 SOP 模式進化為「作戰指揮中心」架構。系統劃分為 6 大核心功能節點，確保血液從「捐贈者血管到病患血管」的全生命週期安全。',
      sections: [
        { type: 'text', subtitle: '戰略願景', content: '我們的架構專注於實時數據同步、多租戶隔離與臨床安全。每個節點代表國家血液供應網格中的一個專屬作戰工作站。' },
        { type: 'list', subtitle: '6 大核心指揮節點', items: ['捐血中心 (LIMS): 第一線註冊與採血管理。', '品管實驗室 (LAB): 精準篩檢與成分製作。', '供應中心 (HUB): 集中化物流與 FEFO 庫存調度。', '臨床節點 (HOSPITAL): 醫院端需求申請與床邊安全。', '戰略中心 (NATIONAL): 全國庫存監控與危機模擬。', '主數據庫 (MDM): 全球治理與 RBAC 權限控制。'] },
        { type: 'table', subtitle: '系統預設角色與演示帳號憑證', tableData: {
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
      title: '節點 1: 捐血中心站 (LIMS)',
      desc: '管理血液供應鏈的源頭輸入，專注於捐血者安全、資格審查與血袋數位綁定。',
      sections: [
        { type: 'steps', subtitle: '註冊與採血流程', items: ['使用國民身分證 (CCCD) 驗證捐血者。', '執行醫學篩檢與 7 參數健康問卷。', '生成並張貼 ISBT-128 國際標準條碼。', '數位化綁定採血袋與捐血者紀錄。', '實時監控採集容量。'] },
        { type: 'alert', alertType: 'warning', subtitle: '7 參數臨床健康篩檢與安全阻擋門檻', content: '捐血中心強制執行符合越南國家標準之 7 參數臨床篩檢問卷（包含：刺青/紋身、瘧疾旅遊史、自覺不適、高風險傳染病、疫苗接種、牙科手術、妊娠及哺乳）。若勾選不安全項目，將即時以紅黃色橫幅顯示延緩規則說明並鎖定登記按鈕。' },
        { type: 'list', subtitle: '唯讀問卷報告卡 (Questionnaire Report Card)', items: [
          '問卷填寫結果永久儲存於 answersJson。',
          '在捐血人列表點選 ClipboardList 即可開啟問卷報告卡。',
          '詳細呈現通過/延緩狀態、具體延緩原因與預估可捐血日期。'
        ] }
      ]
    },
    LAB: {
      title: '節點 2: 品質與檢驗 (LAB)',
      desc: '血液安全的技術閘口，確保每一單位血品均經過傳染病篩檢與精準分型。',
      sections: [
        { type: 'list', subtitle: '關鍵作業', items: ['自動化傳染病標記 (IDM) 檢測。', 'NAT (核酸檢測) 複核驗證。', '精準 ABO/RhD 血型鑑定。', '成分血分離 (紅血球、血漿、血小板)。', 'QA 放行至 Hub 供應中心。'] },
        { type: 'alert', alertType: 'danger', subtitle: '隔離控管協定', content: '在完成實驗室雙人簽章放行前，血品將處於強制隔離狀態。任何陽性反應將導致系統立即執行報廢程序。' }
      ]
    },
    HUB: {
      title: '節點 3: 供應鏈中心 (HUB)',
      desc: '中央物流引擎。利用智慧 FEFO 演算法管理全國庫存分配。',
      sections: [
        { type: 'text', subtitle: 'FEFO 調度邏輯', content: 'Hub 採用「先進先出 (FEFO)」邏輯以最大程度降低血液報廢。系統會引導操作員為每筆醫院訂單揀選最合適的單位。' },
        { type: 'steps', subtitle: '物流作業流', items: ['接收醫院 B2B 訂血需求。', '執行智慧 FEFO 揀貨。', '驗證冷鏈入庫紀錄。', '指派運送人員與 IoT 追蹤箱。', '監控實時 GPS 與溫度狀態。'] }
      ]
    },
    HOSPITAL: {
      title: '節點 4: 臨床醫療節點 (HOSPITAL)',
      desc: '醫療現場執行端。管理醫院庫存、緊急訂血與病患輸血安全。',
      sections: [
        { type: 'list', subtitle: '臨床作業', items: ['數位 B2B 訂單 (常規/急件/STAT)。', '床邊條碼雙重核對 (病患與血袋)。', '輸血不良反應即時通報。', 'MTP (大量輸血協定) 一鍵啟動。', '發退血管理與 30 分鐘冷鏈規則監控。'] },
        { type: 'alert', alertType: 'warning', subtitle: '安全警示', content: '床邊驗證過程中若出現任何條碼不匹配，系統將強制鎖定。僅能由醫師授權後方可覆寫。' }
      ]
    },
    NATIONAL: {
      title: '節點 5: 戰略指揮中心 (NATIONAL)',
      desc: '全國指揮官的宏觀監控台。提供完整供應鏈的實時數據矩陣。',
      sections: [
        { type: 'text', subtitle: '危機情報分析', content: '監控全國庫存水位、需求激增與物流效率。具備針對大流行或大規模傷亡事件的危機模擬工具。' },
        { type: 'table', subtitle: '關鍵績效指標 (KPI)', tableData: {
          headers: ['指標項', '目標值', '危險閾值'],
          rows: [
            ['STAT 急件響應', '< 15 分鐘', '> 45 分鐘'],
            ['冷鏈完整性', '100%', '< 98%'],
            ['血液報廢率 (過期)', '< 2%', '> 5%'],
            ['庫存可供應天數', '7-10 天', '< 3 天']
          ]
        }}
      ]
    },
    MDM: {
      title: '節點 6: 主數據中心 (MDM)',
      desc: '全域治理與系統配置。管理實體網路架構與使用者權限政策。',
      sections: [
        { type: 'text', subtitle: '網格治理與超級試算表系統', content: 'MDM 已升級為強大的超級使用者 Excel 關聯式試算表控制台，管理員可對 4 大依賴組別中的 17 張關係表進行極致流暢的新增、修改與刪除。' },
        { type: 'list', subtitle: '完整關聯性防護引擎', items: [
          '唯一性鎖定：阻擋重複的主鍵編碼 (PrimaryKey Violation)。',
          '孤兒外鍵防護：自動檢驗並阻擋無效的外鍵參考 (ForeignKey Violation)。',
          '防止連鎖刪除：若子表有參考數據，嚴禁直接刪除父表資料 (Restrict Delete)。',
          '三語欄位對照：標題完全支援繁中、英文、越文動態翻譯。',
          '智慧 ID 生成：點選插入新列時，自動生成如 ORD-****, DNR-**** 等符合資料表格式之主鍵。'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: '動態管理員安全門禁鎖 (Admin Gatekeeper)', content: '欲開啟超級使用者試算表控制台，必須通過側邊欄底部紫色發光賽博按鈕入口，進行動態資料庫帳密權限校驗，且帳密對應之角色必須為 Admin 方可進入。' }
      ]
    }
  },
  'vi': {
    Sys: {
      title: 'Kiến trúc Chức năng VN-BECS V1.0',
      desc: 'Nền tảng VN-BECS đã phát triển từ mô hình SOP tuyến tính sang kiến trúc "Trung tâm Chỉ huy" thực chiến. Hệ thống được tổ chức thành 6 nút chức năng cốt lõi.',
      sections: [
        { type: 'text', subtitle: 'Tầm nhìn Chiến lược', content: 'Kiến trúc của chúng tôi tập trung vào đồng bộ hóa dữ liệu thời gian thực, cách ly đa đối tượng và an toàn lâm sàng.' },
        { type: 'list', subtitle: '6 Nút Chỉ huy Cốt lõi', items: ['Trung tâm Hiến máu (LIMS)', 'Phòng Thí nghiệm (LAB)', 'Trung tâm Cung ứng (HUB)', 'Nút Lâm sàng (HOSPITAL)', 'Trung tâm Chiến lược (NATIONAL)', 'Cơ sở Dữ liệu Chính (MDM)'] },
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
      title: 'Nút 1: Trung tâm Hiến máu (LIMS)',
      desc: 'Quản lý đầu vào sơ cấp của chuỗi cung ứng máu. Tập trung vào an toàn người hiến và liên kết túi máu.',
      sections: [
        { type: 'steps', subtitle: 'Đăng ký & Lấy máu', items: ['Xác minh qua CCCD.', 'Khám sàng lọc y tế với 7 tiêu chuẩn lâm sàng.', 'Tạo mã vạch ISBT-128.', 'Liên kết túi máu với hồ sơ.', 'Theo dõi thể tích lấy máu.'] },
        { type: 'alert', alertType: 'warning', subtitle: 'Bộ lọc An toàn Lâm sàng 7 Tiêu chí', content: 'LIMS bắt buộc thực hiện bảng câu hỏi sàng lọc y tế 7 tiêu chuẩn (hình xăm, sốt rét, sức khỏe tổng quát, bệnh truyền nhiễm, tiêm chủng, phẫu thuật nha khoa, thai kỳ & cho con bú) theo quy định Bộ Y tế. Các câu trả lời không an toàn sẽ kích hoạt cảnh báo trì hoãn và khóa đăng ký hiến máu.' },
        { type: 'list', subtitle: 'Thẻ Báo cáo Bảng hỏi Hiến máu', items: [
          'Kết quả lưu trữ vĩnh viễn trong answersJson.',
          'Xem báo cáo lâm sàng trực tiếp bằng cách bấm vào biểu tượng ClipboardList tại dòng người hiến.',
          'Hiển thị chi tiết trạng thái Đạt/Hoãn, lý do cụ thể và ngày đủ điều kiện hiến tiếp theo.'
        ] }
      ]
    },
    LAB: {
      title: 'Nút 2: Chất lượng & Xét nghiệm (LAB)',
      desc: 'Cửa ngõ kỹ thuật cho an toàn truyền máu. Đảm bảo mọi đơn vị đều sạch bệnh truyền nhiễm.',
      sections: [
        { type: 'list', subtitle: 'Quy trình Quan trọng', items: ['Xét nghiệm IDM tự động.', 'Xác nhận NAT.', 'Định nhóm máu chính xác.', 'Phân tách thành phần máu.', 'Giải phóng QA lên Hub.'] }
      ]
    },
    HUB: {
      title: 'Nút 3: Chuỗi cung ứng (HUB)',
      desc: 'Động cơ hậu cần trung tâm. Quản lý phân phối kho quốc gia bằng thuật toán FEFO thông minh.',
      sections: [
        { type: 'steps', subtitle: 'Quy trình Hậu cần', items: ['Nhận yêu cầu B2B.', 'Thực hiện lấy hàng FEFO.', 'Xác nhận nhập chuỗi lạnh.', 'Chỉ định vận chuyển & IoT.', 'Theo dõi GPS & Nhiệt độ.'] }
      ]
    },
    HOSPITAL: {
      title: 'Nút 4: Nút Lâm sàng (HOSPITAL)',
      desc: 'Thực thi tại điểm chăm sóc. Quản lý kho bệnh viện, đặt hàng khẩn cấp và an toàn bệnh nhân.',
      sections: [
        { type: 'list', subtitle: 'Hoạt động Lâm sàng', items: ['Đặt hàng B2B kỹ thuật số.', 'Xác minh tại giường.', 'Báo cáo phản ứng bất lợi.', 'Kích hoạt MTP khẩn cấp.', 'Theo dõi quy tắc 30 phút.'] }
      ]
    },
    NATIONAL: {
      title: 'Nút 5: Trung tâm Chiến lược (NATIONAL)',
      desc: 'Giám sát cấp cao cho các chỉ huy quốc gia. Cung cấp mạng lưới vĩ mô thời gian thực.',
      sections: [
        { type: 'table', subtitle: 'Chỉ số KPI chính', tableData: {
          headers: ['Chỉ số', 'Mục tiêu', 'Ngưỡng tới hạn'],
          rows: [
            ['Phản hồi STAT', '< 15 phút', '> 45 phút'],
            ['Chuỗi lạnh', '100%', '< 98%'],
            ['Hao hụt', '< 2%', '> 5%'],
            ['Ngày tồn kho', '7-10 ngày', '< 3 ngày']
          ]
        }}
      ]
    },
    MDM: {
      title: 'Nút 6: Cơ sở dữ liệu chính (MDM)',
      desc: 'Quản trị toàn cầu và cấu hình hệ thống. Quản lý mạng lưới và chính sách RBAC.',
      sections: [
        { type: 'text', subtitle: 'Bảng tính Quan hệ Excel và Cấu hình Hệ thống', content: 'MDM được tích hợp Bảng điều khiển Siêu cơ sở dữ liệu dạng bảng tính Excel an toàn, cho phép xem, chèn, cập nhật và xóa hồ sơ trong tất cả 17 bảng thuộc 4 nhóm quan hệ phụ thuộc (G1-G4).' },
        { type: 'list', subtitle: 'Công cụ Bảo vệ Toàn vẹn Ràng buộc dữ liệu', items: [
          'Khóa trùng PK: Ngăn chặn mã hàng trùng lặp (PrimaryKey Violation).',
          'Khóa ngoại FK: Từ chối lưu tham chiếu cha không tồn tại (ForeignKey Violation).',
          'Chặn xóa liên hoàn: Ngăn chặn xóa dòng cha khi có dữ liệu con đang phụ thuộc (Delete Restricted).',
          'Dịch tự động tiêu đề: Cột hiển thị ngôn ngữ động theo tiếng Anh, Trung và Việt.',
          'Tự động sinh mã ID: Sinh tự động tiền tố ID (ORD, DNR, QST...) tương thích cấu trúc bảng khi bấm chèn dòng mới.'
        ] },
        { type: 'alert', alertType: 'danger', subtitle: 'Cổng Quản trị Viên An toàn (Admin Gatekeeper)', content: 'Truy cập Bảng điều khiển Siêu cơ sở dữ liệu được bảo vệ nghiêm ngặt bằng quy trình kiểm tra đăng nhập trên nút Cyber phát sáng màu tím, đòi hỏi vai trò tài khoản phải là Admin.' }
      ]
    }
  }
};

