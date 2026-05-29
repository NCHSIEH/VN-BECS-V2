# Blood Unit State Model Redesign

Purpose: define a production-grade state model for blood units and components before implementation begins.

The current implementation has a useful starting point in `src/lib/stateMachine.ts`, but production use needs a stronger model because blood safety state, inventory movement, patient assignment, and custody are different concerns. Combining them into one free-text `status` makes unsafe transitions hard to prevent.

## Current Problems To Fix

Observed risks:

- `BloodUnitStatus` in `src/types.ts` does not match all values used by API routes and fallback data.
- API routes directly call `db.components.updateStatus(...)` or `db.inventory.create({ ...unit, status })`.
- Some routes use non-canonical values such as `RELEASED`, `HUB INTRANSIT`, `QUARANTINED`, and `ALLOCATED`.
- Component and inventory records can drift because both can carry independent statuses.
- Some workflows can bypass the intended sequence, such as creating a component as `AVAILABLE` before formal release.
- Audit is not part of the state transition contract.
- Offline sync updates inventory status directly and only partially checks version/conflict state.

## Design Principles

1. Clinical safety state is separate from logistics state.
2. Every high-risk change is a command, not a raw status write.
3. Every command performs guard checks, writes audit, and returns structured errors.
4. The database should enforce the same vocabulary as TypeScript.
5. Emergency workflows are explicit, auditable exceptions, not hidden bypasses.
6. Offline commands are replayed through the same domain rules on the server.

## Proposed Multi-Axis Model

### Quality Status

Represents whether the product is clinically releasable.

| Status | Meaning |
| --- | --- |
| `PENDING_TEST` | Collected/created but IDM or required testing is not yet authorized. |
| `RELEASED` | Testing and quality checks allow clinical use. |
| `HOLD_IDM` | Reactive/inconclusive IDM or pending confirmatory test. |
| `HOLD_COLD_CHAIN` | Cold-chain excursion requires review. |
| `HOLD_LOOKBACK` | Co-component, donor, or recipient lookback hold. |
| `NONCONFORMING` | Known quality nonconformance, awaiting disposition. |
| `DISCARDED` | Removed from use for quality/safety reason. |

### Inventory Status

Represents stock availability and disposition.

| Status | Meaning |
| --- | --- |
| `NOT_IN_STOCK` | Not yet part of active inventory. |
| `AVAILABLE` | Available for allocation at current facility. |
| `ORDER_RESERVED` | Reserved for a specific order. |
| `PICKED` | Picked/scanned for shipment or issue. |
| `IN_TRANSIT` | Under courier/cold-chain transport. |
| `RECEIVED` | Received at destination facility. |
| `ISSUED` | Issued out of blood bank to ward/bedside. |
| `RETURN_PENDING` | Returned unit awaiting inspection and disposition. |
| `WASTED` | Wasted for handling/storage/expiry reason. |
| `TRANSFUSED` | Administered to patient. |

### Assignment Status

Represents patient/order relationship.

| Status | Meaning |
| --- | --- |
| `UNASSIGNED` | Not assigned to order or patient. |
| `ORDER_ALLOCATED` | Allocated to an order but not patient-specific. |
| `PATIENT_ASSIGNED` | Assigned to a patient/order context. |
| `CROSSMATCH_COMPATIBLE` | Compatible crossmatch recorded and valid. |
| `EMERGENCY_RELEASED` | Issued under emergency policy without normal compatibility completion. |

### Custody Status

Represented as structured custody/location data rather than free text:

- `current_facility_id`
- `current_location_id`
- `custody_holder_type`: `BloodCenter`, `Hub`, `Courier`, `HospitalBloodBank`, `Ward`, `Bedside`
- `custody_holder_id`
- `last_custody_event_id`

## Command Model

All state changes should go through commands. Commands should be implemented in a domain layer and called from API routes.

| Command | Main guard examples | State effects |
| --- | --- | --- |
| `CollectDonation` | donor exists, not actively deferred, questionnaire pass, valid DIN | create donation, lab test `PENDING`, component parent not yet released |
| `RecordLabResult` | authorized role, valid result, test belongs to donation | update test result, set `PENDING_TEST` or hold |
| `AuthorizeRelease` | IDM cleared, ABO/Rh resolved, component exists, not expired | `quality_status=RELEASED`, `inventory_status=AVAILABLE` |
| `PrepareComponent` | donation collected, required lab state, product catalog valid | create child components with parent link and processing record |
| `AllocateToOrder` | order approved, facility scope, released, available, not expired | `ORDER_RESERVED`, `ORDER_ALLOCATED` |
| `PickUnit` | reserved for order, barcode match, picker role | `PICKED` |
| `DispatchUnit` | picked, cold-chain container/device assigned | `IN_TRANSIT`, custody to courier |
| `ReceiveUnit` | in transit, destination match, no unresolved excursion | `RECEIVED`, custody to hospital |
| `RecordCrossmatch` | patient exists, specimen valid, method allowed, antibody rules | `CROSSMATCH_COMPATIBLE` if compatible |
| `IssueUnit` | compatible or emergency release, medical order confirmed, not expired | `ISSUED`, custody to ward |
| `ReturnUnit` | issued, time/temp/visual data captured | `RETURN_PENDING` then available or wasted |
| `StartTransfusion` | bedside unit/patient/order match, dual verifier, consent/vitals | transfusion started, still `ISSUED` until completion if policy requires |
| `CompleteTransfusion` | transfusion record exists, no unresolved stop event | `TRANSFUSED` |
| `ReportAdverseReaction` | transfusion exists, severity/category valid | create reaction, trigger lookback/quarantine |
| `QuarantineRelatedUnits` | reaction/lookback policy applies | `HOLD_LOOKBACK` for co-components |
| `WasteUnit` | reason code required, role authorized | `WASTED` or `DISCARDED` depending reason |

## Hard Stops

These conditions should block the command, not only show UI warnings:

- IDM not cleared for normal release.
- Reactive/inconclusive IDM without authorized quarantine/discard decision.
- Expired unit for reservation, crossmatch, issue, or transfusion.
- Cold-chain excursion without QA/medical disposition.
- Barcode mismatch during pick, receive, issue, or bedside verification.
- Patient ABO/Rh unknown unless emergency policy allows.
- Electronic/immediate-spin crossmatch where antibody history requires AHG/full crossmatch.
- Issue without medical order confirmation unless emergency release policy applies.
- Return to stock after policy time/temperature/visual inspection failure.
- Transfusion with the same person acting as both verifiers.
- Any transition from terminal `DISCARDED`, `WASTED`, or `TRANSFUSED`.

## Audit Requirements Per Command

Every command should create an audit event with:

- `event_type`
- `actor_id`
- `actor_role`
- `facility_id`
- `device_id`
- `request_id`
- `object_type`
- `object_id`
- `command_name`
- `before_hash`
- `after_hash`
- `reason_code`
- `policy_version`
- `timestamp`

Emergency, override, waste, discard, return-to-stock, and lookback commands must require reason codes and may require dual review.

## Structured Error Model

Domain commands should return a stable error shape:

```ts
type DomainError = {
  code: string;
  message: string;
  severity: 'Info' | 'Warning' | 'HardStop';
  actionRequired?: string;
  auditHint?: string;
  correlationId: string;
};
```

Examples:

- `ERR_IDM_NOT_CLEARED`
- `ERR_BARCODE_MISMATCH`
- `ERR_UNIT_EXPIRED`
- `ERR_COLD_CHAIN_HOLD`
- `ERR_CROSSMATCH_REQUIRED`
- `ERR_ROLE_NOT_AUTHORIZED`
- `ERR_VERSION_CONFLICT`
- `ERR_OFFLINE_REVIEW_REQUIRED`

## Implementation Plan

### Step 1 - Introduce Domain Types

Add canonical enums/types for quality, inventory, assignment, custody, command context, and command result. Keep backwards-compatible adapters for current UI.

### Step 2 - Wrap Existing State Machine

Keep `BloodUnitStateMachine` initially, but route new commands through a domain service. Mark direct status updates as legacy.

### Step 3 - Update API Routes Incrementally

Prioritize highest-risk routes:

1. `app/api/v1/lims/process-component/[id]/route.ts`
2. `app/api/v1/lims/components/[id]/release/route.ts`
3. `app/api/v1/orders/[id]/[action]/route.ts`
4. `app/api/v1/crossmatch/route.ts`
5. `app/api/v1/issue/route.ts`
6. `app/api/v1/issue/[id]/return/route.ts`
7. `app/api/v1/bedside-verify/route.ts`
8. `app/api/v1/sync/push-events/route.ts`

### Step 4 - Align Database

Add columns/constraints and migrate existing free-text status values. Production should reject unknown status values.

### Step 5 - Expand Tests

Add tests for:

- Valid transition paths.
- Invalid transition hard stops.
- Emergency bypass with reason and audit.
- Direct status update regression.
- Component/inventory drift prevention.
- Offline replay and version conflict.

## Migration Notes

Current free-text statuses can be mapped as follows:

| Existing value | Proposed mapping |
| --- | --- |
| `COLLECTED` | quality `PENDING_TEST`, inventory `NOT_IN_STOCK` |
| `QUARANTINE` | quality `PENDING_TEST` or hold-specific status |
| `QUARANTINED` | quality `HOLD_IDM` or `NONCONFORMING` depending reason |
| `AVAILABLE` | quality `RELEASED`, inventory `AVAILABLE` |
| `RELEASED` | quality `RELEASED`; inventory depends on location |
| `ALLOCATED` | inventory `ORDER_RESERVED`, assignment `ORDER_ALLOCATED` |
| `RESERVED` | inventory `ORDER_RESERVED` |
| `PICKED` | inventory `PICKED` |
| `HUB INTRANSIT` | inventory `IN_TRANSIT`, custody to courier/hub route |
| `IN_TRANSIT` | inventory `IN_TRANSIT` |
| `RECEIVED` | inventory `RECEIVED` |
| `CROSSMATCHED` | assignment `CROSSMATCH_COMPATIBLE` |
| `ISSUED` | inventory `ISSUED` |
| `RETURNED` | inventory `RETURN_PENDING` or `AVAILABLE` after inspection |
| `TRANSFUSED` | inventory `TRANSFUSED` |
| `WASTED` | inventory `WASTED` |
| `DISCARDED` | quality `DISCARDED` |

## Stage 1 Completion Criteria

Stage 1 is complete when:

- Canonical state types exist.
- Highest-risk API routes use domain commands.
- Direct free-text status updates are removed or isolated behind compatibility adapters.
- Tests prove key SOP hard stops.
- Antigravity can run tests and continue from a stable domain model.
