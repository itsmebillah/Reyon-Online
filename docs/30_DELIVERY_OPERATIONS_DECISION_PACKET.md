# Sprint 18 — Delivery Operations Decision Packet

## Purpose

This document records the authoritative Product Owner decisions for Delivery Operations. It reuses the approved Order, Inventory, Payment, Sales, address, delivery-zone, audit, and notification foundations.

## Table of Contents

- [Already approved](#already-approved)
- [Approved rules](#approved-rules)
- [Implementation sequence after approval](#implementation-sequence-after-approval)
- [Dependencies and boundaries](#dependencies-and-boundaries)
- [Related documents](#related-documents)

## Already Approved

- Delivery zones and charges are Admin-configurable; initial zones are Inside Dhaka and Outside Dhaka.
- Checkout stores the approved structured address and displays delivery charge before confirmation.
- Packed → Shipped requires handoff evidence; Shipped creates the auditable sold inventory movement.
- Delivered is distinct from Completed; COD collection occurs at Delivered and sale recognition at Completed.
- Operational history is append-only and notifications are provider-neutral and failure-safe.

## Approved Rules

- The initial model uses one configurable provider-neutral courier/delivery partner and one shipment per order. Split shipment remains architecture-ready but deferred.
- Lifecycle: Ready for Dispatch → Courier Assigned → Picked Up → In Transit → Out for Delivery → Delivered. Exceptions are Delivery Failed, Delivery Cancelled, Lost, Damaged, and Returned.
- Pickup requires courier/handler, timestamp, shipment/reference ID, and handoff evidence. Customers see status and shipment reference when present; REYON never presents simulated real-time tracking.
- At most three delivery attempts are allowed initially. Each records timestamp, result, reason, and note. The third failed attempt moves the shipment to Delivery Failed for review/return handling.
- Delivered requires timestamp, receiver confirmation/name, and responsible courier/staff identity. Signature/photo proof is optional and architecture-ready.
- Address changes before pickup require revalidation and audit. After pickup they require exceptional Admin review and never silently modify shipment evidence.
- Failure, loss, and damage create append-only exceptions and never silently modify inventory. Courier-assignment cancellation is allowed before pickup; later changes use cancellation/return handling.
- COD collection is recorded at delivery and reconciled to the expected amount. Mismatches create an auditable exception. Completed remains the sole official sale-recognition event.
- Super Admin has full control; Admin has normal assignment, exception, and reconciliation control; Staff may perform operational delivery actions. Sensitive COD corrections require Admin or Super Admin.
- Customer/Admin delivery events use the provider-neutral notification outbox. No courier credential or integration is implied.

## Implementation Sequence

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
