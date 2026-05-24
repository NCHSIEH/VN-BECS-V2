import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Network, AlertTriangle, Play, Check, Search, Sparkles, 
  RefreshCw, Lock, Unlock, X, Grid, FileSpreadsheet, Plus, Trash2, 
  ArrowLeft, CheckCircle, HelpCircle, Save, ChevronRight, Info
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// Definition of Table Schemas & Foreign Key Relationships
interface SchemaField {
  name: string;
  label: string;
  label_keys?: Record<string, string>;
  isPk: boolean;
  fk?: { table: string; field: string };
  type: 'text' | 'number' | 'boolean';
}

const TABLE_SCHEMAS: Record<string, SchemaField[]> = {
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
const LOCAL_T: Record<string, Record<string, string>> = {
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

const RELATION_GROUPS = [
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

export function SuperuserDBConsole({ onBack }: { onBack: () => void }) {
  const { lang } = useI18n();
  const currentLang = (lang === 'zh-TW' || lang === 'en' || lang === 'vi') ? lang : 'zh-TW';
  const lt = LOCAL_T[currentLang];

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Tab & Table Selection states
  const [activeGroupId, setActiveGroupId] = useState('G1');
  const [activeTable, setActiveTable] = useState('organizations');
  const [currentView, setCurrentView] = useState<'grid' | 'schema'>('grid');

  // Database State
  const [dbData, setDbData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('SYNCHRONIZED'); // SYNCHRONIZED, SAVING, ERROR

  // Cell Selection states (Excel-style)
  const [selectedCell, setSelectedCell] = useState<{ row: number; colName: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; colName: string } | null>(null);
  const [formulaValue, setFormulaValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Relational Validation Error overlays
  const [validationError, setValidationError] = useState<{
    type: 'PK_VIOLATION' | 'FK_VIOLATION' | 'DELETE_RESTRICTED' | 'GENERIC';
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  // Interactive Schema Designer state
  const [hoveredSchemaTable, setHoveredSchemaTable] = useState<string | null>(null);

  // Fetch full dataset
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/mdm/relational');
      const json = await response.json();
      if (json.success) {
        setDbData(json.data);
      } else {
        console.error("Fetch DB error:", json.error);
      }
    } catch (e) {
      console.error("Connection failure fetching relational data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const response = await fetch('/api/v1/mdm/relational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auth',
          username: authUsername,
          password: authPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        // Record login audit event
        await fetch('/api/v1/audit-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorRole: 'Admin',
            eventType: 'SUPERUSER_LOGIN',
            objectId: data.user.id,
            details: `Superuser logged in successfully: ${data.user.username} (Role: ${data.user.role})`
          })
        }).catch(() => {});
      } else {
        setAuthError(data.error || lt.auth_err);
      }
    } catch (err) {
      setAuthError('無法連線至後端驗證服務。');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Safe mutations with constraint checking
  const executeMutation = async (type: 'insert' | 'update' | 'delete', table: string, rowId: string, payload?: any) => {
    setSyncStatus('SAVING');
    try {
      const response = await fetch('/api/v1/mdm/relational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mutation',
          type,
          table,
          rowId,
          data: payload
        })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setSyncStatus('ERROR');
        // Trigger gorgeous Relational Constraint Blocker dialog
        const errType = json.error || 'GENERIC';
        setValidationError({
          type: errType,
          title: errType === 'PRIMARY_KEY_VIOLATION' ? lt.err_duplicate_pk : 
                 errType === 'FOREIGN_KEY_VIOLATION' ? lt.err_invalid_fk : 
                 errType === 'DELETE_RESTRICTED' ? lt.err_restrict_delete : lt.err_db_op,
          message: json.message || '資料庫因關聯限制，不允許執行此項增刪修改操作。',
          details: json.details || []
        });

        // Audit constraint violation
        await fetch('/api/v1/audit-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorRole: 'Admin',
            eventType: 'RELATIONAL_VIOLATION_BLOCKED',
            objectId: rowId,
            details: `Relational Blocked [${type.toUpperCase()} on ${table}]: ${json.message}`
          })
        }).catch(() => {});

        return false;
      }

      setSyncStatus('SYNCHRONIZED');
      // Refresh local copy
      await fetchAllData();
      return true;
    } catch (err) {
      setSyncStatus('ERROR');
      return false;
    }
  };

  // Table fields schema helper
  const fields = TABLE_SCHEMAS[activeTable] || [];
  const rows = dbData[activeTable] || [];

  // Get Primary Key field name
  const pkField = fields.find(f => f.isPk)?.name || 'id';

  // Excel active cell coordinates helper (e.g. C3)
  const getCellCoordinates = () => {
    if (!selectedCell) return '';
    const colIndex = fields.findIndex(f => f.name === selectedCell.colName);
    if (colIndex === -1) return '';
    const colLetter = String.fromCharCode(65 + colIndex); // A, B, C...
    const rowNum = selectedCell.row + 1; // 1, 2, 3...
    return `${colLetter}${rowNum}`;
  };

  // Selection handler
  const handleCellSelect = (rowIndex: number, colName: string, val: any) => {
    setSelectedCell({ row: rowIndex, colName });
    setFormulaValue(String(val !== undefined && val !== null ? val : ''));
    setEditingCell(null);
  };

  // Start double click cell edit
  const handleCellDoubleClick = (rowIndex: number, colName: string, val: any) => {
    setSelectedCell({ row: rowIndex, colName });
    setFormulaValue(String(val !== undefined && val !== null ? val : ''));
    setEditingCell({ row: rowIndex, colName });
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  // Cell Value Commit (Excel-style cell exit)
  const handleCommitValue = async (newVal: string) => {
    if (!selectedCell) return;
    const { row, colName } = selectedCell;
    const rowData = rows[row];
    const rowId = rowData[pkField];
    const originalVal = rowData[colName];

    // No change
    if (String(originalVal === undefined ? '' : originalVal) === newVal) {
      setEditingCell(null);
      return;
    }

    // Block PK modification (highly dangerous in running system)
    if (colName === pkField) {
      setValidationError({
        type: 'PK_VIOLATION',
        title: lt.err_pk_title,
        message: lt.err_pk_desc,
        details: [lt.err_pk_tip1, lt.err_pk_tip2]
      });
      setEditingCell(null);
      setFormulaValue(String(originalVal || ''));
      return;
    }

    // Execute backend-validated relational update
    const payload = { [colName]: newVal };
    const ok = await executeMutation('update', activeTable, rowId, payload);
    if (!ok) {
      // Revert in Formula Bar
      setFormulaValue(String(originalVal || ''));
    }
    setEditingCell(null);
  };

  // Add row simulation
  const handleAddRow = async () => {
    // Generate a temporary high-uniqueness PK ID based on table prefix
    const prefix = activeTable === 'organizations' ? 'ORG' : 
                   activeTable === 'users' ? 'USR' : 
                   activeTable === 'resources' ? 'RES' :
                   activeTable === 'rare_donors' ? 'RDR' :
                   activeTable === 'donors' ? 'DNR' : 
                   activeTable === 'questionnaires' ? 'QST' :
                   activeTable === 'donations' ? 'DON' :
                   activeTable === 'lab_tests' ? 'TST' :
                   activeTable === 'components' ? 'CMP' :
                   activeTable === 'patients' ? 'PAT' :
                   activeTable === 'orders' ? 'ORD' :
                   activeTable === 'crossmatch' ? 'XM' :
                   activeTable === 'transfusions' ? 'TF' :
                   activeTable === 'adverse_reactions' ? 'AR' :
                   activeTable === 'product_catalog' ? 'PRD' :
                   activeTable === 'inventory' ? 'INV' :
                   activeTable === 'transport_jobs' ? 'TRN' : 'REC';
    
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const newId = `${prefix}-${randomNum}`;

    // Create an empty mock object with fields default values
    const emptyRow: Record<string, any> = {};
    fields.forEach(f => {
      if (!f.isPk) {
        emptyRow[f.name] = f.type === 'number' ? 0 : f.type === 'boolean' ? false : '';
      }
    });

    await executeMutation('insert', activeTable, newId, emptyRow);
  };

  // Delete row simulation
  const handleDeleteRow = async () => {
    if (!selectedCell) {
      setValidationError({
        type: 'GENERIC',
        title: lt.err_select_title,
        message: lt.err_select_desc
      });
      return;
    }

    const rowData = rows[selectedCell.row];
    const rowId = rowData[pkField];

    // Relational deletion challenge
    await executeMutation('delete', activeTable, rowId);
  };

  // Handle active group switch, auto-select first table of group
  const handleGroupSwitch = (groupId: string) => {
    setActiveGroupId(groupId);
    const grp = RELATION_GROUPS.find(g => g.id === groupId);
    if (grp && grp.tables.length > 0) {
      setActiveTable(grp.tables[0]);
      setSelectedCell(null);
      setEditingCell(null);
      setFormulaValue('');
    }
  };

  // Credentials challenge screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl p-4 selection:bg-rose-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900/40 border border-violet-500/20 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden backdrop-blur-3xl animate-float">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/40 relative group">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Lock size={28} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-widest uppercase italic">{lt.auth_title}</h2>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest mt-1">{lt.auth_sub}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            {authError && (
              <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex gap-3 items-start animate-shake">
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-rose-300 leading-relaxed">{authError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.auth_user}</label>
                <input 
                  required
                  type="text" 
                  value={authUsername} 
                  onChange={e => setAuthUsername(e.target.value)} 
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-violet-500 text-white rounded-2xl px-4 py-3.5 text-xs outline-none transition-all font-mono shadow-inner"
                  placeholder={lt.auth_input_user}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.auth_pass}</label>
                <input 
                  required
                  type="password" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-violet-500 text-white rounded-2xl px-4 py-3.5 text-xs outline-none transition-all font-mono shadow-inner"
                  placeholder={lt.auth_input_pass}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={onBack}
                className="flex-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl py-4 transition-all"
              >
                {lt.auth_btn_back}
              </button>
              <button 
                type="submit" 
                disabled={isAuthenticating}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl py-4 transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Unlock size={14} /> {lt.auth_btn_submit}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure watermark */}
          <div className="mt-8 pt-4 border-t border-slate-900 text-center flex justify-center items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
            <span>{lt.watermark}</span>
            <span>·</span>
            <span>{lt.sec_terminal}</span>
          </div>
        </div>
      </div>
    );
  }

  // Active group meta helper
  const activeGroup = RELATION_GROUPS.find(g => g.id === activeGroupId)!;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      {/* Ribbon Header */}
      <header className="p-4 border-b border-slate-900 bg-slate-950 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-800">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Database className="text-indigo-400 animate-pulse" size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                {lt.console_title}
                <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded font-black tracking-widest uppercase">{lt.admin_terminal}</span>
              </h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{lt.console_sub}</p>
            </div>
          </div>
        </div>

        {/* Console Ribbon Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Synchronized status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
            syncStatus === 'SYNCHRONIZED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 
            syncStatus === 'SAVING' ? 'bg-amber-950/30 text-amber-400 border-amber-900/50 animate-pulse' : 
            'bg-rose-950/30 text-rose-400 border-rose-900/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'SYNCHRONIZED' ? 'bg-emerald-500' : 
              syncStatus === 'SAVING' ? 'bg-amber-500 animate-ping' : 
              'bg-rose-500'
            }`} />
            {syncStatus === 'SYNCHRONIZED' && lt.sync_ok}
            {syncStatus === 'SAVING' && lt.sync_saving}
            {syncStatus === 'ERROR' && lt.sync_err}
          </div>

          <button onClick={() => setCurrentView('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${currentView === 'grid' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            <FileSpreadsheet size={13} /> {lt.btn_grid}
          </button>
          <button onClick={() => setCurrentView('schema')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${currentView === 'schema' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            <Network size={13} /> {lt.btn_schema}
          </button>
          <button onClick={fetchAllData} disabled={loading} className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Relational Dependency Groups Ribbon Selector */}
      <div className="px-6 py-3 border-b border-slate-900 bg-slate-950/70 backdrop-blur flex flex-wrap gap-2.5 z-10">
        {RELATION_GROUPS.map(grp => (
          <button 
            key={grp.id} 
            onClick={() => handleGroupSwitch(grp.id)} 
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeGroupId === grp.id ? `bg-gradient-to-r ${grp.color} text-white shadow-lg` : 'bg-slate-900/50 text-slate-400 border-slate-850 hover:text-slate-200'
            }`}
          >
            <span className="font-mono text-[9px] bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/10">{grp.id}</span>
            {grp.name_keys[currentLang]}
          </button>
        ))}
      </div>

      {/* Table list within active group */}
      <div className="px-6 py-2 bg-slate-900/30 border-b border-slate-900 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.tbl_active}</span>
          <div className="flex gap-1">
            {activeGroup.tables.map(tbl => (
              <button 
                key={tbl} 
                onClick={() => { setActiveTable(tbl); setSelectedCell(null); setEditingCell(null); setFormulaValue(''); }} 
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                  activeTable === tbl ? 'bg-indigo-950 text-indigo-400 border-indigo-900/80 shadow-inner' : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                📊 {tbl}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px] text-indigo-400 font-semibold italic flex items-center gap-1.5">
          <Info size={12} className="shrink-0 animate-bounce" />
          {activeGroup.description_keys[currentLang]}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">

        {/* SCHEMA VIEW */}
        {currentView === 'schema' && (
          <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col gap-6 selection:bg-transparent select-none">
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Network className="text-indigo-400" size={18} /> {lt.schema_title}
              </h2>
              <p className="text-xs text-slate-400">{lt.schema_sub}</p>
            </div>

            {/* Interactive Dependency Grid Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-2">
              {RELATION_GROUPS.map(grp => (
                <div key={grp.id} className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-3xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">{grp.name_keys[currentLang]}</span>
                    <span className="font-mono text-[9px] bg-slate-950/80 px-2 py-0.5 rounded border border-white/5 font-black tracking-widest">{grp.id}</span>
                  </div>
                  
                  {/* Tables in this group */}
                  <div className="space-y-3">
                    {grp.tables.map(tbl => {
                      const isHovered = hoveredSchemaTable === tbl;
                      const hasFk = TABLE_SCHEMAS[tbl].some(f => f.fk);
                      const fks = TABLE_SCHEMAS[tbl].filter(f => f.fk).map(f => f.fk!.table);

                      return (
                        <div 
                          key={tbl}
                          onMouseEnter={() => setHoveredSchemaTable(tbl)}
                          onMouseLeave={() => setHoveredSchemaTable(null)}
                          className={`p-3 rounded-xl border transition-all duration-300 relative cursor-pointer ${
                            isHovered ? 'bg-indigo-950/50 border-indigo-500 scale-[1.02] shadow-lg shadow-indigo-900/20' : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                              <Grid size={12} className="text-slate-400" /> {tbl}
                            </span>
                            <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold font-mono">
                              {TABLE_SCHEMAS[tbl].length} cols
                            </span>
                          </div>

                          {/* Render dependencies details */}
                          <div className="mt-2.5 pt-2 border-t border-slate-850/60 flex flex-col gap-1 text-[9px]">
                            {TABLE_SCHEMAS[tbl].map(field => {
                              if (field.isPk) {
                                return (
                                  <div key={field.name} className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                                    <span className="px-1 bg-emerald-950/60 border border-emerald-900 text-[8px] rounded uppercase scale-90">PK</span>
                                    <span>{field.name}</span>
                                  </div>
                                );
                              }
                              if (field.fk) {
                                return (
                                  <div key={field.name} className="flex items-center gap-1 text-rose-400 font-semibold font-mono">
                                    <span className="px-1 bg-rose-950/60 border border-rose-900 text-[8px] rounded uppercase scale-90">FK</span>
                                    <span>{field.name} ➔ {field.fk.table}.{field.fk.field}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>

                          {/* Hover Connection Indicators */}
                          {isHovered && hasFk && (
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-rose-500 rounded-full animate-ping pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Relation Legend / Rules Banner */}
            <div className="mt-4 p-6 rounded-2xl border border-rose-900/30 bg-rose-950/10 backdrop-blur flex flex-col gap-3">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={14} className="animate-pulse" /> {lt.schema_legend}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {lt.schema_legend_sub}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule1}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule1_desc}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule2}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule2_desc}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule3}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule3_desc}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXCEL GRID VIEW */}
        {currentView === 'grid' && (
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            
            {/* Excel Formula Bar (fx) */}
            <div className="px-6 py-2 border-b border-slate-900 bg-slate-950 flex items-center gap-3 select-none">
              <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
                <div className="px-2 py-1 bg-slate-900 border border-slate-800 text-indigo-400 rounded text-[10px] font-black font-mono tracking-widest min-w-[45px] text-center shadow-inner">
                  {getCellCoordinates() || 'N/A'}
                </div>
              </div>

              {/* fx label */}
              <div className="font-mono italic font-black text-slate-400 text-xs tracking-wider flex items-center select-none">
                fx
              </div>

              {/* Active Cell Value Input Box */}
              <input 
                type="text"
                disabled={!selectedCell || editingCell?.colName === pkField}
                value={formulaValue}
                onChange={e => {
                  setFormulaValue(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCommitValue(formulaValue);
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    if (selectedCell) {
                      const rowData = rows[selectedCell.row];
                      setFormulaValue(String(rowData[selectedCell.colName] || ''));
                    }
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onBlur={() => handleCommitValue(formulaValue)}
                className="flex-1 bg-slate-900/60 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                placeholder={selectedCell ? (editingCell?.colName === pkField ? lt.bar_pk_blocked : lt.bar_placeholder) : lt.bar_no_select}
              />

              {/* Action Buttons for rows */}
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-3">
                <button 
                  onClick={handleAddRow}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus size={12} /> {lt.btn_add_row}
                </button>
                <button 
                  onClick={handleDeleteRow}
                  className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Trash2 size={12} /> {lt.btn_delete_row}
                </button>
              </div>
            </div>

            {/* Editable Spreadsheet Sheet */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-950 select-none">
              {loading ? (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-slate-950/80 backdrop-blur-md">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg" />
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">Loading relational data...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center p-8 text-center bg-slate-950/40">
                  <AlertTriangle size={36} className="text-amber-500 animate-bounce" />
                  <h3 className="text-sm font-black text-slate-200">{lt.tbl_empty_title}</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">{lt.tbl_empty_desc}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse border-spacing-0 select-none">
                  {/* Header Row */}
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 z-20 select-none border-b border-slate-900">
                    <tr>
                      {/* Excel Row Index Header cell */}
                      <th className="w-[50px] bg-slate-950/90 text-center font-mono text-[9px] font-black border-r border-slate-900 select-none shadow-sm py-2 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-500">
                        Index
                      </th>
                      {fields.map((field, colIdx) => {
                        const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
                        return (
                          <th 
                            key={field.name} 
                            className="bg-slate-950/90 border-r border-slate-900 select-none font-mono text-center px-4 py-2 hover:bg-slate-900 transition-colors shadow-sm min-w-[160px]"
                          >
                            <div className="text-[9px] text-slate-500 font-bold block leading-none select-none mb-1 uppercase tracking-wider">{colLetter}</div>
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[10px] text-slate-200 font-black tracking-tight">{field.name}</span>
                              {field.isPk && (
                                <span className="text-[7px] bg-emerald-950/80 text-emerald-400 border border-emerald-900/60 px-1 rounded font-black font-mono scale-90 uppercase">PK</span>
                              )}
                              {field.fk && (
                                <span className="text-[7px] bg-rose-950/80 text-rose-400 border border-rose-900/60 px-1 rounded font-black font-mono scale-90 uppercase" title={`Foreign Key: references ${field.fk.table}.${field.fk.field}`}>FK</span>
                              )}
                            </div>
                            <div className="text-[8px] text-slate-500 font-medium select-none truncate mt-0.5 leading-none">
                              {field.label_keys ? (field.label_keys[currentLang] || field.label) : field.label}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Body rows */}
                  <tbody className="divide-y divide-slate-900 select-none">
                    {rows.map((row, rowIndex) => {
                      const rowNumber = rowIndex + 1;
                      const rowId = row[pkField];

                      return (
                        <tr 
                          key={rowId || rowIndex} 
                          className="hover:bg-slate-900/20 group/row transition-colors"
                        >
                          {/* Row Index number cell */}
                          <td className="bg-slate-950 text-center font-mono text-[9px] font-black border-r border-slate-900 text-slate-500 py-1.5 select-none bg-gradient-to-r from-slate-950 to-slate-900 group-hover/row:text-slate-300">
                            {rowNumber}
                          </td>

                          {/* Row cells */}
                          {fields.map(field => {
                            const val = row[field.name];
                            const isCellSelected = selectedCell?.row === rowIndex && selectedCell?.colName === field.name;
                            const isCellEditing = editingCell?.row === rowIndex && editingCell?.colName === field.name;

                            return (
                              <td 
                                key={field.name}
                                onClick={() => handleCellSelect(rowIndex, field.name, val)}
                                onDoubleClick={() => handleCellDoubleClick(rowIndex, field.name, val)}
                                className={`border-r border-slate-900 px-4 py-1.5 font-mono text-xs cursor-pointer select-none transition-all duration-75 relative max-w-[250px] truncate ${
                                  isCellSelected ? 'bg-indigo-950/30' : 'bg-transparent'
                                }`}
                              >
                                {isCellEditing ? (
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={formulaValue}
                                    onChange={e => setFormulaValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        handleCommitValue(formulaValue);
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setFormulaValue(String(val || ''));
                                      }
                                    }}
                                    onBlur={() => handleCommitValue(formulaValue)}
                                    className="absolute inset-0 w-full h-full bg-slate-900 text-white font-mono text-xs px-4 border-2 border-indigo-500 outline-none select-text"
                                  />
                                ) : (
                                  <span className={`select-none ${
                                    field.isPk ? 'text-indigo-400 font-bold' : 
                                    field.fk ? 'text-rose-400 font-medium' : 'text-slate-200'
                                  }`}>
                                    {val === undefined || val === null ? (
                                      <span className="text-slate-700 italic select-none">NULL</span>
                                    ) : typeof val === 'boolean' ? (
                                      val ? 'TRUE' : 'FALSE'
                                    ) : (
                                      String(val)
                                    )}
                                  </span>
                                )}

                                {/* Selected blue cell active border marker */}
                                {isCellSelected && !isCellEditing && (
                                  <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none select-none z-10" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Grid footer info stats bar */}
            <footer className="px-6 py-2 border-t border-slate-900 bg-slate-950 text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center justify-between select-none">
              <div className="flex gap-4">
                <span>{lt.footer_tbl}: {activeTable}</span>
                <span>{lt.footer_rows}: {rows.length} Rows</span>
                <span>{lt.footer_pk}: {pkField}</span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Sparkles size={11} className="animate-spin" />
                <span>{lt.footer_active}</span>
              </div>
            </footer>
          </div>
        )}
      </div>

      {/* GORGEOUS RELATIONAL CONSTRAINT BLOCKER OVERLAY DIALOG */}
      {validationError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 selection:bg-rose-500/20">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.2)] animate-shake">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-rose-950/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-500">
                  <AlertTriangle size={20} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">{validationError.title}</h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">VN-BECS Integrity Engine Rule Warning</p>
                </div>
              </div>
              <button 
                onClick={() => setValidationError(null)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-8 space-y-6">
              <p className="text-xs font-semibold text-slate-200 leading-relaxed bg-rose-950/20 border border-rose-900/30 p-4 rounded-2xl">
                {validationError.message}
              </p>
              
              {validationError.details && validationError.details.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">系統分析診斷建議 (Diagnostic Details):</span>
                  <ul className="space-y-2 bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-[10px] text-slate-300 leading-relaxed font-mono">
                    {validationError.details.map((d, i) => (
                      <li key={i} className="flex gap-2 items-start text-rose-300">
                        <span className="text-rose-500 shrink-0 select-none">➔</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-950/50 border-t border-slate-850 flex justify-end gap-3">
              <button 
                onClick={() => setValidationError(null)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {lt.dialog_return}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
