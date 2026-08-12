# Sprint 16 — Order Management Product Owner Decision Packet

## Purpose

This packet records only the business decisions required to implement Sprint 16 Order Management. It does not approve behavior, reopen Sprint 15, or define Sales Processing, Delivery Operations, or Returns and Refunds beyond the handoff points Order Management must recognize.

## Table of Contents

- [Approved baseline](#approved-baseline)
- [Decisions required](#decisions-required)
- [Stage action matrix](#stage-action-matrix)
- [Decision dependencies](#decision-dependencies)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Approved Baseline

The following rules are already approved and are not open for reconsideration in this packet:

- Guest checkout and order placement do not require OTP in the current release.
- Successful confirmation creates or associates an initially unverified customer profile.
- Confirmation revalidates authoritative product status, price, stock, address, active delivery zone and charge, and payment selection.
- Order creation is idempotent and snapshots the commercial, address, delivery, and payment facts.
- Confirmation starts an auditable 30-minute stock reservation; cart activity does not reserve stock.
- Negative stock and over-reservation are prohibited. Insufficient stock creates an auditable confirmation exception without reserving unavailable stock.
- Cancellation, reservation expiry, or leaving the confirmed state without successful fulfillment releases the reservation with audit evidence.
- Manual payment evidence is not payment verification. Card cannot imply gateway success; COD remains payable on delivery.
- Profile existence, OTP/contact verification, and REYON customer verification are separate. Only a genuinely delivered/completed order verifies the REYON customer.
- Historical order, inventory, payment, delivery, customer, and transition evidence is not silently edited or deleted.

## Decisions Required

Product Owner approval is required for each numbered decision before its dependent workflow is implemented.

### OM-01 — Order Reference

Define the customer-facing/admin-facing order-number format, starting sequence, uniqueness scope, and whether the number may expose date, channel, or location information. Internal immutable Order ID remains separate.

### OM-02 — Lifecycle and Allowed Transitions

Approve the complete Order Management state vocabulary and transition matrix from the existing `confirmed` and `confirmation-exception` entry states through packing, delivery handoff, shipping, delivery/completion, cancellation, rejection, failure, return, and refund handoffs. For every transition, specify:

- initiating role or system;
- required evidence and reason;
- reversible or irreversible status;
- whether it is a normal path or exception;
- treatment of an expired reservation;
- whether `delivered` and `completed` are distinct states or one business event.

### OM-03 — Customer Cancellation

Decide whether customers may cancel, the eligible states and time window, whether cancellation is immediate or a request requiring admin approval, required reason capture, and treatment when payment evidence or verified payment already exists.

### OM-04 — Administrator Cancellation and Rejection

Define which admin roles may cancel or reject in each state, mandatory reason/evidence, whether secondary approval is required, customer communication requirements, and the boundary after packing, delivery handoff, shipping, or delivery. Approved reservation release remains mandatory when cancellation validly leaves the confirmed path.

### OM-05 — Order Editing and Corrections

Define which facts may be changed after confirmation and until which state: quantities, products/variants, customer contact, delivery address, delivery zone/charge, payment method/evidence, discounts, and internal notes. For every permitted change, decide whether the system must reprice, revalidate stock, replace/recalculate reservations, obtain customer consent, or create a replacement order instead. Historical snapshots and audit evidence cannot be overwritten.

### OM-06 — Manual Review and Exceptions

Define which conditions require manual review, including the existing insufficient-stock exception, and whether payment evidence, unusual quantity/value, repeated failed attempts, address concerns, or other facts should trigger review. Approve the review outcomes, responsible roles, service target, escalation, customer visibility, and whether reviewed orders may proceed, be corrected, be rejected, or require replacement.

### OM-07 — Roles, Permissions, and Approval Separation

Map the current administrator authorization model to Order Management actions: view, search, inspect private customer details, add internal notes, verify payment evidence, edit, approve review, pack, hand off, mark shipped, mark delivered/completed, cancel/reject, and perform corrections. Identify actions requiring a second approver and any fields that must be masked from some roles.

### OM-08 — Payment Verification Effects

For bKash, Nagad, Rocket, Card, and COD, decide which order transitions are allowed while payment is pending, verified, rejected, failed, or payable on delivery. Define whether verified payment is required before packing or handoff, who may verify/reject evidence, what happens after rejection, and which outcomes hand off to refund processing. Payment verification must remain distinct from order state.

### OM-09 — Reservation and Fulfillment Handoff

Decide what happens when the approved 30-minute reservation expires before staff act: automatic cancellation, exception review, customer reconfirmation, or another approved outcome. Define whether and by whom a reservation may be renewed, and the exact transition that converts reserved stock into the sale/fulfillment inventory movement. Also define partial-availability behavior; over-reservation remains prohibited.

### OM-10 — Delivery Handoff

Define the minimum facts and evidence required before an order can leave packing and be handed to delivery, who performs the handoff, whether carrier/rider assignment and tracking reference are mandatory, and which system owns shipped, delivery-attempt, delivered, failed-delivery, refused, lost, or damaged evidence until Sprint 18 expands Delivery Operations.

### OM-11 — Return and Refund Boundary

Define which post-shipment/post-delivery actions Order Management may record before Sprint 19, which conditions must create a return/refund request rather than mutate or cancel the original order, and whether an open return/refund affects order completion. Eligibility, inspection, restocking, exchange, and refund policy remain Sprint 19 decisions.

### OM-12 — Customer Notifications

Approve which lifecycle and exception events notify customers, the initial channels, recipient contact priority, required message content, language, retry/failure behavior, and whether operational actions may proceed when notification delivery fails. No provider or automated sending is implied until approved and configured.

### OM-13 — Administrator Notifications

Approve which events create admin alerts or queues, recipient roles, urgency/escalation, acknowledgement requirements, and closure rules. At minimum, decide handling for new orders, confirmation exceptions, payment evidence awaiting review, reservation expiry, cancellation requests, delivery failures, and correction approvals.

### OM-14 — Audit, Correction, and Exceptional Override

Define mandatory reason/evidence for each sensitive action, correction authority, second-approval requirements, retention and visibility of audit history, and whether any emergency override is permitted. Corrections must be additive and attributable; published history, stock movements, reservations, payment evidence, and order transitions cannot be silently rewritten or deleted.

## Stage Action Matrix

For each stage below, the Product Owner must approve customer actions, administrator actions, prohibited actions, required evidence, payment effect, reservation/stock effect, and notification effect:

| Stage                             | Decisions still required                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| After confirmation                | Customer/admin cancellation, editable facts, manual-review triggers, payment gate, action before reservation expiry                    |
| During packing                    | Cancellation authority, permitted address/payment corrections, reservation-to-stock movement point, packing evidence                   |
| After delivery handoff / shipping | Cancellation prohibition or exception, rerouting/address correction, failed/refused/lost/damaged handling, notification responsibility |
| After delivery / completion       | Permitted correction only, return/refund request handoff, COD/payment completion, REYON customer verification evidence                 |

## Decision Dependencies

- OM-02 is required before any executable lifecycle controls.
- OM-03 through OM-05 depend on OM-02 state boundaries.
- OM-07 is required before exposing any operational action.
- OM-08 and OM-09 are required before orders can safely progress from confirmation to packing.
- OM-10 is required for the Sprint 16 handoff to Sprint 18.
- OM-11 defines only the safe boundary with Sprint 19; it does not approve return/refund policy.
- OM-12 through OM-14 apply across every transition and exception.

## Future Expansion

Sprint 16 decisions must permit additional sales channels, locations, fulfillment providers, payment providers, notification providers, and partial fulfillment without redefining the order aggregate. Detailed Sales Processing, Delivery Operations, and Returns and Refunds policy remains in Sprints 17–19.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Roadmap](13_ROADMAP.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md)
