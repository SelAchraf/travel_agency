export const ROLES = [
  "owner",
  "manager",
  "reservation_agent",
  "finance",
  "content_editor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, { ar: string; fr: string }> = {
  owner: { ar: "مالك / مدير عام", fr: "Propriétaire / Administrateur" },
  manager: { ar: "مدير عمليات", fr: "Directeur d'agence / Manager" },
  reservation_agent: { ar: "عامل حجز", fr: "Agent de réservation" },
  finance: { ar: "مسؤول مالي", fr: "Responsable financier" },
  content_editor: { ar: "محرر محتوى", fr: "Éditeur de contenu" },
};
