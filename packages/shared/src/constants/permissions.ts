import { Role } from "./roles.js";

export const PERMISSIONS = [
  // Website & Content
  "website:read",
  "website:write",
  // Offers & Departures
  "offers:read",
  "offers:write",
  "offers:publish",
  "departures:capacity_override",
  // Customers & CRM
  "customers:read",
  "customers:write",
  "customers:export",
  // Enquiries
  "enquiries:read",
  "enquiries:write",
  "enquiries:assign",
  // Reservations
  "reservations:read",
  "reservations:write",
  "reservations:confirm",
  "reservations:discount",
  // Payments & Finance
  "payments:read",
  "payments:write",
  "payments:refund",
  // Reports
  "reports:operational",
  "reports:financial",
  // Documents
  "documents:read_sensitive",
  "documents:write",
  "documents:delete",
  // System Administration
  "users:manage",
  "audit:read",
  "agency:settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS, // Owner has all permissions

  manager: [
    "website:read",
    "website:write",
    "offers:read",
    "offers:write",
    "offers:publish",
    "departures:capacity_override",
    "customers:read",
    "customers:write",
    "enquiries:read",
    "enquiries:write",
    "enquiries:assign",
    "reservations:read",
    "reservations:write",
    "reservations:confirm",
    "reservations:discount",
    "payments:read",
    "payments:write",
    "payments:refund",
    "reports:operational",
    "reports:financial",
    "documents:read_sensitive",
    "documents:write",
    "documents:delete",
    "audit:read",
  ],

  reservation_agent: [
    "offers:read",
    "customers:read",
    "customers:write",
    "enquiries:read",
    "enquiries:write",
    "reservations:read",
    "reservations:write",
    "payments:read",
    "reports:operational",
    "documents:read_sensitive",
    "documents:write",
  ],

  finance: [
    "customers:read",
    "reservations:read",
    "payments:read",
    "payments:write",
    "payments:refund",
    "reports:financial",
    "documents:write",
  ],

  content_editor: [
    "website:read",
    "website:write",
    "offers:read",
    "offers:write",
    "documents:write",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}
