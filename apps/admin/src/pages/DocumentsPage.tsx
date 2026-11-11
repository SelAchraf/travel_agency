import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/api.js";
import { Card } from "../components/ui/Card.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Modal } from "../components/ui/Modal.js";
import { DOCUMENT_TYPES, type DocumentType } from "@travel-agency/shared";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Lock,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileCheck,
  ShieldAlert,
  User,
  Clock,
} from "lucide-react";

interface VaultDocument {
  id: string;
  documentNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  reservationId?: string | null;
  reservationReference?: string | null;
  travellerId?: string | null;
  documentType: DocumentType;
  originalFilename: string;
  storageFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSha256: string;
  isPrivate: boolean;
  uploadedByUserId?: string | null;
  uploaderName?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const isRtl = i18n.language === "ar";

  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Form Fields
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("passport");
  const [customerId, setCustomerId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<VaultDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (selectedType) params.documentType = selectedType;

      const res = await apiClient<{ success: boolean; data: VaultDocument[] }>("/admin/documents", {
        params,
      });
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError("Veuillez sélectionner un fichier");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("documentType", docType);
      formData.append("isPrivate", String(isPrivate));
      if (customerId.trim()) formData.append("customerId", customerId.trim());
      if (reservationId.trim()) formData.append("reservationId", reservationId.trim());
      if (expiryDate) formData.append("expiryDate", expiryDate);
      if (notes.trim()) formData.append("notes", notes.trim());

      const res = await apiClient<{ success: boolean; data: VaultDocument }>("/admin/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.success) {
        setUploadSuccess(t("documents.uploadSuccess"));
        setFileToUpload(null);
        setCustomerId("");
        setReservationId("");
        setExpiryDate("");
        setNotes("");
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploadSuccess(null);
          fetchDocuments();
        }, 1200);
      }
    } catch (err: any) {
      setUploadError(err.message || "Échec de l'envoi du document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: VaultDocument) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
      const downloadUrl = `${API_BASE}/admin/documents/${doc.id}/download`;

      // Fetch blob with credentials
      const response = await fetch(downloadUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Échec du téléchargement");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || "Impossible de télécharger le document");
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await apiClient(`/admin/documents/${docToDelete.id}`, {
        method: "DELETE",
      });
      setDeleteModalOpen(false);
      setDocToDelete(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredDocs = documents.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.documentNumber.toLowerCase().includes(q) ||
      doc.originalFilename.toLowerCase().includes(q) ||
      (doc.customerName && doc.customerName.toLowerCase().includes(q)) ||
      (doc.reservationReference && doc.reservationReference.toLowerCase().includes(q)) ||
      (doc.notes && doc.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
            <Lock className="w-7 h-7 text-indigo-700" />
            {t("documents.title")}
          </h1>
          <p className="text-sand-600 text-sm mt-1">{t("documents.subtitle")}</p>
        </div>

        {hasPermission("documents:write") && (
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-900 hover:bg-indigo-950 text-white shadow-sm"
          >
            <Upload className="w-4 h-4" />
            {t("documents.uploadButton")}
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-sand-400 absolute top-3 left-3 pointer-events-none" />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs text-indigo-950 focus:border-terracotta-500 focus:outline-none"
            >
              <option value="">{t("documents.type")} (Tous)</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sand-600 text-sm font-medium">{t("common.loading")}</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-sand-300 mx-auto mb-3" />
            <p className="text-sand-600 text-sm">{t("documents.emptyList")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-sand-50/70">
                <TableHead>{t("documents.documentNumber")}</TableHead>
                <TableHead>{t("documents.type")}</TableHead>
                <TableHead>{t("documents.filename")}</TableHead>
                <TableHead>{t("documents.customer")}</TableHead>
                <TableHead>{t("documents.reservation")}</TableHead>
                <TableHead>{t("documents.size")}</TableHead>
                <TableHead>{t("documents.uploadedBy")}</TableHead>
                <TableHead>{t("documents.expiryDate")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

                return (
                  <TableRow key={doc.id} className="hover:bg-sand-50/50">
                    <TableCell className="font-mono text-xs font-semibold text-indigo-950">
                      {doc.documentNumber}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {doc.documentType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="max-w-[200px] truncate" title={doc.originalFilename}>
                        <p className="text-xs font-medium text-indigo-950 truncate">{doc.originalFilename}</p>
                        <p className="text-[10px] text-sand-500 font-mono">{doc.mimeType}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-indigo-950">
                      {doc.customerName || "-"}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-indigo-900">
                      {doc.reservationReference || "-"}
                    </TableCell>

                    <TableCell className="text-xs text-sand-600 font-mono">
                      {formatFileSize(doc.fileSizeBytes)}
                    </TableCell>

                    <TableCell className="text-xs text-sand-600">
                      <p className="truncate max-w-[120px]">{doc.uploaderName || "-"}</p>
                      <p className="text-[10px] text-sand-400">
                        {new Date(doc.createdAt).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                      </p>
                    </TableCell>

                    <TableCell className="text-xs">
                      {doc.expiryDate ? (
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                            isExpired ? "text-rose-600 font-bold" : "text-sand-600"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.expiryDate).toLocaleDateString(isRtl ? "ar-DZ" : "fr-DZ")}
                          {isExpired && " (!)"}
                        </span>
                      ) : (
                        <span className="text-sand-400">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                          className="h-7 px-2 text-indigo-900 hover:text-indigo-950"
                          title={t("documents.download")}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>

                        {hasPermission("documents:delete") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDocToDelete(doc);
                              setDeleteModalOpen(true);
                            }}
                            className="h-7 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={t("documents.uploadModalTitle")}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* File Picker & Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-indigo-950 mb-1.5">
              {t("documents.filename")} *
            </label>
            <div className="border-2 border-dashed border-sand-300 rounded-xl p-4 text-center hover:border-terracotta-400 bg-sand-50/50 cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-8 h-8 text-sand-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-indigo-950">
                {fileToUpload ? fileToUpload.name : t("documents.fileDropzone")}
              </p>
              <p className="text-[11px] text-sand-500 mt-1">{t("documents.fileHint")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-indigo-950 mb-1">
                {t("documents.type")} *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full h-9 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs text-indigo-950 focus:border-terracotta-500 focus:outline-none"
                required
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-950 mb-1">
                {t("documents.expiryDate")}
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-indigo-950 mb-1">
                ID Client (UUID optionnel)
              </label>
              <Input
                type="text"
                placeholder="Ex: c0e4b850-..."
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-950 mb-1">
                ID Réservation (UUID optionnel)
              </label>
              <Input
                type="text"
                placeholder="Ex: d1f7c920-..."
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-950 mb-1">
              {t("documents.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-sand-300 p-2.5 text-xs text-indigo-950 focus:border-terracotta-500 focus:outline-none"
              placeholder="Remarques éventuelles sur la pièce..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-sand-300 text-indigo-900 focus:ring-indigo-800"
            />
            <label htmlFor="isPrivate" className="text-xs text-indigo-950 font-medium cursor-pointer">
              {t("documents.privateBadge")}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={uploading || !fileToUpload}
              className="bg-indigo-900 hover:bg-indigo-950 text-white"
            >
              {uploading ? t("common.loading") : t("documents.uploadButton")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t("documents.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-sand-700">{t("documents.deleteConfirmMessage")}</p>
          {docToDelete && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 font-mono">
              <p>N°: {docToDelete.documentNumber}</p>
              <p>Fichier: {docToDelete.originalFilename}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? t("common.loading") : t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default DocumentsPage;
