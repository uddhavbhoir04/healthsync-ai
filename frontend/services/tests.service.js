/**
 * HealthSync AI - Lab Tests & Diagnostic Packages Service
 * Provides realistic medical catalog data with filtering, search, and sorting.
 * Ready for drop-in backend catalog endpoints when available.
 */

export const LAB_CATEGORIES = [
  "All Categories",
  "Cardiovascular",
  "Comprehensive Wellness",
  "Diabetes & Metabolic",
  "Thyroid Function",
  "Liver & Kidney",
  "Women's Health",
  "Vitamins & Immunity",
];

export const LAB_PROVIDERS = [
  "All Providers",
  "HealthSync Central Labs",
  "Quest Diagnostics Partner",
  "Apex Clinical Laboratories",
  "BioMetrix Diagnostics",
];

export const DEMO_LAB_TESTS = [
  {
    id: "LT-101",
    name: "Comprehensive Metabolic Panel (CMP)",
    category: "Liver & Kidney",
    provider: "HealthSync Central Labs",
    price: 49,
    originalPrice: 85,
    sampleType: "Blood Sample",
    fastingRequired: "10-12 hours fasting required",
    turnaroundTime: "Same Day (12-24 hrs)",
    description: "Evaluates kidney status, liver enzymes, electrolytes, blood sugar balance, and acid-base equilibrium.",
    parametersCovered: 14,
    rating: 4.9,
    reviewsCount: 324,
    popular: true,
    badge: "Most Booked",
  },
  {
    id: "LT-102",
    name: "Advanced Lipid & Cardiovascular Profile",
    category: "Cardiovascular",
    provider: "Apex Clinical Laboratories",
    price: 65,
    originalPrice: 110,
    sampleType: "Blood Sample",
    fastingRequired: "12 hours fasting required",
    turnaroundTime: "24 Hours",
    description: "Measures Total Cholesterol, HDL, LDL, VLDL, Triglycerides, and ApoB risk score for heart health.",
    parametersCovered: 8,
    rating: 4.8,
    reviewsCount: 210,
    popular: true,
    badge: "Heart Care",
  },
  {
    id: "LT-103",
    name: "HbA1c Glycated Hemoglobin Test",
    category: "Diabetes & Metabolic",
    provider: "Quest Diagnostics Partner",
    price: 35,
    originalPrice: 55,
    sampleType: "Blood Sample",
    fastingRequired: "No fasting required",
    turnaroundTime: "Within 6-12 hrs",
    description: "Gold standard diagnostic for 3-month blood glucose monitoring and early prediabetes detection.",
    parametersCovered: 3,
    rating: 4.9,
    reviewsCount: 512,
    popular: true,
    badge: "Essential",
  },
  {
    id: "LT-104",
    name: "Complete Thyroid Spectrum (TSH, Free T3, Free T4)",
    category: "Thyroid Function",
    provider: "HealthSync Central Labs",
    price: 59,
    originalPrice: 90,
    sampleType: "Blood Sample",
    fastingRequired: "Morning collection recommended",
    turnaroundTime: "24 Hours",
    description: "Accurate assessment of thyroid hormone activity, metabolism control, and pituitary signaling.",
    parametersCovered: 4,
    rating: 4.7,
    reviewsCount: 188,
    popular: false,
    badge: "Hormone Health",
  },
  {
    id: "LT-105",
    name: "Vitamin D3 (25-Hydroxy) & B12 Vitality Duo",
    category: "Vitamins & Immunity",
    provider: "BioMetrix Diagnostics",
    price: 69,
    originalPrice: 120,
    sampleType: "Blood Sample",
    fastingRequired: "No fasting required",
    turnaroundTime: "24-48 Hours",
    description: "Critical screen for bone density, neuromuscular integrity, neurological stamina, and chronic fatigue.",
    parametersCovered: 2,
    rating: 4.9,
    reviewsCount: 440,
    popular: true,
    badge: "Energy Booster",
  },
  {
    id: "LT-106",
    name: "Complete Blood Count (CBC) with Differential",
    category: "Comprehensive Wellness",
    provider: "HealthSync Central Labs",
    price: 28,
    originalPrice: 45,
    sampleType: "Blood Sample",
    fastingRequired: "No fasting required",
    turnaroundTime: "Within 6 Hours",
    description: "Full assessment of red cells, platelets, white cell differential, hemoglobin, and immune status.",
    parametersCovered: 26,
    rating: 4.9,
    reviewsCount: 890,
    popular: true,
    badge: "Baseline Care",
  },
  {
    id: "LT-107",
    name: "High-Sensitivity C-Reactive Protein (hs-CRP)",
    category: "Cardiovascular",
    provider: "Apex Clinical Laboratories",
    price: 42,
    originalPrice: 70,
    sampleType: "Blood Sample",
    fastingRequired: "No fasting required",
    turnaroundTime: "24 Hours",
    description: "Identifies systemic arterial micro-inflammation and prospective cardiovascular arterial events.",
    parametersCovered: 2,
    rating: 4.8,
    reviewsCount: 145,
    popular: false,
    badge: "Preventive",
  },
  {
    id: "LT-108",
    name: "Executive Whole-Body Health Package",
    category: "Comprehensive Wellness",
    provider: "HealthSync Central Labs",
    price: 189,
    originalPrice: 350,
    sampleType: "Blood & Urine Sample",
    fastingRequired: "12 hours fasting required",
    turnaroundTime: "24-36 Hours",
    description: "Over 82 biomakers including CMP, Lipid, Thyroid, CBC, Vit D, Iron Profile, and Urine Analysis.",
    parametersCovered: 82,
    rating: 5.0,
    reviewsCount: 672,
    popular: true,
    badge: "Best Value",
  },
];

export const DEMO_PACKAGES = [
  {
    id: "PKG-01",
    name: "Essential Health Baseline",
    badge: "Starter",
    price: 89,
    originalPrice: 150,
    testsIncluded: 4,
    parametersCount: 45,
    idealFor: "Young adults & yearly screening",
    features: [
      "Complete Blood Count (CBC)",
      "Comprehensive Metabolic Panel (CMP)",
      "Lipid Cholesterol Panel",
      "Fasting Blood Glucose",
      "Digital report with physician summary",
    ],
    recommended: false,
  },
  {
    id: "PKG-02",
    name: "Executive Vitality & Longevity Pro",
    badge: "Most Popular",
    price: 199,
    originalPrice: 380,
    testsIncluded: 9,
    parametersCount: 88,
    idealFor: "Ages 30+, sedentary workers, stress management",
    features: [
      "All Essential Baseline Tests",
      "Full Thyroid Trio (TSH, FT3, FT4)",
      "Vitamin D3 & Vitamin B12",
      "hs-CRP Cardiac Risk Marker",
      "Liver Function Panel (LFT)",
      "Kidney Function Panel (KFT)",
      "Dedicated 15-min Telehealth consultation",
    ],
    recommended: true,
  },
  {
    id: "PKG-03",
    name: "Cardiac & Metabolic Shield",
    badge: "Specialized",
    price: 159,
    originalPrice: 280,
    testsIncluded: 6,
    parametersCount: 52,
    idealFor: "Individuals with family history of diabetes/hypertension",
    features: [
      "Advanced Lipid Subfractions & ApoB",
      "HbA1c & Fasting Insulin Ratio",
      "hs-CRP Inflammation Index",
      "Electrolytes & Renal Markers",
      "Home Phlebotomy sample pickup included",
    ],
    recommended: false,
  },
];

export const testsService = {
  async getTests({ category, provider, search, sort, maxPrice } = {}) {
    // Simulated network delay for realistic SaaS feel
    await new Promise((r) => setTimeout(r, 200));

    let items = [...DEMO_LAB_TESTS];

    if (category && category !== "All Categories") {
      items = items.filter((t) => t.category === category);
    }

    if (provider && provider !== "All Providers") {
      items = items.filter((t) => t.provider === provider);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (maxPrice) {
      items = items.filter((t) => t.price <= maxPrice);
    }

    if (sort === "price-low") {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === "price-high") {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      items.sort((a, b) => b.rating - a.rating);
    }

    return items;
  },

  async getTestById(id) {
    await new Promise((r) => setTimeout(r, 100));
    return DEMO_LAB_TESTS.find((t) => t.id === id) || null;
  },

  async getPackages() {
    await new Promise((r) => setTimeout(r, 150));
    return DEMO_PACKAGES;
  },
};

