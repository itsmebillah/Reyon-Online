# Sprint 18 — Delivery Operations Decision Packet

## Purpose

This packet requests only the Product Owner decisions required to implement Delivery Operations. It reuses the approved Order, Inventory, Payment, Sales, address, delivery-zone, audit, and notification foundations.

## Table of Contents

- [Already approved](#already-approved)
- [Decisions required](#decisions-required)
- [Implementation sequence after approval](#implementation-sequence-after-approval)
- [Dependencies and boundaries](#dependencies-and-boundaries)
- [Related documents](#related-documents)

## Already Approved

- Delivery zones and charges are Admin-configurable; initial zones are Inside Dhaka and Outside Dhaka.
- Checkout stores the approved structured address and displays delivery charge before confirmation.
- Packed → Shipped requires handoff evidence; Shipped creates the auditable sold inventory movement.
- Delivered is distinct from Completed; COD collection occurs at Delivered and sale recognition at Completed.
- Operational history is append-only and notifications are provider-neutral and failure-safe.

## Decisions Required

1. **Operating model:** in-house delivery, external courier, or both; initial courier and manual versus integrated launch operation.
2. **Fulfillment unit:** one shipment per order initially, or split shipments/partial delivery.
3. **Workflow:** operational states and transitions for assignment, handoff, Shipped, attempts, Delivered, and delivery exceptions.
4. **Handoff evidence:** required courier, tracking/consignment reference, handoff time, actor, and package details.
5. **Tracking:** REYON tracking, external tracking, or both; customer-visible events.
6. **Attempts:** maximum attempts, rescheduling, customer-unavailable handling, and exhausted-attempt outcome.
7. **Proof of delivery:** required evidence and authorized actor; recipient name, OTP, signature, image, or courier confirmation if applicable.
8. **Address changes:** authorized roles, cutoff stage, and delivery-charge revalidation after confirmation.
9. **Failure, loss, and damage:** outcomes, required evidence, stock/payment effects, and escalation owner.
10. **Cancellation interaction:** behavior before handoff and required carrier-cancellation evidence after assignment.
11. **COD reconciliation:** collection evidence, responsible role, cash handover/settlement, mismatch handling, and reconciliation owner.
12. **Roles and notifications:** Super Admin/Admin/Staff permissions and approved customer/admin delivery events and initial channels.

## Implementation Sequence After Approval

1. Fulfillment creation and shipment assignment.
2. Provider-neutral handoff and tracking evidence.
3. Delivery attempts, proof, and exception operations.
4. COD reconciliation boundary.
5. Customer/Admin tracking views and event-driven notifications.
6. Delivery register and targeted release verification.

## Dependencies and Boundaries

Carrier credentials block only a specific adapter; an approved manual provider-neutral workflow can proceed independently. Sprint 18 does not define Returns/Refunds, accounting postings, or new Sales-recognition rules.

## Related Documents

- [Roadmap](13_ROADMAP.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Sales Processing](29_SALES_PROCESSING.md)
