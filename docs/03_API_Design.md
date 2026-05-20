# OpenAPI 3.1 規劃草案 (Prompt 3)

## 核心設計理念
所有修改狀態之 API 皆強制寫入 `audit_events` 表，並要求夾帶必要的驗證 Token。

## API Endpoints (Subset Overview)

### 1. Order API
- `POST /api/v1/orders`
  - Body: `{ hospitalId, priority, orderType, lines[] }`
  - Response: `201 Created` with Order ID
- `POST /api/v1/orders/{orderId}/submit`
  - Description: Status transitions from DRAFT to SUBMITTED.
- `POST /api/v1/orders/{orderId}/approve`
  - Body: `{ approvedLines: [{lineId, qty}] }`
  - Restriction: `Dispatcher` role only.
- `POST /api/v1/orders/{orderId}/override`
  - Body: `{ reasonCode, freeTextReason, adjustedQuantity }`
  - **Audit:** HIGH. Will trigger dual review if `reasonCode` is flagged.

### 2. Barcode Scan API
- `POST /api/v1/picking-tasks/{taskId}/scan`
  - Body: `{ rawBarcode, parsedDIN, parsedProductCode }`
  - Response: `200 OK` (Matched), or `400 Bad Request` (BARCODE_MISMATCH).
  - *Idempotency Rule:* Submitting same barcode twice gracefully returns already-scanned unless unit is released.

### 3. Inventory & Catalog
- `GET /api/v1/hospitals/{hospitalId}/inventory-summary` -> DOS and limits
- `GET /api/v1/catalog/products` -> ISBT 128 Product cache

### 4. Offline Sync API
- `POST /api/v1/offline-sync/batches`
  - Body: `{ offlineSessionId, events: [ {localEventId, hash, reasonCode...} ] }`
  - *Conflict Management:* Returns `{ accepted:[], conflicts:[] }`. Updates cloud stock. Create `Offline Audit Trail`.
  
### Error Codes
- `ERR_QUOTA_EXCEEDED`
- `ERR_BARCODE_MISMATCH`
- `ERR_COLD_CHAIN_VIOLATING`
- `ERR_MEDICAL_POLICY`
