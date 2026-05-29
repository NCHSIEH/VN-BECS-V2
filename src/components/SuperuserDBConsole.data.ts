// Static schema, FK relationship and i18n data for SuperuserDBConsole.
// Extracted from the component file (pure data, no React) for maintainability.
// Definition of Table Schemas & Foreign Key Relationships
export interface SchemaField {
  name: string;
  label: string;
  label_keys?: Record<string, string>;
  isPk: boolean;
  fk?: { table: string; field: string };
  type: 'text' | 'number' | 'boolean';
}

export const TABLE_SCHEMAS: Record<string, SchemaField[]> = {
  // G1: Admin & IAM Group
  organizations: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '組織 ID (Org ID)', en: 'Organization ID', vi: 'Mã Tổ chức' }, isPk: true, type: 'text' },
    { name: 'name', label: '組織名稱 (Name)', label_keys: { 'zh-TW': '組織名稱 (Name)', en: 'Organization Name', vi: 'Tên Tổ chức' }, isPk: false, type: 'text' },
    { name: 'type', label: '組織類型 (Type)', label_keys: { 'zh-TW': '組織類型 (Type)', en: 'Org Type', vi: 'Loại Tổ chức' }, isPk: false, type: 'text' },
    { name: 'location', label: '地址/位置 (Location)', label_keys: { 'zh-TW': '地址/位置 (Location)', en: 'Location', vi: 'Địa điểm' }, isPk: false, type: 'text' },
    { name: 'createdAt', label: '建立時間 (Created At)', label_keys: { 'zh-TW': '建立時間 (Created At)', en: 'Created Time', vi: 'Thời gian Tạo' }, isPk: false, type: 'text' }
  ],
  users: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '使用者 ID (User ID)', en: 'User ID', vi: 'Mã Người dùng' }, isPk: true, type: 'text' },
    { name: 'username', label: '使用者名稱 (Username)', label_keys: { 'zh-TW': '使用者名稱 (Username)', en: 'Username', vi: 'Tài khoản' }, isPk: false, type: 'text' },
    { name: 'password', label: '密碼 (Password)', label_keys: { 'zh-TW': '密碼 (Password)', en: 'Password', vi: 'Mật khẩu' }, isPk: false, type: 'text' },
    { name: 'role', label: '角色 (Role)', label_keys: { 'zh-TW': '角色 (Role)', en: 'Role', vi: 'Vai trò' }, isPk: false, type: 'text' },
    { name: 'orgId', label: '組織ID (Org ID)', label_keys: { 'zh-TW': '組織ID (Org ID)', en: 'Org ID', vi: 'Mã Tổ chức' }, isPk: false, fk: { table: 'organizations', field: 'id' }, type: 'text' },
    { name: 'permitted_systems', label: '授權子系統 (Systems)', label_keys: { 'zh-TW': '授權子系統 (Systems)', en: 'Subsystems', vi: 'Phân hệ cho phép' }, isPk: false, type: 'text' },
    { name: 'isActive', label: '是否啟用 (Active)', label_keys: { 'zh-TW': '是否啟用 (Active)', en: 'Is Active', vi: 'Đang Hoạt động' }, isPk: false, type: 'number' },
    { name: 'createdAt', label: '建立時間 (Created At)', label_keys: { 'zh-TW': '建立時間 (Created At)', en: 'Created Time', vi: 'Thời gian Tạo' }, isPk: false, type: 'text' }
  ],
  resources: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '資源 ID (Res ID)', en: 'Resource ID', vi: 'Mã Tài nguyên' }, isPk: true, type: 'text' },
    { name: 'name', label: '資源名稱 (Name)', label_keys: { 'zh-TW': '資源名稱 (Name)', en: 'Resource Name', vi: 'Tên Tài nguyên' }, isPk: false, type: 'text' },
    { name: 'type', label: '類型 (Type)', label_keys: { 'zh-TW': '類型 (Type)', en: 'Category', vi: 'Thể loại' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'stockLevel', label: '庫存量 (Stock)', label_keys: { 'zh-TW': '庫存量 (Stock)', en: 'Stock Level', vi: 'Mức tồn kho' }, isPk: false, type: 'number' },
    { name: 'minStockLevel', label: '安全庫存 (Min)', label_keys: { 'zh-TW': '安全庫存 (Min)', en: 'Safe Stock', vi: 'Kho an toàn' }, isPk: false, type: 'number' },
    { name: 'orgId', label: '所屬組織 (Org ID)', label_keys: { 'zh-TW': '所屬組織 (Org ID)', en: 'Org ID', vi: 'Mã Tổ chức' }, isPk: false, fk: { table: 'organizations', field: 'id' }, type: 'text' }
  ],
  rare_donors: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '稀有捐血者 ID (Rare ID)', en: 'Rare Donor ID', vi: 'Mã Người hiến hiếm' }, isPk: true, type: 'text' },
    { name: 'name', label: '捐血者姓名 (Name)', label_keys: { 'zh-TW': '捐血者姓名 (Name)', en: 'Full Name', vi: 'Họ và Tên' }, isPk: false, type: 'text' },
    { name: 'nationalId', label: '身分證字號 (National ID)', label_keys: { 'zh-TW': '身分證字號 (National ID)', en: 'National ID', vi: 'CCCD' }, isPk: false, type: 'text' },
    { name: 'bloodType', label: '血型 (Blood Type)', label_keys: { 'zh-TW': '血型 (Blood Type)', en: 'Blood Type', vi: 'Nhóm máu' }, isPk: false, type: 'text' },
    { name: 'rhd', label: 'RhD', label_keys: { 'zh-TW': 'RhD', en: 'RhD Factor', vi: 'Yếu tố RhD' }, isPk: false, type: 'text' },
    { name: 'phenotype', label: '稀有表現型 (Phenotype)', label_keys: { 'zh-TW': '稀有表現型 (Phenotype)', en: 'Phenotype Profile', vi: 'Kiểu hình hiếm' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'orgId', label: '管理組織 (Org ID)', label_keys: { 'zh-TW': '管理組織 (Org ID)', en: 'Org ID', vi: 'Mã Tổ chức' }, isPk: false, fk: { table: 'organizations', field: 'id' }, type: 'text' }
  ],

  // G2: Donation & LIMS Lifecycle
  donors: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '捐血者 ID (Donor ID)', en: 'Donor ID', vi: 'Mã Người hiến' }, isPk: true, type: 'text' },
    { name: 'name', label: '捐血者姓名 (Name)', label_keys: { 'zh-TW': '捐血者姓名 (Name)', en: 'Full Name', vi: 'Họ và Tên' }, isPk: false, type: 'text' },
    { name: 'nationalId', label: '身分證字號 (National ID)', label_keys: { 'zh-TW': '身分證字號 (National ID)', en: 'National ID', vi: 'CCCD' }, isPk: false, type: 'text' },
    { name: 'bloodType', label: '血型 (Blood Type)', label_keys: { 'zh-TW': '血型 (Blood Type)', en: 'Blood Type', vi: 'Nhóm máu' }, isPk: false, type: 'text' },
    { name: 'rhd', label: 'RhD', label_keys: { 'zh-TW': 'RhD', en: 'RhD Factor', vi: 'Yếu tố RhD' }, isPk: false, type: 'text' },
    { name: 'registeredAt', label: '註冊時間 (Registered At)', label_keys: { 'zh-TW': '註冊時間 (Registered At)', en: 'Registered Time', vi: 'Thời gian Đăng ký' }, isPk: false, type: 'text' }
  ],
  questionnaires: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '問卷 ID (Quest ID)', en: 'Questionnaire ID', vi: 'Mã Bảng hỏi' }, isPk: true, type: 'text' },
    { name: 'donorId', label: '捐血者ID (Donor ID)', label_keys: { 'zh-TW': '捐血者ID (Donor ID)', en: 'Donor ID', vi: 'Mã Người hiến' }, isPk: false, fk: { table: 'donors', field: 'id' }, type: 'text' },
    { name: 'isPassed', label: '是否通過 (Passed)', label_keys: { 'zh-TW': '是否通過 (Passed)', en: 'Passed', vi: 'Đạt yêu cầu' }, isPk: false, type: 'number' },
    { name: 'createdAt', label: '填寫時間 (Created At)', label_keys: { 'zh-TW': '填寫時間 (Created At)', en: 'Filled At', vi: 'Thời gian Điền' }, isPk: false, type: 'text' },
    { name: 'deferralReason', label: '延緩原因 (Deferral Reason)', label_keys: { 'zh-TW': '延緩原因 (Deferral Reason)', en: 'Reason', vi: 'Lý do Hoãn' }, isPk: false, type: 'text' },
    { name: 'deferralUntil', label: '延緩期限 (Deferral Until)', label_keys: { 'zh-TW': '延緩期限 (Deferral Until)', en: 'Until', vi: 'Hoãn đến' }, isPk: false, type: 'text' },
    { name: 'answersJson', label: '問卷JSON (Answers JSON)', label_keys: { 'zh-TW': '問卷 JSON (Answers JSON)', en: 'Answers JSON', vi: 'JSON Câu trả lời' }, isPk: false, type: 'text' }
  ],
  donations: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '採血袋 ID (Donation ID)', en: 'Donation ID', vi: 'Mã Túi máu' }, isPk: true, type: 'text' },
    { name: 'donorId', label: '捐血者ID (Donor ID)', label_keys: { 'zh-TW': '捐血者ID (Donor ID)', en: 'Donor ID', vi: 'Mã Người hiến' }, isPk: false, fk: { table: 'donors', field: 'id' }, type: 'text' },
    { name: 'questionnaireId', label: '問卷ID (Quest ID)', label_keys: { 'zh-TW': '問卷ID (Quest ID)', en: 'Questionnaire ID', vi: 'Mã Bảng hỏi' }, isPk: false, fk: { table: 'questionnaires', field: 'id' }, type: 'text' },
    { name: 'collectedAt', label: '採集時間 (Collected At)', label_keys: { 'zh-TW': '採集時間 (Collected At)', en: 'Collected Time', vi: 'Thời gian Thu hoạch' }, isPk: false, type: 'text' },
    { name: 'volume', label: '採集血量 (Volume)', label_keys: { 'zh-TW': '採集血量 (Volume)', en: 'Volume (ml)', vi: 'Thể tích (ml)' }, isPk: false, type: 'number' },
    { name: 'donationType', label: '捐血類別 (Type)', label_keys: { 'zh-TW': '捐血類別 (Type)', en: 'Donation Type', vi: 'Thể loại hiến' }, isPk: false, type: 'text' }
  ],
  lab_tests: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '檢驗 ID (Test ID)', en: 'Lab Test ID', vi: 'Mã Xét nghiệm' }, isPk: true, type: 'text' },
    { name: 'donationId', label: '血袋ID (Donation ID)', label_keys: { 'zh-TW': '血袋ID (Donation ID)', en: 'Donation ID', vi: 'Mã Túi máu' }, isPk: false, fk: { table: 'donations', field: 'id' }, type: 'text' },
    { name: 'abo', label: 'ABO 血型', label_keys: { 'zh-TW': 'ABO 血型', en: 'ABO Type', vi: 'Nhóm máu ABO' }, isPk: false, type: 'text' },
    { name: 'rhd', label: 'RhD 血型', label_keys: { 'zh-TW': 'RhD 血型', en: 'RhD Factor', vi: 'Yếu tố RhD' }, isPk: false, type: 'text' },
    { name: 'idmStatus', label: '傳染病篩檢 (IDM)', label_keys: { 'zh-TW': '傳染病篩檢 (IDM)', en: 'IDM Status', vi: 'Xét nghiệm IDM' }, isPk: false, type: 'text' },
    { name: 'testedAt', label: '篩檢時間 (Tested At)', label_keys: { 'zh-TW': '篩檢時間 (Tested At)', en: 'Tested Time', vi: 'Thời gian Xét nghiệm' }, isPk: false, type: 'text' }
  ],
  components: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '分血袋 ID (Component ID)', en: 'Component ID', vi: 'Mã Thành phần' }, isPk: true, type: 'text' },
    { name: 'donationId', label: '來源血袋 (Donation ID)', label_keys: { 'zh-TW': '來源血袋 (Donation ID)', en: 'Donation ID', vi: 'Mã Túi máu nguồn' }, isPk: false, fk: { table: 'donations', field: 'id' }, type: 'text' },
    { name: 'productCode', label: '產品代碼 (Product Code)', label_keys: { 'zh-TW': '產品代碼 (Product Code)', en: 'Product Code', vi: 'Mã Sản phẩm' }, isPk: false, type: 'text' },
    { name: 'type', label: '成分類別 (Type)', label_keys: { 'zh-TW': '成分類別 (Type)', en: 'Component Type', vi: 'Thể loại thành phần' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'expiryDate', label: '效期 (Expiry Date)', label_keys: { 'zh-TW': '效期 (Expiry Date)', en: 'Expiry Date', vi: 'Hạn sử dụng' }, isPk: false, type: 'text' }
  ],

  // G3: Hospital & Clinical Care Group
  patients: [
    { name: 'id', label: 'MRN ID', label_keys: { 'zh-TW': '病患 ID (Patient ID)', en: 'Patient ID', vi: 'Mã Bệnh nhân' }, isPk: true, type: 'text' },
    { name: 'mrn', label: '病歷號 (MRN)', label_keys: { 'zh-TW': '病歷號 (MRN)', en: 'MRN Number', vi: 'Mã hồ sơ bệnh án' }, isPk: false, type: 'text' },
    { name: 'name', label: '姓名 (Name)', label_keys: { 'zh-TW': '姓名 (Name)', en: 'Full Name', vi: 'Họ và Tên' }, isPk: false, type: 'text' },
    { name: 'abo', label: 'ABO 血型', label_keys: { 'zh-TW': 'ABO 血型', en: 'ABO Type', vi: 'Nhóm máu ABO' }, isPk: false, type: 'text' },
    { name: 'rhd', label: 'RhD 血型', label_keys: { 'zh-TW': 'RhD 血型', en: 'RhD Factor', vi: 'Yếu tố RhD' }, isPk: false, type: 'text' },
    { name: 'hospitalId', label: '醫院代碼 (Hospital ID)', label_keys: { 'zh-TW': '醫院代碼 (Hospital ID)', en: 'Hospital ID', vi: 'Mã Bệnh viện' }, isPk: false, type: 'text' },
    { name: 'hasAntibody', label: '抗體篩檢 (Antibody)', label_keys: { 'zh-TW': '抗體篩檢 (Antibody)', en: 'Antibody Screen', vi: 'Sàng lọc Kháng thể' }, isPk: false, type: 'boolean' }
  ],
  orders: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '申請單 ID (Order ID)', en: 'Order ID', vi: 'Mã Đơn hàng' }, isPk: true, type: 'text' },
    { name: 'hospital', label: '申請醫院 (Hospital)', label_keys: { 'zh-TW': '申請醫院 (Hospital)', en: 'Hospital Name', vi: 'Bệnh viện Yêu cầu' }, isPk: false, type: 'text' },
    { name: 'priority', label: '緊急程度 (Priority)', label_keys: { 'zh-TW': '緊急程度 (Priority)', en: 'Priority', vi: 'Mức độ Khẩn' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'patientId', label: '病人ID (Patient ID)', label_keys: { 'zh-TW': '病人ID (Patient ID)', en: 'Patient ID', vi: 'Mã Bệnh nhân' }, isPk: false, fk: { table: 'patients', field: 'id' }, type: 'text' },
    { name: 'submittedAt', label: '送出時間 (Submitted At)', label_keys: { 'zh-TW': '送出時間 (Submitted At)', en: 'Submitted Time', vi: 'Thời gian Gửi' }, isPk: false, type: 'text' }
  ],
  crossmatch: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '配血 ID (XM ID)', en: 'Crossmatch ID', vi: 'Mã Phản ứng chéo' }, isPk: true, type: 'text' },
    { name: 'componentId', label: '血袋 ID (Component ID)', label_keys: { 'zh-TW': '血袋 ID (Component ID)', en: 'Component ID', vi: 'Mã Túi máu' }, isPk: false, type: 'text' },
    { name: 'patientId', label: '病人 ID (Patient ID)', label_keys: { 'zh-TW': '病人 ID (Patient ID)', en: 'Patient ID', vi: 'Mã Bệnh nhân' }, isPk: false, fk: { table: 'patients', field: 'id' }, type: 'text' },
    { name: 'method', label: '配血方式 (Method)', label_keys: { 'zh-TW': '配血方式 (Method)', en: 'Crossmatch Method', vi: 'Phương pháp chéo' }, isPk: false, type: 'text' },
    { name: 'result', label: '配血結果 (Result)', label_keys: { 'zh-TW': '配血結果 (Result)', en: 'Crossmatch Result', vi: 'Kết quả chéo' }, isPk: false, type: 'text' }
  ],
  transfusions: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '輸血 ID (TF ID)', en: 'Transfusion ID', vi: 'Mã Truyền máu' }, isPk: true, type: 'text' },
    { name: 'componentId', label: '成分ID (Component ID)', label_keys: { 'zh-TW': '成分ID (Component ID)', en: 'Component ID', vi: 'Mã Túi máu' }, isPk: false, type: 'text' },
    { name: 'patientId', label: '病人ID (Patient ID)', label_keys: { 'zh-TW': '病人ID (Patient ID)', en: 'Patient ID', vi: 'Mã Bệnh nhân' }, isPk: false, fk: { table: 'patients', field: 'id' }, type: 'text' },
    { name: 'verifier1', label: '第一核對人 (Verifier 1)', label_keys: { 'zh-TW': '第一核對人 (Verifier 1)', en: 'Nurse Verifier 1', vi: 'Người xác minh 1' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'startedAt', label: '開始時間 (Started At)', label_keys: { 'zh-TW': '開始時間 (Started At)', en: 'Started Time', vi: 'Thời gian Bắt đầu' }, isPk: false, type: 'text' }
  ],
  adverse_reactions: [
    { name: 'id', label: 'ID', label_keys: { 'zh-TW': '不良反應 ID (AR ID)', en: 'Adverse Reaction ID', vi: 'Mã Phản ứng phụ' }, isPk: true, type: 'text' },
    { name: 'transfusionId', label: '輸血 ID (TF ID)', label_keys: { 'zh-TW': '輸血 ID (TF ID)', en: 'Transfusion ID', vi: 'Mã Truyền máu' }, isPk: false, fk: { table: 'transfusions', field: 'id' }, type: 'text' },
    { name: 'patientId', label: '病人ID (Patient ID)', label_keys: { 'zh-TW': '病人ID (Patient ID)', en: 'Patient ID', vi: 'Mã Bệnh nhân' }, isPk: false, fk: { table: 'patients', field: 'id' }, type: 'text' },
    { name: 'reactionType', label: '反應類型 (Type)', label_keys: { 'zh-TW': '反應類型 (Type)', en: 'Reaction Type', vi: 'Loại phản ứng' }, isPk: false, type: 'text' },
    { name: 'severity', label: '嚴重度 (Severity)', label_keys: { 'zh-TW': '嚴重度 (Severity)', en: 'Severity Level', vi: 'Mức độ nghiêm trọng' }, isPk: false, type: 'text' },
    { name: 'description', label: '症狀描述 (Description)', label_keys: { 'zh-TW': '症狀描述 (Description)', en: 'Symptoms Description', vi: 'Mô tả triệu chứng' }, isPk: false, type: 'text' },
    { name: 'actionsTaken', label: '採取措施 (Actions)', label_keys: { 'zh-TW': '採取措施 (Actions)', en: 'Actions Taken', vi: 'Biện pháp đã xử lý' }, isPk: false, type: 'text' },
    { name: 'reportedBy', label: '申報人 (Reported By)', label_keys: { 'zh-TW': '申報人 (Reported By)', en: 'Reported By', vi: 'Người báo cáo' }, isPk: false, type: 'text' },
    { name: 'reportedAt', label: '申報時間 (Reported At)', label_keys: { 'zh-TW': '申報時間 (Reported At)', en: 'Reported Time', vi: 'Thời gian Báo cáo' }, isPk: false, type: 'text' }
  ],

  // G4: Supply Chain & Logistics
  product_catalog: [
    { name: 'productCode', label: '產品代碼 (Code)', label_keys: { 'zh-TW': '產品代碼 (Code)', en: 'Product Code', vi: 'Mã Sản phẩm' }, isPk: true, type: 'text' },
    { name: 'alias', label: '中文别名 (Alias)', label_keys: { 'zh-TW': '別名 (Alias)', en: 'Product Name', vi: 'Tên Sản phẩm' }, isPk: false, type: 'text' },
    { name: 'componentClass', label: '成分大類 (Class)', label_keys: { 'zh-TW': '成分大類 (Class)', en: 'Product Class', vi: 'Phân lớp' }, isPk: false, type: 'text' },
    { name: 'aboRequired', label: 'ABO需求 (ABO Req)', label_keys: { 'zh-TW': 'ABO 需求 (ABO Req)', en: 'ABO Required', vi: 'Yêu cầu ABO' }, isPk: false, type: 'number' },
    { name: 'rhdRequired', label: 'RhD需求 (RhD Req)', label_keys: { 'zh-TW': 'RhD 需求 (RhD Req)', en: 'RhD Required', vi: 'Yêu cầu RhD' }, isPk: false, type: 'number' }
  ],
  inventory: [
    { name: 'unitId', label: '血袋條碼 (Unit ID)', label_keys: { 'zh-TW': '血袋條碼 (Unit ID)', en: 'Unit Barcode', vi: 'Mã vạch Túi máu' }, isPk: true, type: 'text' },
    { name: 'productCode', label: '品項代碼 (Product Code)', label_keys: { 'zh-TW': '品項代碼 (Product Code)', en: 'Product Code', vi: 'Mã Sản phẩm' }, isPk: false, fk: { table: 'product_catalog', field: 'productCode' }, type: 'text' },
    { name: 'abo', label: 'ABO 血型', label_keys: { 'zh-TW': 'ABO 血型', en: 'ABO Type', vi: 'Nhóm máu ABO' }, isPk: false, type: 'text' },
    { name: 'rhd', label: 'RhD', label_keys: { 'zh-TW': 'RhD', en: 'RhD Factor', vi: 'Yếu tố RhD' }, isPk: false, type: 'text' },
    { name: 'expiryDate', label: '效期 (Expiry Date)', label_keys: { 'zh-TW': '效期 (Expiry Date)', en: 'Expiry Date', vi: 'Hạn sử dụng' }, isPk: false, type: 'text' },
    { name: 'status', label: '狀態 (Status)', label_keys: { 'zh-TW': '狀態 (Status)', en: 'Status', vi: 'Trạng thái' }, isPk: false, type: 'text' },
    { name: 'location', label: '存放地點 (Location)', label_keys: { 'zh-TW': '存放地點 (Location)', en: 'Storage Location', vi: 'Vị trí lưu kho' }, isPk: false, type: 'text' }
  ],
  transport_jobs: [
    { name: 'orderId', label: '訂單ID (Order ID)', label_keys: { 'zh-TW': '訂單 ID (Order ID)', en: 'Order ID', vi: 'Mã Đơn hàng' }, isPk: true, fk: { table: 'orders', field: 'id' }, type: 'text' },
    { name: 'sensorId', label: '感測器 ID (Sensor ID)', label_keys: { 'zh-TW': '感測器 ID (Sensor ID)', en: 'IoT Sensor ID', vi: 'Mã Cảm biến IoT' }, isPk: false, type: 'text' },
    { name: 'coldChainViolation', label: '冷鏈中斷 (Violation)', label_keys: { 'zh-TW': '冷鏈中斷 (Violation)', en: 'Cold Chain Violation', vi: 'Vi phạm Dây chuyền lạnh' }, isPk: false, type: 'number' },
    { name: 'updatedAt', label: '更新時間 (Updated At)', label_keys: { 'zh-TW': '更新時間 (Updated At)', en: 'Last Updated', vi: 'Cập nhật cuối' }, isPk: false, type: 'text' }
  ]
};

// Local Translation dictionary for self-contained translation support
export const LOCAL_T: Record<string, Record<string, string>> = {
  'zh-TW': {
    console_title: "超級使用者關聯試算表系統",
    console_sub: "高完整性關聯式試算表資料庫控制台",
    admin_terminal: "最高權限終端",
    sync_ok: "資料庫連線同步",
    sync_saving: "儲存變更中...",
    sync_err: "同步異常/衝突",
    btn_grid: "Excel 編輯試算表",
    btn_schema: "📊 關聯架構圖",
    btn_add_row: "插入新列",
    btn_delete_row: "刪除所選列",
    bar_coord: "選取格",
    bar_placeholder: "請在此編輯所選儲存格之內容，按下 [Enter] 即可生效...",
    bar_no_select: "請在下方試算表中選取任意儲存格以開始編輯...",
    bar_pk_blocked: "⚠️ Primary Key 主鍵禁止在現有資料列中修改",
    tbl_active: "目前選取資料表 (ACTIVE TABLES):",
    watermark: "🛡️ 軍規關聯式防護體系啟用中",
    sec_terminal: "SECURE TERMINAL",
    auth_title: "VN-BECS 關聯資料終端",
    auth_sub: "Superuser Database Spreadsheet console",
    auth_user: "系統管理員帳號 (Username)",
    auth_pass: "安全密碼 (Password)",
    auth_btn_back: "返回 MDM",
    auth_btn_submit: "驗證並解鎖",
    auth_err: "驗證失敗，請檢查使用者名稱與密碼，且該帳號在系統中必須擁有 Admin 最高行政權限！",
    auth_input_user: "請輸入擁有 Admin 權限的角色帳號",
    auth_input_pass: "請輸入該帳號的安全登入密碼",
    schema_title: "全系統 4 大相依關聯群組拓樸圖 (System Dependency Topology)",
    schema_sub: "以下呈現 VN-BECS-V2 資料庫的核心主從相依性。游標移動到資料表卡片上以凸顯其主鍵/外鍵參照線路。",
    schema_legend: "軍規級關聯限制防禦核心機制 (Referential Integrity Blockers)",
    schema_legend_sub: "本系統之後端 RESTful 框架已全面與上述相依拓樸整合。當您在編輯資料時，防禦機制將自動啟動：",
    schema_rule1: "1. 主鍵重複阻擋 (PK Violation)",
    schema_rule1_desc: "當新增資料或直接變更現有 ID 為已存在的 ID 時，系統將當場阻擋，維護資料實體唯一性。",
    schema_rule2: "2. 孤兒外鍵防阻 (FK Missing Check)",
    schema_rule2_desc: "例如當您修改 Users 的組織編號 (orgId) 為 'ORG-INVALID'，系統將偵測 Organizations 表中查無此編號並強力拒絕存取。",
    schema_rule3: "3. 連鎖刪除限制 (Restrict Delete Cascade)",
    schema_rule3_desc: "若您欲刪除某個 Organization 組織，而系統內仍有 User 的 orgId 參照它時，刪除動作會被完全阻擋，嚴禁產生 dangling references 孤兒記錄。",
    footer_tbl: "資料表",
    footer_rows: "總列數",
    footer_pk: "主鍵欄位",
    footer_active: "EXCEL 關聯式試算表運作中",
    err_pk_title: "🚫 主鍵修改受限 (Primary Key Modification Blocked)",
    err_pk_desc: "關聯式資料庫中不允許直接修改已有資料列的 Primary Key 主鍵值。這會破壞現有外鍵關聯鏈！",
    err_pk_tip1: "若需要更改主鍵：請先刪除該列，並新增一列包含新主鍵的資料。",
    err_pk_tip2: "或者請檢查是否有其他附屬子表正在參照此主鍵。",
    err_select_title: "💡 操作提示",
    err_select_desc: "請先在試算表中選取您想要刪除的整列資料（點選該列的任何儲存格），然後再點選刪除按鈕！",
    err_db_op: "🚨 資料庫操作錯誤 (Database Operation Failed)",
    err_restrict_delete: "⚠️ 關聯刪除限制阻擋 (Cascading Delete Restricted)",
    err_invalid_fk: "❌ 外鍵關聯失效 (Foreign Key Reference Invalid)",
    err_duplicate_pk: "🚫 主鍵衝突阻擋 (Primary Key Uniqueness Violated)",
    dialog_return: "我知道了，返回修改",
    tbl_empty_title: "此資料表目前尚無任何資料",
    tbl_empty_desc: "請點選上方「插入新列」按鈕，為該表新增首筆測試資料列。"
  },
  en: {
    console_title: "Superuser Relational Spreadsheet DB System",
    console_sub: "High-Integrity Relational Spreadsheet Database Controller",
    admin_terminal: "Admin Terminal",
    sync_ok: "Connection Synced",
    sync_saving: "Saving changes...",
    sync_err: "Sync Error/Conflict",
    btn_grid: "Excel Edit Grid",
    btn_schema: "📊 Relation Graph",
    btn_add_row: "Insert Row",
    btn_delete_row: "Delete Selected",
    bar_coord: "Cell",
    bar_placeholder: "Edit cell value here and press [Enter] to commit...",
    bar_no_select: "Select any cell in the spreadsheet below to start editing...",
    bar_pk_blocked: "⚠️ Primary Key cannot be modified in existing rows",
    tbl_active: "ACTIVE TABLES:",
    watermark: "🛡️ MIL-SPEC RELATIONAL INTEGRITY ACTIVE",
    sec_terminal: "SECURE TERMINAL",
    auth_title: "VN-BECS Relational DB Terminal",
    auth_sub: "Superuser Database Spreadsheet Console",
    auth_user: "Admin Username",
    auth_pass: "Security Password",
    auth_btn_back: "Return to MDM",
    auth_btn_submit: "Verify & Unlock",
    auth_err: "Verification failed. Check credentials, and ensure the account possesses the highest Admin role!",
    auth_input_user: "Enter username with Admin role",
    auth_input_pass: "Enter security password",
    schema_title: "System 4-Group Dependency Topology",
    schema_sub: "Displays key parent-child dependencies in the database. Hover over cards to highlight relation pathways.",
    schema_legend: "Referential Integrity Defense Mechanics",
    schema_legend_sub: "The backend RESTful framework enforces constraints automatically on all data mutations:",
    schema_rule1: "1. PK Uniqueness (PK Violation)",
    schema_rule1_desc: "Prevents inserting duplicate keys or changing keys to existing values, maintaining entity integrity.",
    schema_rule2: "2. Orphan Check (FK Missing Check)",
    schema_rule2_desc: "Fails mutations if a foreign key value (e.g. orgId in Users) is missing from the parent table (Organizations).",
    schema_rule3: "3. Cascading Restrict (Restrict Delete Cascade)",
    schema_rule3_desc: "Blocks deleting a parent record (e.g. Organization) if child records (Users) reference it, avoiding dangling references.",
    footer_tbl: "Table",
    footer_rows: "Total Rows",
    footer_pk: "Primary Key",
    footer_active: "EXCEL RELATIONAL SPREADSHEET ACTIVE",
    err_pk_title: "🚫 Primary Key Modification Blocked",
    err_pk_desc: "Direct modification of a primary key on an existing row is strictly prohibited. It breaks cascading relationships!",
    err_pk_tip1: "To change a key: Delete this row, then insert a new row containing the new key.",
    err_pk_tip2: "Or check if dependent child tables are referencing this key.",
    err_select_title: "💡 Operator Hint",
    err_select_desc: "Select a cell in the row you wish to delete from the spreadsheet first, then click Delete!",
    err_db_op: "🚨 Database Operation Failed",
    err_restrict_delete: "⚠️ Cascading Delete Restricted",
    err_invalid_fk: "❌ Foreign Key Reference Invalid",
    err_duplicate_pk: "🚫 Primary Key Uniqueness Violated",
    dialog_return: "Understood, Return to Edit",
    tbl_empty_title: "This table is currently empty",
    tbl_empty_desc: "Click 'Insert Row' above to create the first test row in this table."
  },
  vi: {
    console_title: "Hệ thống Bảng tính Cơ sở Dữ liệu Quan hệ Siêu cấp",
    console_sub: "Bảng điều khiển cơ sở dữ liệu quan hệ bảng tính toàn vẹn cao",
    admin_terminal: "Cổng Quản trị",
    sync_ok: "Đồng bộ Kết nối",
    sync_saving: "Đang lưu thay đổi...",
    sync_err: "Lỗi Đồng bộ/Xung đột",
    btn_grid: "Lưới chỉnh sửa Excel",
    btn_schema: "📊 Biểu đồ Quan hệ",
    btn_add_row: "Chèn dòng",
    btn_delete_row: "Xóa dòng chọn",
    bar_coord: "Ô",
    bar_placeholder: "Chỉnh sửa giá trị ô tại đây và nhấn [Enter] để áp dụng...",
    bar_no_select: "Chọn bất kỳ ô nào trong bảng tính bên dưới để bắt đầu chỉnh sửa...",
    bar_pk_blocked: "⚠️ Không thể thay đổi Khóa chính (PK) của hàng hiện có",
    tbl_active: "BẢNG ĐANG HOẠT ĐỘNG:",
    watermark: "🛡️ KHUNG TOÀN VẸN QUAN HỆ BẢO MẬT HOẠT ĐỘNG",
    sec_terminal: "CỔNG BẢO MẬT",
    auth_title: "Cổng dữ liệu quan hệ VN-BECS",
    auth_sub: "Superuser Database Spreadsheet Console",
    auth_user: "Tài khoản Quản trị",
    auth_pass: "Mật khẩu Bảo mật",
    auth_btn_back: "Quay lại MDM",
    auth_btn_submit: "Xác minh & Mở khóa",
    auth_err: "Xác minh thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu, tài khoản phải có vai trò Admin cao nhất!",
    auth_input_user: "Nhập tài khoản có quyền Admin",
    auth_input_pass: "Nhập mật khẩu bảo mật",
    schema_title: "Bản đồ liên kết cấu trúc dữ liệu 4 nhóm lớn",
    schema_sub: "Trình bày cấu trúc phụ thuộc cha-con trong cơ sở dữ liệu. Di chuột qua thẻ để xem đường liên kết.",
    schema_legend: "Cơ chế bảo vệ tính toàn vẹn tham chiếu dữ liệu",
    schema_legend_sub: "Khung phụ trợ RESTful tự động thực thi các ràng buộc trên tất cả các thay đổi dữ liệu:",
    schema_rule1: "1. Tính duy nhất Khóa chính (Lỗi PK)",
    schema_rule1_desc: "Ngăn chặn chèn các khóa trùng lặp hoặc thay đổi khóa thành các giá trị hiện có để duy trì tính toàn vẹn.",
    schema_rule2: "2. Kiểm tra khóa ngoại (Lỗi FK)",
    schema_rule2_desc: "Từ chối thay đổi nếu khóa ngoại (ví dụ: orgId trong Users) không tồn tại ở bảng cha (Organizations).",
    schema_rule3: "3. Hạn chế xóa hàng loạt (Ngăn chặn xóa liên hoàn)",
    schema_rule3_desc: "Chặn xóa bản ghi cha (ví dụ: Tổ chức) nếu có bản ghi con (Users) đang tham chiếu đến nó.",
    footer_tbl: "Bảng",
    footer_rows: "Tổng số hàng",
    footer_pk: "Khóa chính",
    footer_active: "BẢNG TÍNH QUAN HỆ EXCEL ĐANG HOẠT ĐỘNG",
    err_pk_title: "🚫 Thay đổi Khóa chính bị chặn",
    err_pk_desc: "Nghiêm cấm thay đổi trực tiếp khóa chính của một hàng hiện có. Nó sẽ phá vỡ liên kết cấu trúc!",
    err_pk_tip1: "Cách đổi khóa chính: Xóa hàng này, sau đó chèn một hàng mới có chứa khóa mới.",
    err_pk_tip2: "Hoặc kiểm tra xem các bảng con phụ thuộc có đang tham chiếu khóa này không.",
    err_select_title: "💡 Gợi ý Người vận hành",
    err_select_desc: "Chọn một ô trong dòng bạn muốn xóa từ bảng tính trước, sau đó nhấp vào Xóa!",
    err_db_op: "🚨 Lỗi Hoạt động Cơ sở Dữ liệu",
    err_restrict_delete: "⚠️ Ngăn chặn xóa liên hoàn do ràng buộc",
    err_invalid_fk: "❌ Khóa ngoại Tham chiếu không hợp lệ",
    err_duplicate_pk: "🚫 Khóa chính Bị trùng lặp",
    dialog_return: "Đã hiểu, Quay lại Chỉnh sửa",
    tbl_empty_title: "Bảng này hiện đang trống",
    tbl_empty_desc: "Nhấp vào 'Chèn dòng' phía trên để tạo hàng kiểm tra đầu tiên."
  }
};

export const RELATION_GROUPS = [
  {
    id: 'G1',
    name_keys: { 'zh-TW': '系統行政與權限群組 (Admin & IAM)', en: 'Admin & IAM Group', vi: 'Nhóm Quản trị & IAM' },
    tables: ['organizations', 'users', 'resources', 'rare_donors'],
    color: 'from-violet-500/20 to-indigo-500/20 border-indigo-500/40 text-indigo-400',
    description_keys: {
      'zh-TW': '此群組以「組織 (organizations)」為核心關聯主表。使用者、資源以及稀有捐血者均相依於特定組織代碼。',
      en: 'This group anchors around the Organization. Users, resources, and rare donors depend on it.',
      vi: 'Nhóm này xoay quanh Tổ chức. Người dùng, tài nguyên và người hiến máu hiếm phụ thuộc vào nó.'
    }
  },
  {
    id: 'G2',
    name_keys: { 'zh-TW': '捐血生命週期與 LIMS 群組 (Donation & LIMS)', en: 'Donation & LIMS Lifecycle', vi: 'Nhóm Hiến máu & LIMS' },
    tables: ['donors', 'questionnaires', 'donations', 'lab_tests', 'components'],
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-400',
    description_keys: {
      'zh-TW': '此群組為採血與檢驗的核心流程，具有鏈狀相依關係：捐血人 ➔ 健康問卷 ➔ 捐血記錄 ➔ 檢驗結果 & 製成分血成分袋。',
      en: 'Primary phlebotomy chain: Donor ➔ Health Questionnaire ➔ Donation Record ➔ Lab Test & Components.',
      vi: 'Chuỗi phlebotomy chính: Người hiến ➔ Bảng hỏi sức khỏe ➔ Hồ sơ hiến máu ➔ Xét nghiệm & Thành phần.'
    }
  },
  {
    id: 'G3',
    name_keys: { 'zh-TW': '臨床輸血與病人照護群組 (Clinical & Patient)', en: 'Clinical & Patient Care', vi: 'Nhóm Lâm sàng & Bệnh nhân' },
    tables: ['patients', 'orders', 'crossmatch', 'transfusions', 'adverse_reactions'],
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400',
    description_keys: {
      'zh-TW': '此群組以「病患 (patients)」為核心關聯主表，管理輸血申請單、交叉配血、床邊核對輸血及輸血後不良反應申報。',
      en: ' anchors on Patient MRN, managing orders, crossmatch assays, bedside transfusions, and hemovigilance.',
      vi: 'Định vị vào MRN bệnh nhân, quản lý đơn hàng, xét nghiệm chéo, truyền máu tại giường và phản ứng.'
    }
  },
  {
    id: 'G4',
    name_keys: { 'zh-TW': '供應鏈與物流群組 (Supply Chain & Logistics)', en: 'Supply Chain & Logistics', vi: 'Nhóm Hậu cần & Chuỗi cung ứng' },
    tables: ['product_catalog', 'inventory', 'transport_jobs'],
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-400',
    description_keys: {
      'zh-TW': '管理庫存血品與運送冷鏈監控。其中血品庫存相依於產品目錄，運送任務相依於臨床申請單。',
      en: 'Manages blood inventories and cold-chain transportation tracking. Inventory links to catalog.',
      vi: 'Quản lý kho máu và theo dõi vận chuyển dây chuyền lạnh. Liên kết kiểm kho với danh mục.'
    }
  }
];
