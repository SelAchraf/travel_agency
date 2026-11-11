import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../lib/api.js";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table.js";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Input } from "../../components/ui/Input.js";
import { LanguageSwitcher } from "../../components/LanguageSwitcher.js";
import { formatDZD } from "@travel-agency/shared";
import {
  Compass,
  Calendar,
  Wallet,
  Users,
  FileText,
  Upload,
  Download,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  Phone,
  ShieldCheck,
} from "lucide-react";

interface ReservationDossier {
  reservation: {
    id: string;
    reference: string;
    offerSnapshot: {
      title: { ar: string; fr: string };
      destinationName: { ar: string; fr: string };
      departureDate: string;
      returnDate: string;
      durationDays: number;
      unitPriceCentimes: number;
      currency: string;
    };
    passengerCount: number;
    agreedTotalCentimes: number;
    discountCentimes: number;
    paidCentimes: number;
    balanceCentimes: number;
    currentStatus: string;
    statusHistory: Array<{ status: string; timestamp: string }>;
    specialRequirements?: string | null;
    createdAt: string;
  };
  travellers: Array<{
    id: string;
    fullName: string;
    dateOfBirth?: string | null;
    isPrimaryContact: boolean;
    roomAllocation?: string | null;
    hasPassport: boolean;
    passportExpiryDate?: string | null;
  }>;
  payments: Array<{
    id: string;
    receiptNumber: string;
    amountCentimes: number;
    currency: string;
    paymentDate: string;
    method: string;
  }>;
  documents: Array<{
    id: string;
    documentNumber: string;
    documentType: string;
    originalFilename: string;
    fileSizeBytes: number;
    mimeType: string;
    createdAt: string;
  }>;
}

interface PortalMessage {
  id: string;
  senderType: "customer" | "staff";
  senderName: string;
  subject?: string | null;
  message: string;
  createdAt: string;
}

export function PortalReservationPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [dossier, setDossier] = useState<ReservationDossier | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Document State
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docType, setDocType] = useState<"passport" | "national_id">("passport");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Message State
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchDossier = async (targetId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // If no ID provided in URL, fetch customer's primary reservation
      let reservationId = targetId || id;
      if (!reservationId) {
        const meRes = await apiClient<{ success: boolean; data: { customer: any; reservations: any[] } }>("/portal/me");
        if (meRes.success && meRes.data.reservations.length > 0) {
          reservationId = meRes.data.reservations[0].id;
        } else {
          setError("Aucun voyage réservé rattaché à ce dossier");
          setLoading(false);
          return;
        }
      }

      const res = await apiClient<{ success: boolean; data: ReservationDossier }>(
        `/portal/reservations/${reservationId}`
      );
      if (res.success && res.data) {
        setDossier(res.data);
      }

      // Fetch messages
      const msgRes = await apiClient<{ success: boolean; data: PortalMessage[] }>(
        `/portal/reservations/${reservationId}/messages`
      );
      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data);
      }
    } catch (err: any) {
      if (err.status === 401) {
        navigate("/portal");
      } else {
        setError(err.message || "Erreur de chargement du dossier");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier(id);
  }, [id]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload || !dossier) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("documentType", docType);

      const res = await apiClient<{ success: boolean; data: any }>(
        `/portal/reservations/${dossier.reservation.id}/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.success) {
        setUploadSuccess(t("portal.uploadSuccess"));
        setFileToUpload(null);
        fetchDossier(dossier.reservation.id);
      }
    } catch (err: any) {
      setUploadError(err.message || "Échec de l'envoi de la pièce");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDoc = async (documentId: string, filename: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
      const downloadUrl = `${API_BASE}/portal/documents/${documentId}/download`;

      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Échec du téléchargement");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || "Impossible de télécharger le document");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !dossier) return;

    setSendingMsg(true);
    try {
      const res = await apiClient<{ success: boolean; data: PortalMessage }>(
        `/portal/reservations/${dossier.reservation.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message: newMessage.trim() }),
        }
      );

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
      }
    } catch (err: any) {
      alert(err.message || "Échec de l'envoi du message");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("portalCustomerToken");
    document.cookie = "portalToken=; Max-Age=0; path=/";
    navigate("/portal");
  };

  const getLocalizedTitle = (titleObj?: { ar: string; fr: string } | null) => {
    if (!titleObj) return "";
    return isRtl ? titleObj.ar || titleObj.fr : titleObj.fr || titleObj.ar;
  };

  return (
    <div className="min-h-screen bg-sand-50 text-indigo-950 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-sand-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-white font-bold text-sm">
              NV
            </div>
            <div>
              <span className="font-bold text-sm text-indigo-950 block">Numidia Voyages</span>
              <span className="text-[11px] text-terracotta-600 font-medium">Espace Voyageur</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <a
              href="https://wa.me/213550123456"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Assistance</span>
            </a>

            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="text-xs text-sand-700 hover:text-indigo-950 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("common.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sand-600 font-medium text-sm">{t("common.loading")}</p>
          </div>
        ) : dossier ? (
          <>
            {/* Header / Trip Snapshot Card */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-white/10 text-amber-300 font-mono text-xs font-bold">
                      {dossier.reservation.reference}
                    </span>
                    <Badge variant={dossier.reservation.currentStatus === "confirmed" ? "success" : "warning"}>
                      {dossier.reservation.currentStatus}
                    </Badge>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {getLocalizedTitle(dossier.reservation.offerSnapshot?.title)}
                  </h1>
                  <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                    {getLocalizedTitle(dossier.reservation.offerSnapshot?.destinationName)} •{" "}
                    {dossier.reservation.offerSnapshot?.durationDays} jours
                  </p>
                </div>

                <div className="sm:text-right bg-white/10 p-3.5 rounded-xl backdrop-blur-sm sm:bg-transparent sm:p-0">
                  <p className="text-xs text-indigo-200 uppercase tracking-wider">{t("portal.dates")}</p>
                  <p className="text-sm font-semibold mt-0.5 font-mono">
                    {new Date(dossier.reservation.offerSnapshot?.departureDate).toLocaleDateString("fr-DZ")} →{" "}
                    {new Date(dossier.reservation.offerSnapshot?.returnDate).toLocaleDateString("fr-DZ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-sand-200">
                <p className="text-xs text-sand-500 uppercase tracking-wider">{t("portal.totalPrice")}</p>
                <p className="text-xl font-bold text-indigo-950 mt-1">
                  {formatDZD(dossier.reservation.agreedTotalCentimes, isRtl ? "ar" : "fr")}
                </p>
              </Card>

              <Card className="border-sand-200">
                <p className="text-xs text-sand-500 uppercase tracking-wider">{t("portal.paidAmount")}</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {formatDZD(dossier.reservation.paidCentimes, isRtl ? "ar" : "fr")}
                </p>
              </Card>

              <Card className={`border-2 ${dossier.reservation.balanceCentimes === 0 ? "border-emerald-500 bg-emerald-50/30" : "border-amber-400 bg-amber-50/30"}`}>
                <p className="text-xs text-sand-600 uppercase tracking-wider font-semibold">
                  {t("portal.balanceDue")}
                </p>
                <p className={`text-xl font-extrabold mt-1 ${dossier.reservation.balanceCentimes === 0 ? "text-emerald-800" : "text-amber-800"}`}>
                  {formatDZD(dossier.reservation.balanceCentimes, isRtl ? "ar" : "fr")}
                </p>
              </Card>
            </div>

            {/* Travellers & Documents Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Travellers List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    {t("portal.travellersList")} ({dossier.travellers.length})
                  </CardTitle>
                </CardHeader>
                <div className="divide-y divide-sand-100">
                  {dossier.travellers.map((traveller) => (
                    <div key={traveller.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-indigo-950">
                          {traveller.fullName}
                          {traveller.isPrimaryContact && (
                            <span className="text-[10px] text-terracotta-600 ml-1.5 font-normal">
                              ({t("departures.contactPerson")})
                            </span>
                          )}
                        </p>
                        <p className="text-sand-500 text-[11px] uppercase mt-0.5">
                          {traveller.roomAllocation || "Chambre standard"}
                        </p>
                      </div>

                      <Badge
                        variant={traveller.hasPassport ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {traveller.hasPassport
                          ? t("departures.passportUploaded")
                          : t("departures.passportMissing")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Documents Vault & Upload Dropzone */}
              <Card className="space-y-4">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-terracotta-600" />
                    {t("portal.documentsVault")}
                  </CardTitle>
                </CardHeader>

                {/* Downloadable Documents */}
                {dossier.documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">
                      {t("portal.downloadVouchers")} :
                    </p>
                    <div className="space-y-1.5">
                      {dossier.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 bg-sand-50 rounded-lg border border-sand-200 flex items-center justify-between text-xs"
                        >
                          <div className="truncate max-w-[220px]">
                            <p className="font-medium text-indigo-950 truncate">{doc.originalFilename}</p>
                            <span className="text-[10px] text-sand-500 uppercase">{doc.documentType}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDoc(doc.id, doc.originalFilename)}
                            className="h-7 px-2 text-indigo-900"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Passport Dropzone */}
                <form onSubmit={handleUploadSubmit} className="pt-2 border-t border-sand-100 space-y-3 text-xs">
                  <p className="font-semibold text-indigo-950">{t("portal.uploadPassports")}</p>

                  {uploadError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="h-8 rounded border border-sand-300 bg-white px-2 text-xs text-indigo-950"
                    >
                      <option value="passport">Passeport biométrique</option>
                      <option value="national_id">Carte Nationale d'Identité</option>
                    </select>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileToUpload(e.target.files[0]);
                          setUploadError(null);
                        }
                      }}
                      className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-sand-200 file:text-indigo-950 cursor-pointer"
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-sand-500">{t("portal.dropzoneHint")}</span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={uploading || !fileToUpload}
                      className="bg-indigo-900 hover:bg-indigo-950 text-white h-7 text-xs flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      {uploading ? t("common.loading") : "Déposer"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Questions & Advisor Chat Box */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-saffron-600" />
                  {t("portal.supportTitle")}
                </CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {/* Conversation Thread */}
                {messages.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto p-3 bg-sand-50/60 rounded-xl border border-sand-200 text-xs">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          m.senderType === "customer"
                            ? "bg-indigo-900 text-white ml-auto"
                            : "bg-white text-indigo-950 border border-sand-200 mr-auto"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1 opacity-80">
                          <span className="font-semibold">{m.senderName}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-sand-500 italic text-center py-4">
                    {t("portal.supportSubtitle")}
                  </p>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t("portal.messagePlaceholder")}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="text-xs h-9 flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={sendingMsg || !newMessage.trim()}
                    className="bg-indigo-900 hover:bg-indigo-950 text-white h-9 px-3 text-xs flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("portal.sendMessage")}</span>
                  </Button>
                </form>
              </div>
            </Card>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-sand-500 border-t border-sand-200">
        Numidia Voyages & Tourisme • Licence d'État N° 16/0423/AVT • Plateforme de Gestion Sécurisée
      </footer>
    </div>
  );
}
export default PortalReservationPage;

