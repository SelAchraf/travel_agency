import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Modal } from "../components/ui/Modal.js";
import {
  Inbox,
  Search,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Send,
  User,
  History,
} from "lucide-react";

interface EnquiryActivity {
  id: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  timestamp: string;
  userName?: string | null;
}

interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Enquiry {
  id: string;
  enquiryNumber: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  travellersCount: number;
  message?: string | null;
  source: string;
  status: "new" | "contacted" | "waiting_customer" | "converted" | "rejected" | "closed";
  offerTitle?: { ar: string; fr: string } | null;
  offerBasePriceCentimes?: number | null;
  assignedUser?: { id: string; fullName: string } | null;
  followUpDate?: string | null;
  createdAt: string;
  activities?: EnquiryActivity[];
}

export function EnquiriesListPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [newStatus, setNewStatus] = useState<Enquiry["status"]>("contacted");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignFollowUpDate, setAssignFollowUpDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Timeline & Details Modal State
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineEnquiry, setTimelineEnquiry] = useState<Enquiry | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await apiClient<{ success: boolean; users: StaffUser[] }>("/admin/users");
      setStaffUsers(res.users || []);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; enquiries: Enquiry[] }>("/admin/enquiries", {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          limit: 50,
        },
      });
      setEnquiries(res.enquiries || []);
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [search, statusFilter]);

  const openStatusModal = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setNewStatus(enquiry.status);
    setStatusNotes("");
    setStatusError(null);
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    setStatusLoading(true);
    setStatusError(null);

    try {
      await apiClient(`/admin/enquiries/${selectedEnquiry.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes.trim() || undefined,
        }),
      });

      setStatusModalOpen(false);
      fetchEnquiries();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const openAssignModal = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setAssignUserId(enquiry.assignedUser?.id || "");
    setAssignFollowUpDate(enquiry.followUpDate ? enquiry.followUpDate.split("T")[0] : "");
    setAssignNotes("");
    setAssignError(null);
    setAssignModalOpen(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !assignUserId) return;

    setAssignLoading(true);
    setAssignError(null);

    try {
      await apiClient(`/admin/enquiries/${selectedEnquiry.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedToUserId: assignUserId,
          followUpDate: assignFollowUpDate ? new Date(assignFollowUpDate).toISOString() : undefined,
          notes: assignNotes.trim() || undefined,
        }),
      });

      setAssignModalOpen(false);
      fetchEnquiries();
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign staff member");
    } finally {
      setAssignLoading(false);
    }
  };

  const openTimelineModal = async (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setTimelineModalOpen(true);
    setTimelineLoading(true);

    try {
      const res = await apiClient<{ success: boolean; data: Enquiry }>(`/admin/enquiries/${enquiry.id}`);
      setTimelineEnquiry(res.data);
    } catch (err) {
      console.error("Failed to load timeline:", err);
      setTimelineEnquiry(enquiry);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !newNote.trim()) return;

    setAddingNote(true);
    try {
      await apiClient(`/admin/enquiries/${selectedEnquiry.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ notes: newNote.trim() }),
      });

      setNewNote("");
      // Refresh timeline data
      const res = await apiClient<{ success: boolean; data: Enquiry }>(`/admin/enquiries/${selectedEnquiry.id}`);
      setTimelineEnquiry(res.data);
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusBadge = (status: Enquiry["status"]) => {
    switch (status) {
      case "new":
        return <Badge variant="warning">{t("enquiries.statusNew")}</Badge>;
      case "contacted":
        return <Badge variant="secondary">{t("enquiries.statusContacted")}</Badge>;
      case "waiting_customer":
        return <Badge variant="outline" className="text-amber-700 border-amber-300">{t("enquiries.statusWaitingCustomer")}</Badge>;
      case "converted":
        return <Badge variant="success">{t("enquiries.statusConverted")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("enquiries.statusRejected")}</Badge>;
      case "closed":
        return <Badge variant="outline">{t("enquiries.statusClosed")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-indigo-950 font-serif">{t("enquiries.title")}</h1>
        <p className="text-sm text-sand-600 mt-1">{t("enquiries.subtitle")}</p>
      </div>

      {/* Reminder disclaimer banner */}
      <div className="p-3 bg-sand-100/80 border border-sand-300 rounded-xl text-xs text-sand-700 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-terracotta-600 flex-shrink-0" />
        <span>{t("enquiries.disclaimerNotice")}</span>
      </div>

      {/* Filter and Status Tabs */}
      <Card className="p-4 space-y-4">
        {/* Status Quick Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-sand-200 pb-3">
          {[
            { key: "", label: "Toutes les demandes" },
            { key: "new", label: t("enquiries.statusNew") },
            { key: "contacted", label: t("enquiries.statusContacted") },
            { key: "waiting_customer", label: t("enquiries.statusWaitingCustomer") },
            { key: "converted", label: t("enquiries.statusConverted") },
            { key: "rejected", label: t("enquiries.statusRejected") },
            { key: "closed", label: t("enquiries.statusClosed") },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab.key
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "bg-sand-100 text-sand-700 hover:bg-sand-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`w-4 h-4 text-sand-400 absolute top-3 ${isRtl ? "left-3" : "right-3"}`} />
          <Input
            type="text"
            placeholder="Rechercher par référence ENQ, nom du client, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={isRtl ? "pl-9" : "pr-9"}
          />
        </div>
      </Card>

      {/* Enquiries Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("enquiries.enquiryNumber")}</TableHead>
              <TableHead>{t("enquiries.customer")}</TableHead>
              <TableHead>{t("enquiries.offer")}</TableHead>
              <TableHead>{t("enquiries.travellers")}</TableHead>
              <TableHead>{t("enquiries.assignedAgent")}</TableHead>
              <TableHead>{t("enquiries.status")}</TableHead>
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
            ) : enquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sand-500">
                  Aucune demande trouvée pour ces critères.
                </TableCell>
              </TableRow>
            ) : (
              enquiries.map((enq) => (
                <TableRow key={enq.id} className="hover:bg-sand-50/60 transition-colors">
                  <TableCell>
                    <div>
                      <span className="font-mono font-bold text-xs text-indigo-950 block">
                        {enq.enquiryNumber}
                      </span>
                      <span className="text-[11px] text-sand-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-xs text-indigo-950 block">
                        {enq.contactName}
                      </span>
                      <span className="font-mono text-[11px] text-sand-600 block">
                        {enq.contactPhone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-sand-700 font-medium">
                      {enq.offerTitle
                        ? isRtl
                          ? enq.offerTitle.ar
                          : enq.offerTitle.fr
                        : "Demande générale"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {enq.travellersCount} pers.
                  </TableCell>
                  <TableCell>
                    {enq.assignedUser ? (
                      <span className="text-xs text-indigo-950 font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-sand-400" />
                        {enq.assignedUser.fullName}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 italic">Non affecté</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(enq.status)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Timeline & Notes */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTimelineModal(enq)}
                        className="text-xs flex items-center gap-1"
                        title="Voir la chronologie et les notes"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Suivi</span>
                      </Button>

                      {/* Change Status */}
                      {hasPermission("enquiries:write") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStatusModal(enq)}
                          className="text-xs"
                          title={t("enquiries.changeStatus")}
                        >
                          Statut
                        </Button>
                      )}

                      {/* Assign Staff */}
                      {hasPermission("enquiries:assign") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openAssignModal(enq)}
                          className="text-xs"
                          title={t("enquiries.assignStaff")}
                        >
                          <UserCheck className="w-4 h-4 text-sand-500 hover:text-indigo-900" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CHANGE STATUS MODAL */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={t("enquiries.changeStatus")}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          {statusError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{statusError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              Nouveau statut *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="new">{t("enquiries.statusNew")}</option>
              <option value="contacted">{t("enquiries.statusContacted")}</option>
              <option value="waiting_customer">{t("enquiries.statusWaitingCustomer")}</option>
              <option value="converted">{t("enquiries.statusConverted")}</option>
              <option value="rejected">{t("enquiries.statusRejected")}</option>
              <option value="closed">{t("enquiries.statusClosed")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              Compte-rendu / Note explicative
            </label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Ex: Le client a confirmé son intérêt, devis transmis par WhatsApp..."
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setStatusModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={statusLoading}>
              {statusLoading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN STAFF MODAL */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={t("enquiries.assignStaff")}
      >
        <form onSubmit={handleAssign} className="space-y-4">
          {assignError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{assignError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              Conseiller / Agent de réservation *
            </label>
            <select
              required
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="">Sélectionner un collaborateur</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              {t("enquiries.followUp")}
            </label>
            <Input
              type="date"
              value={assignFollowUpDate}
              onChange={(e) => setAssignFollowUpDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sand-700 mb-1">
              Instructions pour l'agent
            </label>
            <textarea
              rows={2}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Ex: Contacter le client avant 16h pour confirmer les places disponibles..."
              className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={assignLoading}>
              {assignLoading ? t("common.loading") : "Affecter la demande"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* TIMELINE & NOTES MODAL */}
      <Modal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        title={`Historique & Suivi : ${timelineEnquiry?.enquiryNumber || ""}`}
      >
        <div className="space-y-6">
          {timelineLoading ? (
            <div className="py-8 text-center text-xs text-sand-500">
              <RefreshCw className="w-4 h-4 animate-spin text-terracotta-500 mx-auto mb-2" />
              <span>{t("common.loading")}</span>
            </div>
          ) : (
            <>
              {/* Message from customer */}
              {timelineEnquiry?.message && (
                <div className="p-3 bg-sand-50 rounded-xl border border-sand-200 text-xs text-indigo-950">
                  <span className="font-semibold block text-sand-600 mb-1">Message initial du client :</span>
                  <p className="italic">"{timelineEnquiry.message}"</p>
                </div>
              )}

              {/* Add Note Input */}
              {hasPermission("enquiries:write") && (
                <form onSubmit={handleAddNote} className="space-y-2">
                  <label className="block text-xs font-semibold text-sand-700">
                    {t("enquiries.addNote")}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      required
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={t("enquiries.notePlaceholder")}
                      className="text-xs"
                    />
                    <Button size="sm" type="submit" disabled={addingNote} className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* Timeline list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  {t("enquiries.timeline")}
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pe-1">
                  {timelineEnquiry?.activities && timelineEnquiry.activities.length > 0 ? (
                    timelineEnquiry.activities.map((act) => (
                      <div key={act.id} className="p-3 bg-white border border-sand-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-sand-500">
                          <span className="font-semibold text-indigo-950">
                            {act.userName || "Système"}
                          </span>
                          <span className="font-mono text-[10px]">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sand-700">{act.notes}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-sand-500 text-center py-4">Aucune activité enregistrée.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default EnquiriesListPage;

