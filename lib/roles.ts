import type { UserRole } from "@/lib/types/database";

const STAFF_ROLES: UserRole[] = ["owner", "admin", "trainer", "developer"];
const ADMIN_ROLES: UserRole[] = ["owner", "admin", "developer"];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isOwnerRole(role: UserRole): boolean {
  return role === "owner";
}
