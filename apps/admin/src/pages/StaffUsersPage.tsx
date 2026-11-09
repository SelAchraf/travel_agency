import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import { ROLES, ROLE_LABELS, type Role } from "@travel-agency/shared";
import {
  UserPlus,
  Search,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  branchId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export function StaffUsersPage() {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const isRtl = i18n.language === "ar";

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<Role>("reservation_agent");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Status Action State
  const [actionTargetUser, setActionTargetUser] = useState<StaffUser | null>(null);
  const [actionType, setActionType] = useState<"deactivate" | "reactivate" | "changeRole" | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<Role>("reservation_agent");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; users: StaffUser[] }>("/admin/users", {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
        },
      });
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error("Failed to load staff users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      await apiClient("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          phone: newPhone,
          role: newRole,
          password: newPassword,
        }),
      });

      setCreateModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      setCreateError(err?.message || "Échec de création de l'utilisateur.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionTargetUser || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === "deactivate") {
        await apiClient(`/admin/users/${actionTargetUser.id}/deactivate`, { method: "PATCH" });
      } else if (actionType === "reactivate") {
        await apiClient(`/admin/users/${actionTargetUser.id}/reactivate`, { method: "PATCH" });
      } else if (actionType === "changeRole") {
        await apiClient(`/admin/users/${actionTargetUser.id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role: selectedNewRole }),
        });
      }

      setActionTargetUser(null);
      setActionType(null);
      fetchUsers();
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case "owner":
        return "terracotta";
      case "manager":
        return "indigo";
      case "finance":
        return "saffron";
      case "reservation_agent":
        return "mint";
      case "content_editor":
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-indigo-950 font-display">
            {t("users.title")}
          </h1>
          <p className="text-sm text-sand-600 mt-1">
            {t("users.subtitle")}
          </p>
        </div>

        <Button
          variant="terracotta"
          onClick={() => setCreateModalOpen(true)}
          className="shadow-sm"
        >
          <UserPlus className="w-4 h-4 me-2" />
          {t("users.addUser")}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-sand-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-sand-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-9 pe-4 py-2 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-2 focus:ring-terracotta-500 bg-sand-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-sand-300 bg-sand-50/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500 w-full sm:w-auto text-indigo-950"
            >
              <option value="">Tous les rôles / جميع الأدوار</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]?.[isRtl ? "ar" : "fr"] || r}
                </option>
              ))}
            </select>

            <Button type="submit" variant="primary" size="md">
              <Search className="w-4 h-4 sm:hidden me-1" />
              Filtrer
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                fetchUsers();
              }}
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>

      {/* Staff Users Table */}
      <Card className="overflow-hidden border-sand-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sand-500">
            <div className="w-8 h-8 border-3 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {t("common.loading")}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sand-500">
            Aucun collaborateur trouvé.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.fullName")}</TableHead>
                <TableHead>{t("users.phone")}</TableHead>
                <TableHead>{t("users.role")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("users.lastLogin")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((staff) => {
                const isSelf = currentUser?.id === staff.id;
                const roleText = ROLE_LABELS[staff.role]?.[isRtl ? "ar" : "fr"] || staff.role;

                return (
                  <TableRow key={staff.id} className={!staff.isActive ? "opacity-60 bg-sand-50/50" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                          {staff.fullName}
                          {isSelf && (
                            <span className="text-[10px] bg-terracotta-100 text-terracotta-800 px-1.5 py-0.2 rounded font-medium">
                              (Vous)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-sand-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-sand-400" />
                          <span>{staff.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-sand-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-sand-400" />
                        <span dir="ltr">{staff.phone}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(staff.role)}>
                        <Shield className="w-3 h-3 me-1" />
                        {roleText}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {staff.isActive ? (
                        <Badge variant="mint">{t("common.active")}</Badge>
                      ) : (
                        <Badge variant="destructive">{t("common.inactive")}</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-sand-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sand-400" />
                        <span>
                          {staff.lastLoginAt
                            ? new Date(staff.lastLoginAt).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : t("users.never")}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSelf && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActionTargetUser(staff);
                                setSelectedNewRole(staff.role);
                                setActionType("changeRole");
                              }}
                              className="text-xs text-indigo-900 hover:bg-indigo-50"
                            >
                              {t("users.changeRole")}
                            </Button>

                            {staff.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionTargetUser(staff);
                                  setActionType("deactivate");
                                }}
                                className="text-xs text-red-600 hover:bg-red-50"
                                title={t("users.deactivate")}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionTargetUser(staff);
                                  setActionType("reactivate");
                                }}
                                className="text-xs text-emerald-600 hover:bg-emerald-50"
                                title={t("users.reactivate")}
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal: Create Staff User */}
      <Modal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title={t("users.createUserTitle")}
        description={t("users.createUserDesc")}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
          {createError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              {createError}
            </div>
          )}

          <Input
            label={t("users.fullName")}
            placeholder="ex: Yacine Benali"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            required
          />

          <Input
            type="email"
            label={t("auth.email")}
            placeholder="yacine@numidiavoyages.dz"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />

          <Input
            label={t("users.phone")}
            placeholder="0550 12 34 56"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-semibold text-indigo-950 mb-1.5 block">
              {t("users.role")}
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-sand-300 bg-sand-50/50 text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]?.[isRtl ? "ar" : "fr"] || r}
                </option>
              ))}
            </select>
          </div>

          <Input
            type="password"
            label={t("users.initialPassword")}
            placeholder="Au moins 10 caractères"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="terracotta"
              disabled={creating}
            >
              {creating ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Status Change or Role Update Confirmation */}
      <Modal
        open={!!actionTargetUser && !!actionType}
        onOpenChange={(open) => !open && setActionTargetUser(null)}
        title={
          actionType === "deactivate"
            ? t("users.deactivate")
            : actionType === "reactivate"
            ? t("users.reactivate")
            : t("users.changeRole")
        }
        description={actionTargetUser?.fullName || ""}
      >
        <div className="space-y-4 mt-2">
          {actionType === "deactivate" && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>{t("users.deactivateConfirm")}</div>
            </div>
          )}

          {actionType === "reactivate" && (
            <p className="text-sm text-sand-600">{t("users.reactivateConfirm")}</p>
          )}

          {actionType === "changeRole" && (
            <div>
              <label className="text-sm font-semibold text-indigo-950 mb-1.5 block">
                {t("users.role")}
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-sand-300 bg-sand-50/50 text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]?.[isRtl ? "ar" : "fr"] || r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionTargetUser(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant={actionType === "deactivate" ? "destructive" : "terracotta"}
              onClick={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
