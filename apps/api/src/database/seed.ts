import { db, connectDatabase, disconnectDatabase } from "./connection.js";
import { migrateDatabase } from "./migrate.js";
import {
  agency,
  destinations,
  travelOffers,
  departures,
  branches,
  users,
  customers,
  travellers,
  enquiries,
  enquiryActivities,
  reservations,
  reservationTravellers,
  payments,
  refunds,
  auditLogs,
  documents,
  customerMessages,
  notifications,
} from "./schema.js";
import { hashPassword } from "../utils/password.js";
import { logger } from "../utils/logger.js";

export async function seedDatabase() {
  logger.info("Beginning PostgreSQL database seeding with Algerian travel data...");

  // Ensure tables exist
  await migrateDatabase();

  // Clear existing demo data in reverse FK order
  await db.delete(notifications);
  await db.delete(customerMessages);
  await db.delete(documents);
  await db.delete(auditLogs);
  await db.delete(refunds);
  await db.delete(payments);
  await db.delete(reservationTravellers);
  await db.delete(reservations);
  await db.delete(enquiryActivities);
  await db.delete(enquiries);
  await db.delete(travellers);
  await db.delete(customers);
  await db.delete(departures);
  await db.delete(travelOffers);
  await db.delete(destinations);
  await db.delete(users);
  await db.delete(branches);
  await db.delete(agency);

  // 1. Seed Agency Profile
  const [createdAgency] = await db
    .insert(agency)
    .values({
      name: {
        ar: "وكالة نوميديا للأسفار والسياحة",
        fr: "Numidia Voyages & Tourisme",
      },
      licenceNumber: "AGV-2024-16-042",
      email: "contact@numidiavoyages.dz",
      phoneNumbers: ["+21321458920", "+213550123456"],
      whatsappNumber: "+213550123456",
      socialLinks: {
        facebook: "https://facebook.com/numidiavoyages.dz",
        instagram: "https://instagram.com/numidiavoyages",
      },
      branding: {
        primaryColor: "#0D233A", // Mediterranean Night Indigo
        accentColor: "#C85A32",  // Saharan Terracotta
        saffronColor: "#E09F3E", // Desert Saffron
      },
      settings: {
        currency: "DZD",
        defaultLanguage: "ar",
        supportedLanguages: ["ar", "fr"],
      },
    })
    .returning();

  logger.info(`Agency seeded: ${createdAgency?.name.fr}`);

  // 1b. Seed Physical Branches
  const [algerBranch, oranBranch] = await db
    .insert(branches)
    .values([
      {
        name: { ar: "فرع الجزائر العاصمة (المقر الرئيسي)", fr: "Siège Alger Centre" },
        wilayaCode: 16,
        address: {
          ar: "14 شارع ديدوش مراد، الجزائر الوسطى",
          fr: "14 Rue Didouche Mourad, Alger Centre",
        },
        phone: "+21321458920",
        email: "alger@numidiavoyages.dz",
        isHeadquarters: true,
        coordinates: { lat: 36.7699, lng: 3.0567 },
      },
      {
        name: { ar: "فرع وهران", fr: "Agence Oran Akid Lotfi" },
        wilayaCode: 31,
        address: {
          ar: "حي العقيد لطفي، وهران",
          fr: "Boulevard Akid Lotfi, Oran",
        },
        phone: "+21341238910",
        email: "oran@numidiavoyages.dz",
        isHeadquarters: false,
        coordinates: { lat: 35.7054, lng: -0.6318 },
      },
    ])
    .returning();

  if (!algerBranch || !oranBranch) {
    throw new Error("Failed to seed branches");
  }

  logger.info("Seeded 2 branches (Alger HQ & Oran)");

  // 1c. Seed Default Staff Accounts (Argon2id Hashed Passwords)
  const defaultPassword = "PasswordSecure2026!";
  const passwordHash = await hashPassword(defaultPassword);

  const [adminUser] = await db
    .insert(users)
    .values([
      {
        email: "admin@numidiavoyages.dz",
        passwordHash,
        fullName: "Kader Benali (Directeur Général)",
        phone: "+213550123456",
        role: "owner",
        branchId: algerBranch.id,
        isActive: true,
      },
      {
        email: "manager@numidiavoyages.dz",
        passwordHash,
        fullName: "Amina Mansouri (Directrice des Opérations)",
        phone: "+213550654321",
        role: "manager",
        branchId: algerBranch.id,
        isActive: true,
      },
      {
        email: "agent@numidiavoyages.dz",
        passwordHash,
        fullName: "Yacine Bouzid (Agent de Réservation)",
        phone: "+213551789012",
        role: "reservation_agent",
        branchId: algerBranch.id,
        isActive: true,
      },
      {
        email: "finance@numidiavoyages.dz",
        passwordHash,
        fullName: "Samia Khelifi (Responsable Financier)",
        phone: "+213552345678",
        role: "finance",
        branchId: algerBranch.id,
        isActive: true,
      },
      {
        email: "editor@numidiavoyages.dz",
        passwordHash,
        fullName: "Mehdi Larbi (Éditeur de Contenu)",
        phone: "+213553901234",
        role: "content_editor",
        branchId: oranBranch.id,
        isActive: true,
      },
    ])
    .returning();

  if (!adminUser) {
    throw new Error("Failed to seed admin user");
  }

  logger.info("Seeded 5 staff accounts across all RBAC roles with Argon2id");

  // Initial audit log entry
  await db.insert(auditLogs).values({
    userId: adminUser.id,
    userEmail: adminUser.email,
    action: "SYSTEM_SEED",
    entityType: "System",
    entityId: adminUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "DatabaseSeeder/1.0",
    diffSummary: { note: "Seeded initial agency, destinations, and 5 staff accounts" },
  });

  // 2. Seed Algerian Destinations
  const [djanet, timimoun, constantine, umrah] = await db
    .insert(destinations)
    .values([
      {
        slug: "djanet",
        name: { ar: "جانت وتادرارت الحمراء", fr: "Djanet & Tadrart Rouge" },
        category: "domestic",
        wilayaOrCountry: "Djanet",
        description: {
          ar: "سحر الصحراء الكبرى، جبال الرمال الحمراء، والرسومات والنقوش الصخرية القديمة في تادرارت.",
          fr: "Le joyau du Sahara algérien : dunes ocres de la Tadrart Rouge, canyons spectaculaires et peintures rupestres millénaires.",
        },
        coverImageUrl:
          "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
        isFeatured: true,
        isPublished: true,
      },
      {
        slug: "timimoun",
        name: { ar: "تيميمون الواحة الحمراء", fr: "Timimoun l'Oasis Rouge" },
        category: "domestic",
        wilayaOrCountry: "Timimoun",
        description: {
          ar: "عروس قورارة بهندستها الطينية الحمراء، بساتين النخيل، والغروب الأسطوري على الكثبان.",
          fr: "L'oasis rouge du Gourara aux constructions de terre cuite, palmeraies luxuriantes et couchers de soleil légendaires.",
        },
        coverImageUrl:
          "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
        isFeatured: true,
        isPublished: true,
      },
      {
        slug: "constantine",
        name: { ar: "قسنطينة مدينة الجسور المعلقة", fr: "Constantine Cité des Ponts" },
        category: "domestic",
        wilayaOrCountry: "Constantine",
        description: {
          ar: "حاضرة الشرق الجزائري العريقة، معلقة فوق صخرة وادي الرمال وجسورها التاريخية الخالدة.",
          fr: "Métropole d'histoire millénaire perchée sur les gorges sauvages du Rhummel et ses ponts suspendus vertigineux.",
        },
        coverImageUrl:
          "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=1200&q=80",
        isFeatured: true,
        isPublished: true,
      },
      {
        slug: "umrah",
        name: { ar: "العمرة إلى البقاع المقدسة", fr: "Omra aux Lieux Saints" },
        category: "religious",
        wilayaOrCountry: "Arabie Saoudite",
        description: {
          ar: "رحلات العمرة مع خدمات متميزة، إقامة في فنادق قريبة من الحرمين وتأطير ديني متواصل.",
          fr: "Pèlerinage spirituel avec hébergement hôtelier de prestige à proximité des Lieux Saints et encadrement expert.",
        },
        coverImageUrl:
          "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80",
        isFeatured: true,
        isPublished: true,
      },
    ])
    .returning();

  logger.info(`Seeded 4 destinations (Djanet, Timimoun, Constantine, Umrah)`);

  if (!djanet || !timimoun || !constantine || !umrah) {
    throw new Error("Failed to insert destinations");
  }

  // 3. Seed Realistic Travel Offers (Prices in integer centimes DZD: 1 DA = 100 centimes)
  const offers = await db
    .insert(travelOffers)
    .values([
      {
        slug: "expedition-djanet-tadrart-7-jours",
        title: {
          ar: "رحلة استكشاف جانت وتادرارت الحمراء (7 أيام / 6 ليالي)",
          fr: "Expédition Saharienne Djanet & Tadrart Rouge (7J / 6N)",
        },
        destinationId: djanet.id,
        tripType: "trekking",
        durationDays: 7,
        durationNights: 6,
        basePriceCentimes: 14500000, // 145 000 DA
        currency: "DZD",
        pricingBasis: "per_person",
        availabilityStatus: "available",
        hotelDetails: {
          ar: "مخيمات سياحية صحراوية مجهزة تحت النجوم وفي كهوف الطاسيلي",
          fr: "Bivouac saharien aménagé sous les étoiles et campements confort",
        },
        transportDetails: {
          ar: "مركبات رباعية الدفع 4x4 مجهزة ومكيفة مع سائقين مرشدين محليين",
          fr: "Véhicules 4x4 tout-terrain avec chauffeurs-guides touaregs expérimentés",
        },
        itinerary: [
          {
            dayNumber: 1,
            title: { ar: "الوصول إلى جانت والاستقبال", fr: "Arrivée à Djanet & Accueil" },
            description: {
              ar: "الاستقبال بمطار جانت والانتقال لتناول وجبة الشاي التقليدي والتوجه نحو الصحراء.",
              fr: "Accueil chaleureux à l'aéroport de Djanet, thé touareg et départ pour le grand sud.",
            },
          },
        ],
        inclusions: {
          ar: ["النقل بسيارات 4x4 طوال الرحلة", "الإطعام الكامل بنكهات تقليدية", "مرشد سياحي معتمد"],
          fr: [
            "Transport en 4x4 durant tout le circuit",
            "Pension complète avec cuisinier dédié",
            "Guide local touareg certifié",
          ],
        },
        exclusions: {
          ar: ["تذاكر الطيران (الجزائر - جانت - الجزائر)", "المصاريف الشخصية"],
          fr: ["Vols domestiques Alger-Djanet-Alger", "Dépenses personnelles et pourboires"],
        },
        isPublished: true,
      },
      {
        slug: "sejour-gourara-timimoun-5-jours",
        title: {
          ar: "إقامة ساحرة في قورارة وتيميمون (5 أيام / 4 ليالي)",
          fr: "Séjour Magique Oasis de Timimoun (5J / 4N)",
        },
        destinationId: timimoun.id,
        tripType: "guided_tour",
        durationDays: 5,
        durationNights: 4,
        basePriceCentimes: 8500000, // 85 000 DA
        currency: "DZD",
        pricingBasis: "per_person",
        availabilityStatus: "limited",
        hotelDetails: {
          ar: "إقامة في فندق قورارة التراثي المطل على واحة النخيل",
          fr: "Hôtel traditionnel du Gourara avec vue panoramique sur la palmeraie",
        },
        transportDetails: {
          ar: "حافلات سياحية حديثة ومكيفة للمجموعات",
          fr: "Minibus touristique grand confort climatisé",
        },
        itinerary: [
          {
            dayNumber: 1,
            title: { ar: "الوصول وجولة في قصر تيميمون القديم", fr: "Arrivée et visite du vieux Ksar" },
            description: {
              ar: "زيارة قصر تيميمون العتيق وسوق الحرف التقليدية والمربعات الطينية.",
              fr: "Découverte de l'architecture d'argile rouge et du marché artisanal.",
            },
          },
        ],
        inclusions: {
          ar: ["الإقامة في فندق 4 نجوم نصف إقامة", "جولات سياحية يومية"],
          fr: ["Hébergement en demi-pension", "Toutes les visites guidées"],
        },
        exclusions: {
          ar: ["وجبات الغداء", "تذكرة الطيران الداخلية"],
          fr: ["Déjeuners libres", "Billet d'avion Alger-Timimoun"],
        },
        isPublished: true,
      },
      {
        slug: "escapade-constantine-ponts-3-jours",
        title: {
          ar: "رحلة اكتشاف قسنطينة مدينة الجسور (3 أيام / ليلتان)",
          fr: "Escapade Culturelle Constantine Cité des Ponts (3J / 2N)",
        },
        destinationId: constantine.id,
        tripType: "guided_tour",
        durationDays: 3,
        durationNights: 2,
        basePriceCentimes: 4500000, // 45 000 DA
        currency: "DZD",
        pricingBasis: "per_person",
        availabilityStatus: "available",
        hotelDetails: {
          ar: "فندق أصيل في قلب المدينة القديمة المطل على وادي الرمال",
          fr: "Hôtel de charme au centre historique avec vue sur les gorges",
        },
        transportDetails: {
          ar: "نقل سياحي للمزارات وقصر الحاج أحمد باي",
          fr: "Transferts et visites guidées en véhicule privé",
        },
        itinerary: [
          {
            dayNumber: 1,
            title: { ar: "جولة الجسور المعلقة وقصر أحمد باي", fr: "Tour des Ponts & Palais Ahmed Bey" },
            description: {
              ar: "عبور جسر سيدي مسيد وجسر باب القنطرة وزيارة معالم قسنطينة العثمانية.",
              fr: "Traversée des ponts suspendus légendaires et visite du palais beylical.",
            },
          },
        ],
        inclusions: {
          ar: ["الإقامة مع الإفطار", "دليل سياحي مرافق", "رسوم المتاحف"],
          fr: ["Hébergement avec petit-déjeuner", "Guide conférencier", "Entrées aux monuments"],
        },
        exclusions: {
          ar: ["وجبات العشاء", "المصاريف الشخصية"],
          fr: ["Dîners libres", "Dépenses personnelles"],
        },
        isPublished: true,
      },
      {
        slug: "omra-confort-ramadan-15-jours",
        title: {
          ar: "عمرة الراحة والإيمان (15 يوماً - فنادق قريبة)",
          fr: "Omra Sérénité & Proximité (15 Jours)",
        },
        destinationId: umrah.id,
        tripType: "umrah",
        durationDays: 15,
        durationNights: 14,
        basePriceCentimes: 28500000, // 285 000 DA
        currency: "DZD",
        pricingBasis: "per_person",
        availabilityStatus: "available",
        hotelDetails: {
          ar: "فندق 5 نجوم مطل على ساحة الحرم المكي وفندق 4 نجوم بالمدينة المنورة",
          fr: "Hôtel 5 étoiles face au parvis à La Mecque et 4 étoiles à Médine",
        },
        transportDetails: {
          ar: "حافلات VIP حديثة للنقل بين المطار والفنادق والمزارات",
          fr: "Transferts VIP climatisés et train à grande vitesse",
        },
        itinerary: [
          {
            dayNumber: 1,
            title: { ar: "الانطلاق من الجزائر والوصول إلى جدة", fr: "Départ d'Alger & Arrivée à Djeddah" },
            description: {
              ar: "السفر على الخطوط الجوية الجزائرية، والاستقبال والتوجه إلى مكة المكرمة لأداء مناسك العمرة.",
              fr: "Vol direct Air Algérie, assistance personnalisée et transfert vers La Mecque.",
            },
          },
        ],
        inclusions: {
          ar: ["تأشيرة العمرة", "تذكرة الطيران ذهاباً وإياباً", "الفنادق مع الإفطار"],
          fr: ["Visa d'entrée", "Billet d'avion A/R direct", "Hôtels avec petit-déjeuner"],
        },
        exclusions: {
          ar: ["المصاريف الشخصية"],
          fr: ["Dépenses personnelles"],
        },
        isPublished: true,
      },
    ])
    .returning();

  logger.info(`Seeded ${offers.length} travel offers with DZD centimes pricing`);
  logger.info("PostgreSQL database seeding successfully completed!");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  connectDatabase()
    .then(seedDatabase)
    .then(disconnectDatabase)
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ msg: "Seeding failed", err });
      process.exit(1);
    });
}
