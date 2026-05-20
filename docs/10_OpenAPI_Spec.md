# NBMS API Specification (OpenAPI 3.1 Subset)

本文件描述了 NBMS 核心作業流程 (SOP 1 - SOP 10) 以及管理模組 (MDM, Alerting) 的 RESTful API 端點。所有 API 皆以 `/api/v1` 為 Base URL。

## Authentication & Headers
所有寫入型 API (POST, PUT, DELETE) 必須包含：
- `Content-Type: application/json`
- *(未來 Firebase Auth)* `Authorization: Bearer <token>`

---

## 1. MDM (Master Data Management)

### GET `/mdm/users`
取得所有系統使用者名單。
**Response:** `Array<User>`

### POST `/mdm/users`
建立新使用者帳號。
**Request Body:**
```json
{
  "username": "nurse01",
  "password": "pwd",
  "role": "Nurse",
  "orgId": "ORG-123"
}
```

### PUT `/mdm/users/:id/status`
停權或啟用使用者 (T-701)。
**Request Body:**
```json
{
  "isActive": false
}
```

### GET `/catalog/products`
取得所有 ISBT-128 產品定義。
**Response:** `Array<ProductCatalog>`

---

## 2. LIMS (SOP 1 - 3: 採血與實驗室)

### POST `/lims/donors` (SOP 1)
註冊新捐贈者 (包含 CCCD 驗證)。
**Request Body:**
```json
{
  "name": "Nguyen Van A",
  "nationalId": "001090123456",
  "dob": "1990-01-01",
  "bloodType": "O",
  "rhd": "Positive"
}
```

### POST `/lims/collect` (SOP 1)
建立捐血綁定紀錄與 ISBT-128 血袋條碼。
**Request Body:**
```json
{
  "donorId": "D-10001",
  "type": "Whole Blood",
  "volume": 500,
  "donationId": "=W0000 24 123456"
}
```

### POST `/lims/lab/process` (SOP 2)
提交實驗室 NAT 與血清學檢驗結果。
**Request Body:**
```json
{
  "donationId": "=W0000 24 123456",
  "status": "CLEARED" // 或 "REACTIVE"
}
```

---

## 3. 調度與冷鏈 (SOP 4 - 5)

### GET `/orders` (SOP 4)
取得所有來自醫院的血液訂購單。

### PUT `/orders/:id/status` (SOP 4)
調度員核准或升級醫院訂單。
**Request Body:**
```json
{
  "status": "APPROVED"
}
```

### POST `/iot/temperature` (SOP 5)
IoT 感測器即時上傳冷箱溫度。若溫度超過範圍，會自動觸發 `COLD_CHAIN_VIOLATION`。
**Request Body:**
```json
{
  "orderId": "ORD-123",
  "sensorId": "SENS-001",
  "timestamp": "2024-05-09T10:00:00Z",
  "temperature": 5.2
}
```

---

## 4. 臨床醫療與核對 (SOP 6 - 9)

### POST `/crossmatch` (SOP 7)
記錄交叉配血結果。
**Request Body:**
```json
{
  "componentId": "=W0000 24 123456",
  "patientId": "P-101",
  "method": "IS", // IS, AHG, EXM
  "result": "COMPATIBLE",
  "testedBy": "Dr. Smith",
  "specimenDate": "2024-05-08T00:00:00Z"
}
```

### POST `/issue` (SOP 8)
發血紀錄。
**Request Body:**
```json
{
  "componentId": "=W0000 24 123456",
  "patientId": "P-101",
  "issuedTo": "Nurse Kelly",
  "issuedBy": "Tech Bob"
}
```

### POST `/issue/:id/return` (SOP 8)
退血處理，系統會自動計算是否超時 (30 分鐘規則)。
**Request Body:**
```json
{
  "visualInspectionOk": true,
  "temperatureOk": true
}
```

### POST `/bedside-verify` (SOP 6)
病榻旁雙重核對與生命徵象確認。
**Request Body:**
```json
{
  "componentId": "=W0000 24 123456",
  "patientId": "P-101",
  "verifier1": "Nurse A",
  "verifier2Pin": "Dr. B",
  "consentVerified": true,
  "preVitalsChecked": true
}
```

### POST `/adverse-reactions` (SOP 9)
不良反應通報與緊急隔離。
**Request Body:**
```json
{
  "transfusionId": "TXN-123",
  "patientId": "P-101",
  "reactionType": "FNHTR",
  "severity": "Moderate",
  "description": "Fever and chills",
  "actionsTaken": "Stopped transfusion, gave Tylenol",
  "allTransfusionsPaused": true
}
```

---

## 5. 離線對帳與告警 (SOP 10 & Alerting)

### POST `/offline/sync`
同步離線期間的緊急借血事件。
**Request Body:**
```json
{
  "events": [
    {
      "localEventId": "OFF-123",
      "hospitalId": "HOSP-01",
      "unitBarcodeRaw": "=W0000 24 123456",
      "patientTempId": "TEMP-P1",
      "authorizationDoctorId": "DR-456",
      "timestamp": "2024-05-09T12:00:00Z"
    }
  ]
}
```

### GET `/alerts`
獲取所有活躍中的系統告警 (Critical, High, Medium)。
**Response:** `Array<Alert>`

### PUT `/config/kpi-thresholds`
動態更新管理儀表板的 KPI 閾值。
**Request Body:**
```json
{
  "wastageGreen": 2,
  "wastageYellow": 5,
  "complianceGreen": 98,
  "complianceYellow": 95
}
```
