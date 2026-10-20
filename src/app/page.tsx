'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Factory,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  Award,
  Users,
  Cpu,
  ChevronRight,
  CheckCircle2,
  X,
  Gauge,
  Briefcase,
} from 'lucide-react';

export default function PublicHomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [epfInput, setEpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epfInput) {
      setErrorMsg('Please enter an EPF number or staff access code.');
      return;
    }
    // Instant entrance into the operations suite
    window.location.href = '/production';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-persian-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-persian-800 to-persian-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-persian-800/20">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight uppercase text-persian-900">
                  Dinusha Embroidery
                </span>
                <span className="bg-amber-400 text-persian-950 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full">
                  Pvt Ltd
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                Weliweriya West, Sri Lanka • Est. 2004
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#about" className="hover:text-persian-800 transition-colors">
              About Us
            </a>
            <a href="#services" className="hover:text-persian-800 transition-colors">
              Factory Capabilities
            </a>
            <a href="#ecosystem" className="hover:text-persian-800 transition-colors">
              Our Brands
            </a>
            <a href="#contact" className="hover:text-persian-800 transition-colors">
              Contact
            </a>
          </nav>

          {/* Staff Access Quick Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-persian-800 hover:bg-persian-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-persian-800/20 transition-all hover:scale-102"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-persian-950 via-persian-900 to-persian-800 text-white py-24 px-6">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1c39bb_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-400 text-persian-950 font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Over 20 Years of Industrial Excellence (Est. 2004)</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Elevating the Image and Safety of Your Workforce
          </h1>

          <p className="text-blue-100 text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Based in Weliweriya West, Dinusha Embroidery is a premier industrial embroidery
            and apparel manufacturing facility equipped with high-precision 13-machine Tajima
            fleets and rigorous compliance standards.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-persian-950 font-black px-7 py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-103 flex items-center gap-2"
            >
              <span>Enter Operational Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#services"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl text-xs uppercase tracking-wider border border-white/20 transition-all backdrop-blur-sm"
            >
              Explore Services
            </a>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="block font-black text-2xl text-amber-400">20+</span>
              <span className="text-xs text-blue-200 font-semibold">Years of Legacy</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="block font-black text-2xl text-white">13 Units</span>
              <span className="text-xs text-blue-200 font-semibold">Industrial Machines</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="block font-black text-2xl text-emerald-400">100%</span>
              <span className="text-xs text-blue-200 font-semibold">Needle Safety Checked</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="block font-black text-2xl text-amber-400">50K+</span>
              <span className="text-xs text-blue-200 font-semibold">Monthly Garment Output</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 space-y-20">
        {/* About Us Section */}
        <section id="about" className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-persian-600 font-extrabold text-xs uppercase tracking-wider bg-persian-50 px-3.5 py-1.5 rounded-lg border border-persian-200">
              Our Story & Legacy
            </span>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              Over Two Decades of Craftsmanship & Trust in Weliweriya
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Dinusha Embroidery started in 2004 as a dedicated home-based operation. Through
              uncompromising focus on stitch precision, thread quality, and punctual
              deliveries, we expanded into a high-capacity industrial production facility at{' '}
              <strong>#177/5 New Kandy Rd, Weliweriya West</strong>.
            </p>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              We proudly partner with leading national and global apparel exporters (Nike,
              Tesco, Motif, Adidas), providing skilled technical employment and training
              opportunities to our local community.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-5">
            <h3 className="font-black text-sm uppercase text-persian-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Core Factory Commitments</span>
            </h3>
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold text-sm">
                    Personalized Apparel Solutions
                  </strong>
                  <span className="text-slate-500">
                    High-definition embroidery, corporate uniforms, sportswear, badges, and
                    intricate multi-color crests.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold text-sm">
                    Tesco & Global Compliance Safety
                  </strong>
                  <span className="text-slate-500">
                    Strict Groz-Beckert needle exchange protocols, broken piece tracing, CLN
                    checklists, and conveyor metal detection.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Factory Capabilities Section */}
        <section id="services" className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2.5">
            <span className="text-persian-600 font-extrabold text-xs uppercase tracking-wider bg-persian-50 px-3.5 py-1.5 rounded-lg border border-persian-200">
              Factory Infrastructure
            </span>
            <h2 className="text-3xl font-black text-slate-900">Industrial Capabilities</h2>
            <p className="text-xs text-slate-500">
              Engineered with advanced 13-machine Tajima & Barudan multi-head embroidery
              fleets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-persian-600 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Multi-Head Tajima Fleets
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                High-speed 1,000 SPM computerized embroidery handling 3D puff, sequence,
                chenille, and complex multi-color motifs across 13 industrial machine lines.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Factory className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                End-to-End Apparel Manufacturing
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full-scale corporate garment production covering cutting, precision hooping,
                stitching, trimming, and export-ready packaging.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Quality Assurance & Compliance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated 8-member quality checking team, automated thread consumption tracking,
                and complete broken needle traceability compliant with retail audit standards.
              </p>
            </div>
          </div>
        </section>

        {/* Brand Ecosystem */}
        <section id="ecosystem" className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2.5">
            <span className="text-persian-600 font-extrabold text-xs uppercase tracking-wider bg-persian-50 px-3.5 py-1.5 rounded-lg border border-persian-200">
              Corporate Group
            </span>
            <h2 className="text-3xl font-black text-slate-900">The Brand Ecosystem</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-2xl shrink-0 shadow-inner">
                M
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-900">MOTIF Sportswear</h3>
                  <span className="text-[10px] text-slate-400 font-mono">(motifstyles.com)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our premier athletic sportswear brand specializing in custom sublimated and
                  embroidered team jerseys, athletic kits, and performance apparel.
                </p>
              </div>
            </div>

            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-2xl shrink-0 shadow-inner">
                N
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-900">
                  Nexora Software Solutions
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our digital systems partner driving factory automation, real-time machine
                  Gantt scheduling, payroll statutory engines, and inventory monitoring.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-10"
        >
          <div className="space-y-5">
            <span className="text-persian-600 font-extrabold text-xs uppercase tracking-wider bg-persian-50 px-3.5 py-1.5 rounded-lg border border-persian-200">
              Visit Us
            </span>
            <h2 className="text-3xl font-black text-slate-900">Factory in Weliweriya</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inquiring for commercial embroidery orders, corporate workwear, or custom sampling?
              Get in touch with our factory team.
            </p>

            <div className="space-y-3.5 text-xs font-semibold text-slate-700">
              <p className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-persian-600 shrink-0" />
                <span># 177/5 New Kandy Rd, Weliweriya West, Sri Lanka</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-persian-600 shrink-0" />
                <span>+94 33 2258961 (Landline) / +94 77 7748849 (Mobile)</span>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-persian-600 shrink-0" />
                <span>dinushaemb@gmail.com</span>
              </p>
            </div>

            <div className="pt-2">
              <a
                href="https://maps.app.goo.gl/PyXQhj4jxh2svGqq8"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-persian-800 text-white font-bold px-5 py-3 rounded-xl text-xs hover:bg-persian-700 transition-all shadow-sm"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-persian-100 text-persian-800 flex items-center justify-center">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">
              Looking for Corporate Bulk Quotations?
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              We handle apparel orders of any scale with guaranteed delivery schedules and strict
              needle audit compliance.
            </p>
            <a
              href="mailto:dinushaemb@gmail.com"
              className="bg-persian-800 hover:bg-persian-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md"
            >
              Email Inquiries Directly
            </a>
          </div>
        </section>
      </main>

      {/* Footer with Discreet Staff Portal Link */}
      <footer className="bg-persian-950 text-white py-10 px-6 mt-16 text-center text-xs space-y-3">
        <p className="font-bold text-slate-300">
          &copy; 2026 Dinusha Embroidery (Pvt Ltd) • Est. 2004. All Rights Reserved.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-3 text-[11px] text-blue-300">
          <span>Weliweriya West, Sri Lanka</span>
          <span className="opacity-40">•</span>
          <span>Powered by Nexora Software Solutions</span>
          <span className="opacity-40">•</span>
          {/* Discreet Staff Portal Link */}
          <button
            onClick={() => setModalOpen(true)}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 opacity-70 hover:opacity-100"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Staff Portal Access</span>
          </button>
        </div>
      </footer>

      {/* Staff Portal Access Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-persian-900 font-black text-sm uppercase">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Internal Staff Portal</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your Employee EPF number to proceed into the factory production and
              management system.
            </p>

            <form onSubmit={handlePortalLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee EPF Number *
                </label>
                <input
                  type="number"
                  value={epfInput}
                  onChange={(e) => setEpfInput(e.target.value)}
                  placeholder="e.g. 17"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-persian-800 outline-none focus:border-persian-500"
                />
              </div>

              {errorMsg && (
                <div className="text-rose-600 text-[11px] font-bold">{errorMsg}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-persian-800 hover:bg-persian-700 text-white font-bold p-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  Enter System
                </button>
                <Link
                  href="/production"
                  className="bg-amber-400 hover:bg-amber-300 text-persian-950 font-bold px-4 py-3 rounded-xl text-xs uppercase flex items-center justify-center"
                >
                  Direct Demo Access
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
