import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Header } from "./components/common/Header.js";
import { Footer } from "./components/common/Footer.js";
import { StickyMobileBar } from "./components/common/StickyMobileBar.js";
import { BookingModal } from "./components/common/BookingModal.js";
import "./i18n/index.js";

// Route-level code splitting per performance requirements
const HomePage = React.lazy(() => import("./pages/HomePage.js").then((m) => ({ default: m.HomePage })));
const OffersPage = React.lazy(() => import("./pages/OffersPage.js").then((m) => ({ default: m.OffersPage })));
const OfferDetailPage = React.lazy(() => import("./pages/OfferDetailPage.js").then((m) => ({ default: m.OfferDetailPage })));
const DestinationsPage = React.lazy(() => import("./pages/DestinationsPage.js").then((m) => ({ default: m.DestinationsPage })));
const DestinationDetailPage = React.lazy(() => import("./pages/DestinationDetailPage.js").then((m) => ({ default: m.DestinationDetailPage })));
const ServicesPage = React.lazy(() => import("./pages/ServicesPage.js").then((m) => ({ default: m.ServicesPage })));
const AboutPage = React.lazy(() => import("./pages/AboutPage.js").then((m) => ({ default: m.AboutPage })));
const ContactPage = React.lazy(() => import("./pages/ContactPage.js").then((m) => ({ default: m.ContactPage })));
const FAQPage = React.lazy(() => import("./pages/FAQPage.js").then((m) => ({ default: m.FAQPage })));
const TermsPage = React.lazy(() => import("./pages/TermsPage.js").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage.js").then((m) => ({ default: m.PrivacyPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>();
  const [selectedOfferTitle, setSelectedOfferTitle] = useState<string | undefined>();
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string | undefined>();

  const handleOpenBooking = (offerId?: string, offerTitle?: string, departureDate?: string) => {
    setSelectedOfferId(offerId);
    setSelectedOfferTitle(offerTitle);
    setSelectedDepartureDate(departureDate);
    setBookingModalOpen(true);
  };

  return (
    <LazyMotion features={domAnimation}>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-sand-50 text-indigo-950 flex flex-col font-sans selection:bg-terracotta-500 selection:text-white">
          <Header onOpenBooking={() => handleOpenBooking()} />

          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage onOpenBooking={handleOpenBooking} />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route
                  path="/offers/:slug"
                  element={<OfferDetailPage onOpenBooking={handleOpenBooking} />}
                />
                <Route path="/destinations" element={<DestinationsPage />} />
                <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
                <Route
                  path="/services"
                  element={<ServicesPage onOpenBooking={() => handleOpenBooking()} />}
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <Footer />

          {/* Sticky Mobile Contact & Booking Action Bar */}
          <StickyMobileBar onOpenBooking={() => handleOpenBooking()} />

          {/* Global Booking & Lead Capture Modal */}
          <BookingModal
            isOpen={bookingModalOpen}
            onClose={() => setBookingModalOpen(false)}
            offerId={selectedOfferId}
            offerTitle={selectedOfferTitle}
            defaultDepartureDate={selectedDepartureDate}
          />
        </div>
      </BrowserRouter>
    </LazyMotion>
  );
}

export default App;

