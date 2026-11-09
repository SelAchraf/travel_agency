import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@travel-agency/shared";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Badge } from "../components/ui/Badge.js";
import { Card, CardHeader, CardTitle } from "../components/ui/Card.js";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/Table.js";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "../components/ui/Modal.js";
import { ToastProvider, Toast, ToastViewport } from "../components/ui/Toast.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import {
  Compass,
  Phone,
  User,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export const DesignSystemShowcase: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language.startsWith("ar") ? "ar" : "fr") as "ar" | "fr";

  const [toastOpen, setToastOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState(false);

  const sampleTrips = [
    {
      ref: "TRV-2026-000101",
      destination: locale === "ar" ? "جانت وتادرارت الحمراء" : "Djanet & Tadrart Rouge",
      customer: locale === "ar" ? "أمين معوش" : "Amine Maouche",
      phone: "+213550123456",
      seats: 2,
      priceCentimes: 29000000, // 290 000 DA
      status: "confirmed" as const,
      date: "15/12/2026",
    },
    {
      ref: "TRV-2026-000102",
      destination: locale === "ar" ? "تيميمون الواحة الحمراء" : "Timimoun l'Oasis Rouge",
      customer: locale === "ar" ? "سارة بلحاج" : "Sarah Belhadj",
      phone: "+213661987654",
      seats: 4,
      priceCentimes: 34000000, // 340 000 DA
      status: "pending" as const,
      date: "28/12/2026",
    },
    {
      ref: "TRV-2026-000103",
      destination: locale === "ar" ? "عمرة الراحة والإيمان" : "Omra Sérénité & Proximité",
      customer: locale === "ar" ? "الحاج محمد طاهري" : "El Hadj Mohamed Taheri",
      phone: "+213770451234",
      seats: 2,
      priceCentimes: 57000000, // 570 000 DA
      status: "available" as const,
      date: "10/01/2027",
    },
    {
      ref: "TRV-2026-000104",
      destination: locale === "ar" ? "قسنطينة مدينة الجسور" : "Constantine Cité des Ponts",
      customer: locale === "ar" ? "ياسمين زروقي" : "Yasmine Zerrouki",
      phone: "+213541223344",
      seats: 1,
      priceCentimes: 4500000, // 45 000 DA
      status: "limited" as const,
      date: "05/02/2027",
    },
  ];

  return (
    <ToastProvider swipeDirection="right">
      <div className="min-h-screen bg-sand-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Top Bar / Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-900">
                <Compass className="h-6 w-6 text-terracotta-500" />
                <h1 className="text-2xl font-bold tracking-tight">{t("designSystem.title")}</h1>
              </div>
              <p className="text-sm text-sand-500">{t("designSystem.subtitle")}</p>
            </div>
            <div className="flex items-center gap-4 self-start md:self-auto">
              <LanguageSwitcher />
            </div>
          </header>

          {/* Palette Tokens */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-saffron-500" />
              <h2 className="text-lg font-bold text-indigo-950">
                {locale === "ar"
                  ? "لوحة الألوان الصحراوية والمتوسطية"
                  : "Palette Saharienne & Méditerranéenne"}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-indigo-900 text-white space-y-1 shadow-sm">
                <p className="text-xs font-mono opacity-80">#0D233A</p>
                <p className="text-sm font-semibold">
                  {locale === "ar" ? "نيلي متوسطي" : "Indigo Nuit"}
                </p>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Primary</span>
              </div>
              <div className="p-4 rounded-xl bg-terracotta-500 text-white space-y-1 shadow-sm">
                <p className="text-xs font-mono opacity-80">#C85A32</p>
                <p className="text-sm font-semibold">
                  {locale === "ar" ? "تراكوتا الطاسيلي" : "Tassili Ocre"}
                </p>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Accent</span>
              </div>
              <div className="p-4 rounded-xl bg-saffron-500 text-indigo-950 space-y-1 shadow-sm">
                <p className="text-xs font-mono opacity-80">#E09F3E</p>
                <p className="text-sm font-semibold">
                  {locale === "ar" ? "زعفران صحراوي" : "Safran Doré"}
                </p>
                <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded">Highlight</span>
              </div>
              <div className="p-4 rounded-xl bg-mint-500 text-white space-y-1 shadow-sm">
                <p className="text-xs font-mono opacity-80">#2A9D8F</p>
                <p className="text-sm font-semibold">
                  {locale === "ar" ? "ساحل تيبازة" : "Mer & Oasis"}
                </p>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Secondary</span>
              </div>
              <div className="p-4 rounded-xl bg-sand-200 text-indigo-950 space-y-1 border border-sand-300">
                <p className="text-xs font-mono opacity-80">#E6DFD5</p>
                <p className="text-sm font-semibold">
                  {locale === "ar" ? "رمل الصحراء" : "Sable Chaud"}
                </p>
                <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded">Background</span>
              </div>
            </div>
          </section>

          {/* Section: Buttons */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">{t("designSystem.buttons")}</h2>
            <Card className="flex flex-wrap items-center gap-3">
              <Button variant="primary">{t("designSystem.primary")}</Button>
              <Button variant="terracotta">{t("designSystem.terracotta")}</Button>
              <Button variant="saffron">{t("designSystem.saffron")}</Button>
              <Button variant="outline">{t("designSystem.outline")}</Button>
              <Button variant="ghost">{t("designSystem.ghost")}</Button>
              <Button variant="destructive">{t("designSystem.destructive")}</Button>
              <Button
                variant="primary"
                isLoading={loadingBtn}
                onClick={() => {
                  setLoadingBtn(true);
                  setTimeout(() => setLoadingBtn(false), 2000);
                }}
              >
                {loadingBtn
                  ? t("designSystem.loading")
                  : locale === "ar"
                    ? "اختبار التحميل"
                    : "Tester le chargement"}
              </Button>
            </Card>
          </section>

          {/* Section: Badges */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">{t("designSystem.badges")}</h2>
            <Card className="flex flex-wrap items-center gap-3">
              <Badge variant="available">{locale === "ar" ? "أماكن متوفرة" : "Disponible"}</Badge>
              <Badge variant="limited">
                {locale === "ar" ? "أماكن محدودة" : "Places limitées"}
              </Badge>
              <Badge variant="sold_out">{locale === "ar" ? "مكتملة بالكامل" : "Complet"}</Badge>
              <Badge variant="pending">{locale === "ar" ? "قيد الانتظار" : "En attente"}</Badge>
              <Badge variant="confirmed">{locale === "ar" ? "مؤكدة" : "Confirmée"}</Badge>
              <Badge variant="cancelled">{locale === "ar" ? "ملغاة" : "Annulée"}</Badge>
              <Badge variant="completed">{locale === "ar" ? "مكتملة" : "Terminée"}</Badge>
              <Badge variant="neutral">{locale === "ar" ? "مسودة" : "Brouillon"}</Badge>
            </Card>
          </section>

          {/* Section: Inputs */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">{t("designSystem.inputs")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <Input
                  label={t("designSystem.demoInputLabel")}
                  placeholder={t("designSystem.demoInputPlaceholder")}
                  startIcon={<User className="h-4 w-4" />}
                  defaultValue={locale === "ar" ? "سليم بن عيسى" : "Salim Benissa"}
                />
              </Card>
              <Card>
                <Input
                  label={t("designSystem.demoPhoneLabel")}
                  placeholder={t("designSystem.demoPhonePlaceholder")}
                  startIcon={<Phone className="h-4 w-4" />}
                  defaultValue="0550 12 34 56"
                  helperText={locale === "ar" ? "رقم جوال جزائري صالح" : "Format national algérien"}
                />
              </Card>
              <Card>
                <Input
                  label={t("designSystem.demoAmountLabel")}
                  placeholder={t("designSystem.demoAmountPlaceholder")}
                  startIcon={<CreditCard className="h-4 w-4" />}
                  defaultValue={formatDZD(1250000, locale)}
                />
              </Card>
            </div>
          </section>

          {/* Section: Metric Cards */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">{t("designSystem.cards")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card hover>
                <CardHeader>
                  <CardTitle className="text-sm text-sand-500 font-medium">
                    {locale === "ar"
                      ? "الحجوزات المؤكدة هذا الشهر"
                      : "Réservations confirmées (ce mois)"}
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-terracotta-500" />
                </CardHeader>
                <div className="text-2xl font-bold text-indigo-950">48</div>
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  {locale === "ar"
                    ? "+14% مقارنة بالشهر السابق"
                    : "+14% par rapport au mois dernier"}
                </p>
              </Card>

              <Card hover>
                <CardHeader>
                  <CardTitle className="text-sm text-sand-500 font-medium">
                    {locale === "ar"
                      ? "المداخيل المستلمة (صندوق)"
                      : "Encaissements perçus (Caisse)"}
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <div className="text-2xl font-bold text-indigo-950">
                  {formatDZD(645000000, locale)}
                </div>
                <p className="text-xs text-sand-500 mt-1">
                  {locale === "ar"
                    ? "مجموع المبالغ المحصلة فعلياً"
                    : "Montant total encaissé en DZD"}
                </p>
              </Card>

              <Card hover>
                <CardHeader>
                  <CardTitle className="text-sm text-sand-500 font-medium">
                    {locale === "ar" ? "الطلبات الواردة غير المعالجة" : "Demandes reçues à traiter"}
                  </CardTitle>
                  <Layers className="h-4 w-4 text-saffron-500" />
                </CardHeader>
                <div className="text-2xl font-bold text-indigo-950">12</div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {locale === "ar"
                    ? "تحتاج متابعة هاتفية اليوم"
                    : "Nécessitent un suivi aujourd'hui"}
                </p>
              </Card>
            </div>
          </section>

          {/* Section: Data Table */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">{t("designSystem.table")}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "ar" ? "الرقم المرجعي" : "Réf. Réservation"}</TableHead>
                  <TableHead>
                    {locale === "ar" ? "الوجهة / الرحلة" : "Destination / Circuit"}
                  </TableHead>
                  <TableHead>{locale === "ar" ? "الزبون" : "Client"}</TableHead>
                  <TableHead>{locale === "ar" ? "المقاعد" : "Places"}</TableHead>
                  <TableHead>{locale === "ar" ? "السعر المتفق عليه" : "Prix Convenu"}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{locale === "ar" ? "تاريخ الرحلة" : "Départ"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleTrips.map((row) => (
                  <TableRow key={row.ref}>
                    <TableCell className="font-mono text-xs font-semibold text-indigo-900">
                      {row.ref}
                    </TableCell>
                    <TableCell className="font-medium">{row.destination}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{row.customer}</div>
                        <div className="text-xs text-sand-400 font-mono">{row.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.seats}</TableCell>
                    <TableCell className="font-semibold text-indigo-950">
                      {formatDZD(row.priceCentimes, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status}>
                        {row.status === "confirmed"
                          ? locale === "ar"
                            ? "مؤكدة"
                            : "Confirmée"
                          : row.status === "pending"
                            ? locale === "ar"
                              ? "قيد المعالجة"
                              : "En attente"
                            : row.status === "available"
                              ? locale === "ar"
                                ? "متوفرة"
                                : "Disponible"
                              : locale === "ar"
                                ? "محدودة"
                                : "Limitée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-sand-500 font-medium">{row.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* Section: Modals & Toasts */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">
              {locale === "ar"
                ? "المربعات الحوارية والتنبيهات (Radix)"
                : "Dialogues & Notifications (Radix)"}
            </h2>
            <Card className="flex flex-wrap items-center gap-4">
              {/* Modal Component */}
              <Modal open={modalOpen} onOpenChange={setModalOpen}>
                <ModalTrigger asChild>
                  <Button variant="terracotta">{t("designSystem.openModal")}</Button>
                </ModalTrigger>
                <ModalContent>
                  <ModalHeader>
                    <ModalTitle>{t("designSystem.modalTitle")}</ModalTitle>
                    <ModalDescription>{t("designSystem.modalDescription")}</ModalDescription>
                  </ModalHeader>
                  <div className="py-4 space-y-3 border-y border-sand-100 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-sand-500">
                        {locale === "ar" ? "الوجهة" : "Destination"}:
                      </span>
                      <span className="font-semibold">
                        {locale === "ar" ? "جانت وتادرارت الحمراء" : "Djanet & Tadrart"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-sand-500">
                        {locale === "ar" ? "عدد المقاعد المطلوبة" : "Places demandées"}:
                      </span>
                      <span className="font-semibold">
                        2 {locale === "ar" ? "مقاعد" : "places"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-sand-500">
                        {locale === "ar" ? "المبلغ الإجمالي" : "Total convenu"}:
                      </span>
                      <span className="font-bold text-indigo-900">
                        {formatDZD(29000000, locale)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setModalOpen(false);
                        setToastOpen(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 me-1.5" />
                      {locale === "ar" ? "تأكيد الحجز الآن" : "Confirmer le dossier"}
                    </Button>
                  </div>
                </ModalContent>
              </Modal>

              {/* Toast Trigger */}
              <Button variant="outline" onClick={() => setToastOpen(true)}>
                {t("designSystem.triggerToast")}
              </Button>
            </Card>
          </section>
        </div>

        {/* Global Toast */}
        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          title={locale === "ar" ? "تم تسجيل العملية بنجاح" : "Opération validée"}
          description={t("designSystem.toastSuccess")}
          variant="success"
        />
        <ToastViewport />
      </div>
    </ToastProvider>
  );
};
