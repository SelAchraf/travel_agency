import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import { ALGERIAN_WILAYAS, type Wilaya } from "@travel-agency/shared";
import {
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  wilayaCode?: number | null;
  preferredLanguage: "ar" | "fr";
  internalNotes?: string | null;
  createdAt: string;
}

export function CustomersListPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wilayaFilter, setWilayaFilter] = useState<number | "">("");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [wilayaCode, setWilayaCode] = useState<number>(16); // Alger default
  const [preferredLanguage, setPreferredLanguage] = useState<"ar" | "fr">("fr");
  const [internalNotes, setInternalNotes] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Live duplicate warning in modal
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; customers: Customer[] }>("/admin/customers", {
        params: {
          search: search || undefined,
          wilayaCode: wilayaFilter || undefined,
          limit: 50,
        },
      });
      setCustomers(res.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, wilayaFilter]);

  // Real-time duplicate check when phone or email changes in creation form
  useEffect(() => {
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (trimmedPhone.length < 9 && !trimmedEmail) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await apiClient<{ success: boolean; duplicateFound: boolean; duplicates: any[] }>(
          "/admin/customers/duplicates",
          {
            params: {
              phone: trimmedPhone || undefined,
              email: trimmedEmail || undefined,
            },
          }
        );
        setDuplicateMatches(res.duplicates || []);
      } catch {
        setDuplicateMatches([]);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, email]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await apiClient<{ success: boolean; data: Customer }>("/admin/customers", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          wilayaCode: Number(wilayaCode),
          preferredLanguage,
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      setCreateModalOpen(false);
      setFullName("");
      setPhone("");
      setEmail("");
      setInternalNotes("");
      navigate(`/admin/customers/${res.data.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create customer");
    } finally {
      setCreateLoading(false);
    }
  };

  const getWilayaName = (code?: number | null) => {
    if (!code) return null;
    const w = ALGERIAN_WILAYAS.find((item: Wilaya) => item.code === code);
    return w ? (isRtl ? w.name.ar : w.name.fr) : `Wilaya ${code}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 font-serif">{t("customers.title")}</h1>
          <p className="text-sm text-sand-600 mt-1">{t("customers.subtitle")}</p>
        </div>
        {hasPermission("customers:write") && (
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>{t("customers.newCustomer")}</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className={`w-4 h-4 text-sand-400 absolute top-3 ${isRtl ? "left-3" : "right-3"}`} />
            <Input
              type="text"
              placeholder="Rechercher par nom, téléphone algérien (05/06/07), email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isRtl ? "pl-9" : "pr-9"}
            />
          </div>

          <div>
            <select
              value={wilayaFilter}
              onChange={(e) => setWilayaFilter(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="">Toutes les 58 wilayas</option>
              {ALGERIAN_WILAYAS.map((w: Wilaya) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {isRtl ? w.name.ar : w.name.fr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("customers.fullName")}</TableHead>
              <TableHead>{t("customers.phone")}</TableHead>
              <TableHead>{t("customers.email")}</TableHead>
              <TableHead>{t("customers.wilaya")}</TableHead>
              <TableHead>{t("customers.preferredLanguage")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sand-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-terracotta-500" />
                    <span>{t("common.loading")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sand-500">
                  Aucun client trouvé pour ces critères de recherche.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((cust) => (
                <TableRow key={cust.id} className="hover:bg-sand-50/60 transition-colors">
                  <TableCell>
                    <Link
                      to={`/admin/customers/${cust.id}`}
                      className="font-semibold text-indigo-950 hover:text-terracotta-600 flex items-center gap-1.5"
                    >
                      <span>{cust.fullName}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-indigo-900 font-medium">
                      {cust.phone}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-sand-600">
                      {cust.email || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {cust.wilayaCode ? (
                      <Badge variant="outline" className="text-xs">
                        {cust.wilayaCode} - {getWilayaName(cust.wilayaCode)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="uppercase text-[10px]">
                      {cust.preferredLanguage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-sand-500">
                    {new Date(cust.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/customers/${cust.id}`)}
                      className="text-xs"
                    >
                      Fiche client
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE CUSTOMER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("customers.newCustomer")}
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{createError}</span>
            </div>
          )}

          {/* Real-time Duplicate Detection Alert */}
          {duplicateMatches.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{t("customers.duplicateAlert")}</span>
              </div>
              <ul className="list-disc ps-5 space-y-1">
                {duplicateMatches.map((m) => (
                  <li key={m.id}>
                    <strong>{m.fullName}</strong> — {m.phone} ({m.email || "sans email"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("customers.fullName")} *
            </label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Mohamed Amine Brahimi"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.phone")} * (Format Algérie)
              </label>
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0550 12 34 56 ou +213661..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.email")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@gmail.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.wilaya")} *
              </label>
              <select
                value={wilayaCode}
                onChange={(e) => setWilayaCode(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                {ALGERIAN_WILAYAS.map((w: Wilaya) => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {isRtl ? w.name.ar : w.name.fr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.preferredLanguage")}
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as "ar" | "fr")}
                className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="fr">Français (FR)</option>
                <option value="ar">العربية (AR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("customers.internalNotes")}
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Habitudes de voyage, préférences d'hôtels, contacts famille..."
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CustomersListPage;

