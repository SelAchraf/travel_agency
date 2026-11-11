import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, ArrowUpRight, Compass, Sparkles } from "lucide-react";

interface MapPinData {
  id: string;
  name: { ar: string; fr: string };
  region: { ar: string; fr: string };
  x: number; // percentage in SVG viewBox
  y: number;
  slug: string;
  category: "sahara" | "coastal" | "cultural" | "oasis";
  photo: string;
  description: {
    ar: string;
    fr: string;
  };
}

const DESTINATION_PINS: MapPinData[] = [
  {
    id: "algiers",
    name: { ar: "الجزائر العاصمة", fr: "Alger la Blanche" },
    region: { ar: "الساحل الأوسط", fr: "Littoral Centre" },
    x: 52,
    y: 11,
    slug: "alger",
    category: "coastal",
    photo: "https://images.unsplash.com/photo-1579606032822-e2d6fa5c26b8?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "قصبة الجزائر التاريخية، الواجهة البحرية الساحرة، وبوابة الاستكشاف.",
      fr: "Casbah millénaire classée à l'UNESCO, front de mer et coeur battant du pays.",
    },
  },
  {
    id: "tipaza",
    name: { ar: "تيبازة الرومانية", fr: "Tipaza" },
    region: { ar: "الساحل الغربي", fr: "Côte Romaine" },
    x: 48,
    y: 12,
    slug: "tipaza",
    category: "cultural",
    photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "آثار فينيقية ورومانية تتعانق مع مياه البحر الأبيض المتوسط.",
      fr: "Ruines antiques plongeant dans les flots azur de la Méditerranée.",
    },
  },
  {
    id: "oran",
    name: { ar: "وهران الباهية", fr: "Oran" },
    region: { ar: "الغرب الجزائري", fr: "L'Ouest Radieux" },
    x: 35,
    y: 16,
    slug: "oran",
    category: "coastal",
    photo: "https://images.unsplash.com/photo-1589802829985-817e51171b92?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "عاصمة الراي، قلعة سانتا كروز، وكورنيش عين الترك الساحر.",
      fr: "Fort de Santa Cruz, corniche oranaise et douceur de vivre méditerranéenne.",
    },
  },
  {
    id: "constantine",
    name: { ar: "قسنطينة (سيرتا)", fr: "Constantine" },
    region: { ar: "الشرق الجزائري", fr: "Ville des Ponts" },
    x: 68,
    y: 14,
    slug: "constantine",
    category: "cultural",
    photo: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "مدينة الجسور المعلقة المعلقة فوق وادي الرمال السحيق والتاريخ العريق.",
      fr: "Les célèbres ponts suspendus enjambant les gorges vertigineuses du Rhummel.",
    },
  },
  {
    id: "ghardaia",
    name: { ar: "غرداية (وادي ميزاب)", fr: "Ghardaïa & Vallée du M'Zab" },
    region: { ar: "بوابة الصحراء", fr: "Porte du Désert" },
    x: 52,
    y: 32,
    slug: "ghardaia",
    category: "oasis",
    photo: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "العمارة الفريدة لقصور ميزاب، أسواق التوابل التقليدية وصناعة الزرابي.",
      fr: "Architecture pentapole millénaire inscrite à l'UNESCO, ksour et marchés d'artisanat.",
    },
  },
  {
    id: "timimoun",
    name: { ar: "تيميمون (الواحة الحمراء)", fr: "Timimoun (L'Oasis Rouge)" },
    region: { ar: "إقليم قورارة", fr: "Oasis du Gourara" },
    x: 38,
    y: 44,
    slug: "timimoun",
    category: "sahara",
    photo: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "كثبان العرق الغربي الكبير، قصبات الطين الأحمر، ونظام الفقارات المائي.",
      fr: "Ksar en terre rouge, mer de dunes du Grand Erg Occidental et palmeraies.",
    },
  },
  {
    id: "taghit",
    name: { ar: "تاغيث والساورة", fr: "Taghit (L'Enchanteresse)" },
    region: { ar: "وادي الساورة", fr: "Vallée de la Saoura" },
    x: 24,
    y: 36,
    slug: "taghit",
    category: "sahara",
    photo: "https://images.unsplash.com/photo-1473580044384-7ba9967a16a0?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "عروس الساورة، الكثيب الرملي العملاق، والنقوش الصخرية التي تعود لآلاف السنين.",
      fr: "Dune géante dominant la palmeraie luxuriante et gravures rupestres néolithiques.",
    },
  },
  {
    id: "djanet",
    name: { ar: "جانت وتادرارت الحمراء", fr: "Djanet & Tadrart Rouge" },
    region: { ar: "طاسيلي ناجر", fr: "Tassili n'Ajjer" },
    x: 74,
    y: 74,
    slug: "djanet",
    category: "sahara",
    photo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "سحر الرمال الحمراء، وادي إهرير، صخرة الفيل، والنقوش العالمية الأسطورية.",
      fr: "Canyons lunaires de la Tadrart, dunes pourpres, et fresques rupestres fabuleuses.",
    },
  },
  {
    id: "tamanrasset",
    name: { ar: "تمنراست والأسكرام", fr: "Tamanrasset & Assekrem" },
    region: { ar: "جبال الهقار", fr: "Massif du Hoggar" },
    x: 58,
    y: 78,
    slug: "tamanrasset",
    category: "sahara",
    photo: "https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=600&q=80",
    description: {
      ar: "قمة الأسكرام وأجمل شروق وغروب شمس في العالم بين أعمدة البازلت البركانية.",
      fr: "Plateau de l'Assekrem, ermitage du Père de Foucauld et pitons volcaniques.",
    },
  },
];

export function AlgeriaMap() {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [activePin, setActivePin] = useState<MapPinData>(DESTINATION_PINS[7]); // Djanet default

  return (
    <div className="relative bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-sand-50 overflow-hidden shadow-2xl border border-indigo-800">
      {/* Decorative Saharan Background Gradients */}
      <div className="absolute top-0 end-0 w-96 h-96 bg-terracotta-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-96 h-96 bg-saffron-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-indigo-800/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-500/10 border border-saffron-500/20 text-saffron-400 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>{t("home.interactiveMapTitle")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-sand-50">
            {isRtl ? "وجهات لا مثيل لها عبر ربوع الجزائر" : "Territoires d'Aventure & d'Histoire"}
          </h2>
          <p className="text-xs sm:text-sm text-sand-300 mt-1 max-w-xl">
            {t("home.interactiveMapSubtitle")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-sand-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
            <span>{isRtl ? "الصحراء الكبرى" : "Sahara & Bivouacs"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-saffron-500" />
            <span>{isRtl ? "الواحات والقصور" : "Oasis & Ksour"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-mint-500" />
            <span>{isRtl ? "السواحل والآثار" : "Littoral & Villes d'Histoire"}</span>
          </span>
        </div>
      </div>

      {/* Main Map + Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* SVG Map (7 cols) */}
        <div className="lg:col-span-7 relative flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-[540px] aspect-[1/1.1]">
            <svg
              viewBox="0 0 100 110"
              className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
              aria-label="Carte interactive de l'Algérie"
            >
              {/* Simplified Geometric Stylized Outline of Algeria */}
              <defs>
                <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E3A5F" />
                  <stop offset="50%" stopColor="#132B47" />
                  <stop offset="100%" stopColor="#0B1C30" />
                </linearGradient>
                <linearGradient id="borderGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E09F3E" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#C85A32" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Stylized contour of Algeria */}
              <path
                d="M 32 17 
                   C 36 15, 45 10, 52 10 
                   C 58 10, 68 13, 76 13 
                   C 80 18, 76 25, 78 33 
                   C 76 43, 79 55, 84 66 
                   C 86 75, 82 86, 78 92 
                   C 70 98, 55 102, 50 100 
                   C 42 98, 32 94, 25 84 
                   C 20 74, 18 64, 16 52 
                   C 14 42, 20 32, 24 24 
                   Z"
                fill="url(#mapGradient)"
                stroke="url(#borderGlow)"
                strokeWidth="0.8"
                className="transition-colors duration-500"
              />

              {/* Mediterranean Sea waves indicator on top */}
              <path
                d="M 30 7 Q 45 4, 60 7 T 80 7"
                fill="none"
                stroke="#2A9D8F"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <text x="52" y="5" textAnchor="middle" fill="#2A9D8F" fontSize="2.8" opacity="0.8" fontWeight="600">
                {isRtl ? "البحر الأبيض المتوسط" : "Mer Méditerranée"}
              </text>

              {/* Sahara Label in the south */}
              <text x="50" y="58" textAnchor="middle" fill="#FAF8F5" fontSize="4.2" opacity="0.08" fontWeight="900" letterSpacing="0.2em">
                {isRtl ? "الصحراء الكبرى" : "LE SAHARA"}
              </text>

              {/* Pins */}
              {DESTINATION_PINS.map((pin) => {
                const isSelected = activePin.id === pin.id;
                const pinColor =
                  pin.category === "sahara"
                    ? "#C85A32" // terracotta
                    : pin.category === "oasis"
                    ? "#E09F3E" // saffron
                    : "#2A9D8F"; // mint

                return (
                  <g
                    key={pin.id}
                    className="cursor-pointer group focus:outline-none"
                    onClick={() => setActivePin(pin)}
                    onMouseEnter={() => setActivePin(pin)}
                    role="button"
                    tabIndex={0}
                    aria-label={isRtl ? pin.name.ar : pin.name.fr}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setActivePin(pin);
                    }}
                  >
                    {/* Pulsing halo on selected pin */}
                    {isSelected && (
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r="5"
                        fill={pinColor}
                        opacity="0.25"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer ring */}
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={isSelected ? "3.2" : "2"}
                      fill={pinColor}
                      stroke="#FAF8F5"
                      strokeWidth={isSelected ? "0.8" : "0.5"}
                      className="transition-all duration-300 group-hover:scale-125"
                    />

                    {/* Inner core */}
                    <circle cx={pin.x} cy={pin.y} r="1" fill="#FAF8F5" />

                    {/* Label */}
                    <text
                      x={pin.x + 3.5}
                      y={pin.y + 1}
                      fill="#FAF8F5"
                      fontSize={isSelected ? "3" : "2.4"}
                      fontWeight={isSelected ? "700" : "500"}
                      className="transition-all duration-300 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      {isRtl ? pin.name.ar.split(" ")[0] : pin.name.fr.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Destination Card Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-indigo-950/80 backdrop-blur-md rounded-2xl p-6 border border-indigo-800 shadow-xl space-y-4">
            <div className="relative h-48 w-full rounded-xl overflow-hidden group">
              <img
                src={activePin.photo}
                alt={isRtl ? activePin.name.ar : activePin.name.fr}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                width={600}
                height={350}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/20 to-transparent" />
              <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-xs font-semibold text-saffron-400 border border-saffron-500/30">
                  {isRtl ? activePin.region.ar : activePin.region.fr}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-sand-200 bg-indigo-950/80 px-2 py-0.5 rounded">
                  <MapPin className="w-3 h-3 text-terracotta-500" />
                  <span>Algérie</span>
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-sand-50 font-display">
                {isRtl ? activePin.name.ar : activePin.name.fr}
              </h3>
              <p className="text-xs sm:text-sm text-sand-300 mt-2 leading-relaxed">
                {isRtl ? activePin.description.ar : activePin.description.fr}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-indigo-800/80">
              <Link
                to={`/offers?destination=${activePin.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron-400 hover:text-saffron-300 transition-colors"
              >
                <span>{isRtl ? "استكشف برامج هذه المنطقة" : "Voir les voyages programmés"}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <Link
                to={`/destinations/${activePin.slug}`}
                className="text-xs text-sand-300 hover:text-white underline underline-offset-4"
              >
                {isRtl ? "دليل الوجهة" : "Guide complet"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlgeriaMap;

