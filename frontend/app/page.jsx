"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Button from "@/components/common/Button";
import PackageCard from "@/components/healthcare/PackageCard";
import TestCard from "@/components/healthcare/TestCard";
import TestDetailModal from "@/components/healthcare/TestDetailModal";
import { DEMO_LAB_TESTS, DEMO_PACKAGES } from "@/services/tests.service";
import { labTestsService } from "@/services/labTests.service";
import { packagesService } from "@/services/packages.service";
import {
  HeartPulse,
  Search,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  CalendarCheck,
  Truck,
  FileCheck2,
  Sparkles,
  CheckCircle,
  Microscope,
  Stethoscope,
  Activity,
  UserCheck,
  Lock,
  Clock,
  Star,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [featuredTests, setFeaturedTests] = useState(DEMO_LAB_TESTS.slice(0, 4));
  const [featuredPackages, setFeaturedPackages] = useState(DEMO_PACKAGES);

  React.useEffect(() => {
    async function loadCatalog() {
      try {
        const [testsRes, pkgsRes] = await Promise.all([
          labTestsService.getPublicLabTests({ limit: 4 }).catch(() => null),
          packagesService.getPublicPackages({ limit: 3 }).catch(() => null),
        ]);

        if (testsRes?.data && testsRes.data.length > 0) {
          const mapped = testsRes.data.map((t) => ({
            id: t.id,
            name: t.testName,
            category: t.category,
            provider: "HealthSync Central Labs",
            price: parseFloat(t.price),
            originalPrice: Math.round(parseFloat(t.price) * 1.4),
            fastingRequired: t.fastingRequired ? "10-12 hours fasting required" : "No fasting required",
            turnaroundTime: "12-24 hrs",
            description: t.description || "Precision pathology diagnostic analysis.",
            popular: true,
          }));
          setFeaturedTests(mapped);
        }

        if (pkgsRes?.data && pkgsRes.data.length > 0) {
          const mappedPkgs = pkgsRes.data.map((p) => ({
            id: p.id,
            name: p.packageName,
            price: parseFloat(p.offerPrice || p.originalPrice),
            originalPrice: parseFloat(p.originalPrice),
            idealFor: p.description,
            isPackage: true,
            features: [
              "Certified Laboratory Analysis",
              "Home Phlebotomist Visit Option",
              "Same-Day Digital Certificate",
              "Doctor Consultation Review"
            ],
          }));
          setFeaturedPackages(mappedPkgs);
        }
      } catch (err) {
        console.error("Failed to load live catalog for landing page:", err);
      }
    }
    loadCatalog();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/tests?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push("/dashboard/tests");
    }
  };

  const handleBookTest = (test) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-100">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 mesh-glow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Content */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold gradient-hero-badge text-blue-800 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                  <span>Next-Gen Diagnostic Intelligence & Home Phlebotomy</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                  Your Health.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600">
                    Simplified with Intelligence.
                  </span>
                </h1>

                {/* Description */}
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Book certified clinical diagnostic tests with licensed phlebotomists at your doorstep. Get precision laboratory analyses backed by accredited pathologists and intelligent AI biomarker tracking.
                </p>

                {/* Search Box */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="max-w-xl mx-auto lg:mx-0 p-2 rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-blue-500/5 flex flex-col sm:flex-row items-center gap-2"
                >
                  <div className="relative flex-1 w-full flex items-center pl-3">
                    <Search className="w-5 h-5 text-blue-600 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search blood tests (Lipid, CBC, HbA1c, Thyroid)..."
                      className="w-full pl-3 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gradient"
                    size="md"
                    className="w-full sm:w-auto font-semibold px-6 shadow-sm shrink-0"
                  >
                    <span>Find Tests</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </form>

                {/* Popular Services Pills */}
                <div className="pt-2 flex items-center justify-center lg:justify-start gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Popular:</span>
                  <Link
                    href="/dashboard/tests?category=Cardiovascular"
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                  >
                    Lipid Profile
                  </Link>
                  <Link
                    href="/dashboard/tests?category=Diabetes"
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                  >
                    HbA1c Diabetes
                  </Link>
                  <Link
                    href="/dashboard/tests?category=Vitamins"
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                  >
                    Vitamin D3 & B12
                  </Link>
                  <Link
                    href="/dashboard/tests?category=Thyroid"
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                  >
                    Thyroid Spectrum
                  </Link>
                </div>

                {/* Trust Proof Metrics */}
                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg mx-auto lg:mx-0">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">150k+</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tests Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-blue-600">99.8%</p>
                    <p className="text-xs text-slate-500 mt-0.5">Accuracy Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-teal-600">60 Min</p>
                    <p className="text-xs text-slate-500 mt-0.5">Home Phlebotomy</p>
                  </div>
                </div>
              </div>

              {/* Right Hero Image Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-2xl bg-white group">
                  <div className="relative aspect-4/3 sm:aspect-square w-full">
                    <Image
                      src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern Healthcare Diagnostics Laboratory"
                      fill
                      priority
                      className="object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
                  </div>

                  {/* Floating clinical card 1 */}
                  <div className="absolute top-4 left-4 p-3 rounded-2xl glass-panel shadow-lg flex items-center gap-3 max-w-xs animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">CLIA & CAP Certified</p>
                      <p className="text-[10px] text-slate-500">100% Chain-of-Custody Tracking</p>
                    </div>
                  </div>

                  {/* Floating clinical card 2 */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">AI Diagnostic Companion</p>
                        <p className="text-[10px] text-slate-500">Instant biomarker contextualization</p>
                      </div>
                    </div>
                    <Link href="/dashboard/ai-assistant">
                      <Button variant="subtle" size="sm" className="text-xs">
                        Try Demo
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Effortless Diagnostic Workflow
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                How HealthSync AI Works
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                From order to accredited laboratory analysis, your healthcare diagnostics are handled with clinical excellence in 3 simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="relative p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-blue-500/20">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Select Tests or Full Packages
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Browse over 150 individual blood, metabolic, and hormonal tests or choose whole-body wellness checkups curated by physicians.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                  <CalendarCheck className="w-4 h-4" />
                  <span>Choose custom appointment time</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-teal-500/20">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Home Phlebotomy Collection
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A certified phlebotomist arrives at your home with vacuum-sealed vacutainers and temperature-controlled cold-chain specimen carriers.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-teal-600 font-semibold">
                  <Truck className="w-4 h-4" />
                  <span>Cold-chain temperature transport</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-indigo-500/20">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  AI-Assisted Digital Report
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Receive verified digital results within 12–24 hours, supplemented by Gemini AI contextual breakdowns and certified pathologist signatures.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Secure HIPAA-compliant portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POPULAR HEALTHCARE SERVICES / TESTS */}
        <section id="services" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Clinical Diagnostics
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Most Requested Diagnostic Tests
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  High-precision laboratory panels performed by accredited testing facilities.
                </p>
              </div>

              <Link href="/dashboard/tests">
                <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
                  <span>View All 150+ Tests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  onViewDetails={handleBookTest}
                  onBookNow={handleBookTest}
                />
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED DIAGNOSTIC PACKAGES */}
        <section id="packages" className="py-20 bg-white border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                Curated Health Screening
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Comprehensive Diagnostic Packages
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Save up to 45% with multi-biomarker packages covering cardiovascular, renal, metabolic, and hormonal vitality.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {featuredPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onBookNow={(selected) => {
                    setSelectedTest({
                      id: selected.id,
                      name: selected.name,
                      price: selected.price,
                      originalPrice: selected.originalPrice,
                      category: "Comprehensive Diagnostic Package",
                      isPackage: true,
                      provider: "HealthSync Central Labs",
                      description: selected.idealFor,
                      fastingRequired: "12 hours fasting recommended",
                    });
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE HEALTHSYNC AI */}
        <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
                  Clinical Quality Assurance
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Why Leading Healthcare Providers Trust HealthSync AI
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  We blend gold-standard laboratory rigor with modern technology to remove the friction of routine and specialized diagnostics.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CAP & CLIA Accredited Partners</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Every specimen is processed by rigorously inspected and accredited pathology centers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Certified Phlebotomists</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Background-checked, sterile-certified healthcare personnel for comfortable sample collection.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Guaranteed Fast Turnaround</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        95% of routine metabolic and lipid panels delivered online within 12–24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lab photo grid */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative aspect-3/4 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                    <Image
                      src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                      alt="Clinical Laboratory Specialist"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="relative aspect-3/4 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                    <Image
                      src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80"
                      alt="Advanced Microscopic Pathology"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI HEALTHCARE ASSISTANT PROMO SECTION */}
        <section id="ai-assistant" className="py-20 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-blue-900 via-slate-900 to-teal-950 p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    <BrainCircuit className="w-4 h-4 text-teal-400" />
                    <span>Gemini-Powered Clinical Assistant</span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    Have questions about your test preparation or biomarkers?
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Our AI Healthcare Assistant helps you understand fasting guidelines, prepare for blood draws, explore test differences, and decode reference intervals before speaking with your physician.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link href="/dashboard/ai-assistant">
                      <Button variant="gradient" size="md" className="font-semibold gap-2 shadow-lg">
                        <span>Launch AI Health Assistant</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard/tests">
                      <Button variant="outline" size="md" className="text-slate-900 border-white/20 bg-white/90 hover:bg-white">
                        Explore Catalog
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-3">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-teal-400/20 text-teal-300 flex items-center justify-center">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">HealthSync AI Preview</p>
                      <p className="text-[10px] text-teal-200">Patient Education Engine</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/20 text-slate-200">
                      &quot;How many hours do I need to fast before my Lipid Profile?&quot;
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-slate-100 text-[11px] leading-relaxed">
                      &quot;For an accurate Lipid Profile, 10–12 hours of water-only fasting is standard. Drinking water is strongly encouraged to ensure optimal vein hydration.&quot;
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PATIENT TESTIMONIALS */}
        <section className="py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Patient Stories
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Trusted by Over 50,000 Individuals
              </h2>
              <p className="text-sm text-slate-500">
                Read how HealthSync AI helps patients monitor vital biomarkers conveniently from home.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &quot;The home phlebotomist arrived right on time at 8:00 AM. The blood draw was completely painless, and my full CMP and Lipid results were on my portal by 7:00 PM the same day.&quot;
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    SL
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Sarah Lin, Ph.D.</p>
                    <p className="text-[10px] text-slate-400">Verified Patient • Executive Package</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &quot;Being diabetic, I need regular HbA1c monitoring every three months. HealthSync AI has made the entire process so easy and stress-free without waiting rooms.&quot;
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    DR
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">David Reynolds</p>
                    <p className="text-[10px] text-slate-400">Verified Patient • Diabetes Monitoring</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &quot;The AI Assistant helped explain the difference between Free T3 and TSH before I booked my thyroid panel. The digital report was beautifully structured.&quot;
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    EM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Emily Martinez</p>
                    <p className="text-[10px] text-slate-400">Verified Patient • Thyroid Panel</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST & SECURITY BADGES */}
        <section className="py-12 bg-slate-50 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-slate-400 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-700">CAP & CLIA Accredited Laboratories</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <span className="text-slate-700">HIPAA Compliant Healthcare Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <span className="text-slate-700">100% Chain-of-Custody Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <span className="text-slate-700">Certified Registered Nurses & CPTs</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Booking / Details Modal */}
      <TestDetailModal
        test={selectedTest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookSuccess={() => {
          router.push("/dashboard/bookings");
        }}
      />
    </div>
  );
}

