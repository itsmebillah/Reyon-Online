# Fulfillment and Delivery Architecture

## Purpose

This document defines the boundary between commercial orders, physical or virtual fulfillment work, inventory movements, external delivery services, and customer-facing delivery information. It establishes durable evidence without inventing shipping or fulfillment policy.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Lifecycle evidence](#lifecycle-evidence)
- [Security and privacy](#security-and-privacy)
- [Domain boundaries](#domain-boundaries)
- [Approved Sprint 15 delivery configuration](#approved-sprint-15-delivery-configuration)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 6 creates empty identities for fulfillments, partial order-line assignments, append-only fulfillment transitions, and opaque delivery-provider references. It does not define fulfillment types, lifecycle states, eligible locations, allocation, picking, packing, carriers, shipping methods, addresses, fees, delivery areas, service levels, tracking behavior, proof of delivery, or customer notifications.

## Architecture

Orders remain the authority for commercial commitments and line snapshots. Fulfillment owns the work used to satisfy those commitments. Inventory owns stock movements. Operating topology owns location identity. External delivery providers remain integrations whose identifiers are recorded without making them systems of record for REYON's order history.

A single order may later produce multiple fulfillments, and a fulfillment may contain partial quantities from multiple order lines. The foundation stores that structure without deciding whether splitting, substitution, over-fulfillment, backorders, or cross-location fulfillment is permitted.

## Logical Data Model

| Record                 | Responsibility                                                    | Explicit boundary                                       |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Fulfillment            | Stable order-linked work identity and optional operating location | Defines no method, carrier, address, or current status  |
| Fulfillment line       | Positive quantity assigned from an order line                     | Does not validate allocation or inventory availability  |
| Fulfillment transition | Ordered and attributable append-only lifecycle evidence           | Defines no state vocabulary, permission, or side effect |
| Delivery reference     | Opaque external provider reference                                | Defines no tracking, SLA, or notification behavior      |

Migration `20260802070000_fulfillment_foundation.sql` creates these records in a private `fulfillment` schema. No reference or transactional data is inserted.

## Lifecycle Evidence

Transitions use stable but currently unconstrained state keys, sequence numbers, occurrence times, actor references, optional rule versions, and idempotency keys. Transition rows and external delivery references cannot be updated or deleted. Approved correction and reconciliation workflows must add attributable evidence.

No writable current-status field is stored. A future current-state projection must be derived from validated transition history after the Product Owner approves the lifecycle catalog.

## Security and Privacy

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, and the schema is not exposed through the configured Data API. Service-role access is restricted to trusted server-side adapters.

Customer names, phone numbers, addresses, delivery instructions, and proof artifacts are deliberately absent. Their classification, retention, masking, access, consent, and deletion requirements must be approved before storage design.

## Domain Boundaries

- Sales owns order commitment and ordered quantities.
- Fulfillment owns the work and lifecycle evidence used to satisfy an order.
- Inventory owns reservations and movements; fulfillment transitions cannot silently alter stock.
- Organization owns eligible location identities but not routing rules.
- Payments and accounting remain independent of delivery completion.
- Returns require a separate reverse-logistics lifecycle and do not mutate fulfillment history.

## Approved Sprint 15 Delivery Configuration

Sprint 15 begins with **Inside Dhaka** and **Outside Dhaka** delivery zones. Delivery zones and charges are business configuration managed through Admin, and the model must accept additional zones and prices without redesign. The applicable delivery charge is shown in the cart and order summary.

Checkout requires Full name, Phone, House No, Road, Village/City, Thana/Upazila, District, and Division. Flat No is optional where not applicable. Admin owns zone and charge configuration; application code must not hardcode prices. The calculated charge appears before confirmation.

## Approved Sprint 18 Operations

Sprint 18 uses one configurable provider-neutral courier partner and one shipment per order initially. Its lifecycle is Ready for Dispatch, Courier Assigned, Picked Up, In Transit, Out for Delivery, and Delivered, with Delivery Failed, Delivery Cancelled, Lost, Damaged, and Returned exceptions. Pickup requires attributable handoff evidence and a shipment reference. Delivery attempts and proof are append-only, customer status never claims unsupported real-time tracking, and split shipment remains a future-compatible extension.

Address corrections, inventory effects, COD reconciliation, permissions, and notification rules are governed by the [Sprint 18 Delivery Operations Decision Packet](30_DELIVERY_OPERATIONS_DECISION_PACKET.md).

## Pending Business Decisions

### TODO — Future Product Owner / Operations Owner

- Approve any split-shipment, additional-provider, signature/photo proof, or real-time courier integration expansion.

### TODO — Architecture / Security

- Define address and contact data classification and encryption requirements.
- Define carrier adapter contracts, retries, webhook verification, idempotency, and outage reconciliation.
- Define fulfillment-to-inventory commands only after both lifecycle and movement catalogs are approved.

## Future Expansion

Add approved assignments, waves, picking, packing, packages, labels, manifests, carrier bookings, tracking events, delivery attempts, service promises, proof artifacts, reverse logistics, exception queues, and operational dashboards. External integrations must remain replaceable adapters with durable internal evidence.

## Related Documents

- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Operating Topology Architecture](19_OPERATING_TOPOLOGY_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Sprint 18 Delivery Operations Decision Packet](30_DELIVERY_OPERATIONS_DECISION_PACKET.md)
