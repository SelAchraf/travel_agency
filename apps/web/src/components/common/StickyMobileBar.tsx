import React from "react";
import { useTranslation } from "react-i18next";
import { Phone, MessageCircle, CalendarCheck } from "lucide-react";
import { Button } from "../ui/Button.js";

interface StickyMobileBarProps {
  onOpenBooking?: () => void;
  phone?: string;
  whatsapp?: string;
}

export function StickyMobileBar({
  onOpenBooking,
  phone = "021634578",
  whatsapp = "213550123456",
}: StickyMobileBarProps) {
  const { t, i18n } = useTranslation();
  const prefill = encodeURIComponent(t("common.whatsappPrefill"));
  const whatsappUrl = `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${prefill}`;

  return (
    <aside
      aria-label="Actions rapides mobiles"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sand-200 px-3 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Direct Call */}
        <a
          href={`tel:${phone}`}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl bg-sand-100 text-indigo-950 hover:bg-sand-200 text-xs font-semibold transition-colors"
          aria-label={t("common.callUs")}
        >
          <Phone className="w-4 h-4 text-terracotta-500 mb-0.5" />
          <span>{t("common.callUs")}</span>
        </a>

        {/* WhatsApp direct chat */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-colors"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600 mb-0.5" />
          <span>{t("common.whatsapp")}</span>
        </a>

        {/* Book / Request */}
        <Button
          variant="terracotta"
          size="sm"
          onClick={onOpenBooking}
          className="flex-1.5 py-2.5 px-3 text-xs font-bold shadow-sm"
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>{t("common.bookNow")}</span>
        </Button>
      </div>
    </aside>
  );
}

export default StickyMobileBar;

