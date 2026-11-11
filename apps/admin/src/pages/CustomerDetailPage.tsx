import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import { ALGERIAN_WILAYAS, type Wilaya, formatDZD } from "@travel-agency/shared";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  User,
  Shield,
  Calendar,
  Plus,
  ExternalLink,
  MessageSquare,
  FileText,
  AlertCircle,
  RefreshCw,
  Globe,
  Copy,
  Check,
  Key,
} from "lucide-react";

interface Traveller {
  id: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: "M" | "F" | null;
  passportNumberEncrypted?: string | null;
  passportExpiryDate?: string | null;
  nationality: string;
  specialRequirements?: string | null;
  createdAt: string;
}

interface LinkedEnquiry {
  id: string;
  enquiryNumber: string;
  status: string;
  travellersCount: number;
  createdAt: string;
}

interface LinkedReservation {
  id: string;
  reference: string;
  currentStatus: string;
  agreedTotalCentimes: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  wilayaCode?: number | null;
  preferredLanguage: "ar" | "fr";
  internalNotes?: string | null;
  createdAt: string;
  travellers: Traveller[];
  enquiries: LinkedEnquiry[];
  reservations: LinkedReservation[];
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Traveller Modal State
  const [travellerModalOpen, setTravellerModalOpen] = useState(false);
  const [travellerName, setTravellerName] = useState("");
  const [travellerDob, setTravellerDob] = useState("");
  const [travellerGender, setTravellerGender] = useState<"M" | "F">("M");
  const [travellerPassport, setTravellerPassport] = useState("");
  const [travellerPassportExpiry, setTravellerPassportExpiry] = useState("");
  const [travellerNationality, setTravellerNationality] = useState("DZ");
  const [travellerSpecialReqs, setTravellerSpecialReqs] = useState("");
  const [travellerLoading, setTravellerLoading] = useState(false);
  const [travellerError, setTravellerError] = useState<string | null>(null);

  // Portal Link Modal State
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [portalLink, setPortalLink] = useState("");
  const [portalGenerating, setPortalGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePortalLink = async () => {
    if (!id) return;
    try {
      setPortalGenerating(true);
      const res = await apiClient<{ success: boolean; data: { rawToken: string; expiresAt: string } }>(
        `/admin/customers/${id}/portal-link`,
        { method: "POST", body: JSON.stringify({ expiresInDays: 30 }) }
      );
      const link = `${window.location.origin}/portal?token=${res.data.rawToken}`;
      setPortalLink(link);
      setPortalModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Impossible de générer le lien de l'espace client");
    } finally {
      setPortalGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchCustomer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; data: CustomerDetail }>(`/admin/customers/${id}`);
      setCustomer(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleAddTraveller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setTravellerLoading(true);
    setTravellerError(null);

    try {
      const res = await apiClient<{ success: boolean; data: Traveller }>(`/admin/customers/${id}/travellers`, {
        method: "POST",
        body: JSON.stringify({
          fullName: travellerName.trim(),
          dateOfBirth: travellerDob || undefined,
          gender: travellerGender,
          passportNumber: travellerPassport.trim() || undefined,
          passportExpiryDate: travellerPassportExpiry || undefined,
          nationality: travellerNationality.toUpperCase().trim() || "DZ",
          specialRequirements: travellerSpecialReqs.trim() || undefined,
        }),
      });

      setCustomer((prev) =>
        prev ? { ...prev, travellers: [...prev.travellers, res.data] } : prev
      );

      setTravellerModalOpen(false);
      // Reset form
      setTravellerName("");
      setTravellerDob("");
      setTravellerPassport("");
      setTravellerPassportExpiry("");
      setTravellerSpecialReqs("");
    } catch (err: any) {
      setTravellerError(err.message || "Failed to add traveller");
    } finally {
      setTravellerLoading(false);
    }
  };

  const getWilayaName = (code?: number | null) => {
    if (!code) return null;
    const w = ALGERIAN_WILAYAS.find((item: Wilaya) => item.code === code);
    return w ? (isRtl ? w.name.ar : w.name.fr) : `Wilaya ${code}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sand-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-terracotta-500" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-indigo-950">Client introuvable</h2>
        <p className="text-sm text-sand-600">{error}</p>
        <Button onClick={() => navigate("/admin/customers")}>Retour au CRM</Button>
      </div>
    );
  }

  const cleanDigits = customer.phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanDigits}`;

  return (
    <div className="space-y-6">
      {/* Back button and Page Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/admin/customers")}
          className="flex items-center gap-1.5 text-sm text-sand-600 hover:text-indigo-950 transition-colors font-medium"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>Retour à la liste des clients</span>
        </button>
      </div>

      {/* Customer Header Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-sand-50 flex items-center justify-center font-bold text-xl shadow-md">
              <User className="w-7 h-7 text-saffron-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-indigo-950 font-serif">{customer.fullName}</h1>
                <Badge variant="outline" className="uppercase text-[10px]">
                  Langue : {customer.preferredLanguage}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-sand-600">
                <span className="flex items-center gap-1.5 font-mono font-medium text-indigo-900">
                  <Phone className="w-4 h-4 text-terracotta-500" />
                  <span>{customer.phone}</span>
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-sand-400" />
                    <span>{customer.email}</span>
                  </span>
                )}
                {customer.wilayaCode && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-sand-400" />
                    <span>{customer.wilayaCode} - {getWilayaName(customer.wilayaCode)}</span>
                  </span>
                )}
              </div>

              {customer.internalNotes && (
                <div className="mt-3 p-3 bg-sand-50 rounded-lg border border-sand-200 text-xs text-sand-700 italic">
                  "{customer.internalNotes}"
                </div>
              )}
            </div>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sand-100 hover:bg-sand-200 text-indigo-950 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-900" />
              <span>Appeler</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
            {hasPermission("customers:write") && (
              <button
                type="button"
                onClick={handleGeneratePortalLink}
                disabled={portalGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200 transition-colors"
                title="Générer un lien magique d'accès direct au portail client"
              >
                <Key className="w-3.5 h-3.5 text-indigo-700" />
                <span>{portalGenerating ? "Génération..." : "Espace Client"}</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* LINKED TRAVELLERS REGISTRY SECTION */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
              <Shield className="w-4 h-4 text-terracotta-600" />
              <span>{t("customers.travellers")} ({customer.travellers.length})</span>
            </h3>
            <p className="text-xs text-sand-500 mt-0.5">
              Registre des passeports et pièces d'identité pour les réservations (chiffré conformément aux règles de sécurité).
            </p>
          </div>
          {hasPermission("customers:write") && (
            <Button
              size="sm"
              onClick={() => setTravellerModalOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("customers.addTraveller")}</span>
            </Button>
          )}
        </div>

        {customer.travellers.length === 0 ? (
          <div className="text-center py-8 bg-sand-50/50 rounded-xl border border-sand-200">
            <p className="text-xs text-sand-500">Aucun voyageur rattaché à ce dossier client pour le moment.</p>
          </div>
        ) : (
          <div className="border border-sand-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customers.fullName")}</TableHead>
                  <TableHead>{t("customers.gender")}</TableHead>
                  <TableHead>{t("customers.dateOfBirth")}</TableHead>
                  <TableHead>{t("customers.nationality")}</TableHead>
                  <TableHead>{t("customers.passportNumber")}</TableHead>
                  <TableHead>{t("customers.passportExpiry")}</TableHead>
                  <TableHead>{t("customers.specialReqs")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.travellers.map((trav) => (
                  <TableRow key={trav.id}>
                    <TableCell className="font-semibold text-xs text-indigo-950">
                      {trav.fullName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {trav.gender === "M" ? "Homme" : trav.gender === "F" ? "Femme" : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {trav.dateOfBirth ? new Date(trav.dateOfBirth).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {trav.nationality}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-indigo-900">
                      {trav.passportNumberEncrypted ? trav.passportNumberEncrypted : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {trav.passportExpiryDate ? new Date(trav.passportExpiryDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-sand-600 italic">
                      {trav.specialRequirements || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* LINKED ENQUIRIES AND RESERVATIONS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linked Enquiries */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-saffron-600" />
            <span>{t("customers.linkedEnquiries")} ({customer.enquiries.length})</span>
          </h3>

          {customer.enquiries.length === 0 ? (
            <p className="text-xs text-sand-500 py-4 text-center">Aucune demande enregistrée.</p>
          ) : (
            <div className="divide-y divide-sand-200">
              {customer.enquiries.map((enq) => (
                <div key={enq.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-950 block">{enq.enquiryNumber}</span>
                    <span className="text-sand-500">{new Date(enq.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sand-600">{enq.travellersCount} voy.</span>
                    <Badge variant="secondary" className="text-[10px]">{enq.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Linked Reservations */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
            <FileText className="w-4 h-4 text-terracotta-600" />
            <span>{t("customers.linkedReservations")} ({customer.reservations.length})</span>
          </h3>

          {customer.reservations.length === 0 ? (
            <p className="text-xs text-sand-500 py-4 text-center">Aucune réservation pour ce client.</p>
          ) : (
            <div className="divide-y divide-sand-200">
              {customer.reservations.map((res) => (
                <div key={res.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-950 block">{res.reference}</span>
                    <span className="text-sand-500">{new Date(res.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-terracotta-600">
                      {formatDZD(res.agreedTotalCentimes, isRtl ? "ar" : "fr")}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{res.currentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ADD TRAVELLER MODAL */}
      <Modal
        isOpen={travellerModalOpen}
        onClose={() => setTravellerModalOpen(false)}
        title={t("customers.addTraveller")}
      >
        <form onSubmit={handleAddTraveller} className="space-y-4">
          {travellerError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{travellerError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("customers.fullName")} * (Tel qu'écrit sur le passeport)
            </label>
            <Input
              required
              value={travellerName}
              onChange={(e) => setTravellerName(e.target.value)}
              placeholder="Ex: Amina Mansouri"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.gender")} *
              </label>
              <select
                value={travellerGender}
                onChange={(e) => setTravellerGender(e.target.value as "M" | "F")}
                className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
              >
                <option value="M">Homme (M)</option>
                <option value="F">Femme (F)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.dateOfBirth")}
              </label>
              <Input
                type="date"
                value={travellerDob}
                onChange={(e) => setTravellerDob(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.passportNumber")} (Chiffré)
              </label>
              <Input
                value={travellerPassport}
                onChange={(e) => setTravellerPassport(e.target.value)}
                placeholder="Ex: 231456789"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1">
                {t("customers.passportExpiry")}
              </label>
              <Input
                type="date"
                value={travellerPassportExpiry}
                onChange={(e) => setTravellerPassportExpiry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("customers.specialReqs")}
            </label>
            <textarea
              rows={2}
              value={travellerSpecialReqs}
              onChange={(e) => setTravellerSpecialReqs(e.target.value)}
              placeholder="Ex: Repas sans sel, fauteuil roulant pour assistance aéroport..."
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setTravellerModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={travellerLoading}>
              {travellerLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER PORTAL MAGIC LINK MODAL */}
      <Modal
        isOpen={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Lien Sécurisé - Portail Client"
        description="Ce lien magique permet au client d'accéder directement à son dossier de réservation, téléverser ses documents et suivre ses paiements sans mot de passe."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-sand-50 rounded-lg border border-sand-200">
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              Lien magique (valide 30 jours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={portalLink}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-sand-300 rounded-lg text-indigo-950 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 me-1" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 me-1" />
                    Copier
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href={`https://wa.me/${customer?.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Bonjour ${customer?.fullName},\nVoici l'accès direct et sécurisé à votre espace client pour consulter votre voyage et déposer vos documents :\n${portalLink}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Envoyer par WhatsApp
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={() => setPortalModalOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CustomerDetailPage;

