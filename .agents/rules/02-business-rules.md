---
trigger: always_on
description: Money, reservation, payment and capacity business rules
---

# Financial and business rules (spec 3.4 to 3.6 and 8.2)

## Money

- Store money as integer centimes (or Decimal128) with explicit currency "DZD". NEVER JavaScript floats.
- Display consistently as "12 500 DA" in Arabic and French.
- Balance = agreed total - recorded payments (+/- explicit refunds and adjustments). Computed server-side only.

## Reservations

- A reservation stores a SNAPSHOT of the agreed price. Editing an offer never changes existing reservations.
- Unique human-readable reference (e.g. TRV-2026-000123) generated atomically with a sequence or counter table.
- Status values: Pending, Awaiting documents, Awaiting payment, Confirmed, Cancelled, Completed. Keep full status history; never silently overwrite.
- A reservation is not Confirmed until an authorized employee has checked the agency's conditions.
- Discounts require authorization and are audited.

## Enquiries

- An enquiry is NEVER automatically a confirmed booking. The public form states this clearly.
- Statuses: New, Contacted, Waiting for customer, Converted, Rejected, Closed. Keep a timestamped activity history.

## Payments

- Record date, amount, method, reference, and the employee who entered it. Methods are configurable (cash, bank transfer, others).
- Receipt generated for each payment. Overdue/incomplete balances flagged from due dates.
- Payments, reservations and refunds are never hard-deleted: use cancellation, reversal or archive records.

## Capacity

- Confirming a place checks the departure's capacity inside a PostgreSQL transaction (with row-level lock SELECT ... FOR UPDATE).
- Only a manager override may exceed capacity, and the override is audited.

## Reports

- Always distinguish cash received from booked sales.
- Financial reports restricted to authorized roles.
