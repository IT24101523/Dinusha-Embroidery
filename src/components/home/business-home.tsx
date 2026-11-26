'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  loginToErpAction,
  requestPasswordResetAction,
  completePasswordResetWithOtpAction,
  sendEmailOtpAction,
  verifyEmailOtpAction,
} from '@/actions/auth';
import { submitQuotationAction } from '@/actions/quotations';
import {
  ShieldCheck,
  Sparkles,
  Factory,
  Award,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Lock,
  KeyRound,
  Cpu,
  Layers,
  Shirt,
  HardHat,
  BadgeCheck,
  Scissors,
  Users,
  X,
  Loader2,
  AlertCircle,
  Send,
  Menu,
  ExternalLink,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';

const HERO_SLIDES = [
  {
    src: '/images/factory-floor.jpg',
    alt: 'Dinusha Embroidery multi-head computerized embroidery production floor in Weliweriya',
    badge: 'Multi-Head Fleet',
    title: 'High-Speed Computerized Production Floor',
  },
  {
    src: '/images/embroidery-closeup.jpg',
    alt: 'Precision multi-needle embroidery head stitching colorful motifs on garment fabric',
    badge: 'Precision Stitching',
    title: 'Intricate Multi-Color Motif Embroidery',
  },
];

interface BusinessHomeProps {
  isLoggedIn: boolean;
  userLabel: string | null;
  promptLogin?: boolean;
}

const CAPABILITIES = [
  {
    icon: Cpu,
    title: 'Multi-Head Computerized Embroidery',
    desc: 'High-speed Tajima & Barudan multi-head fleets engineered for flat, 3D puff, sequence, chenille, and intricate multi-color motifs.',
    tags: ['3D Puff', 'Sequence', 'Chenille', 'High-Density'],
  },
  {
    icon: Scissors,
    title: 'End-to-End Uniform Manufacturing',
    desc: 'Complete corporate garment production from pattern cutting and precision hooping to stitching, trimming, and export-ready finishing.',
    tags: ['Cutting', 'Stitching', 'Trimming', 'Export Pack'],
  },
  {
    icon: ShieldCheck,
    title: 'Needle Safety & Metal Detection',
    desc: 'Strict Groz-Beckert needle exchange protocols, broken-needle piece tracing, and conveyor metal detection for zero-contamination safety.',
    tags: ['Groz-Beckert', 'Broken-Piece Trace', 'Metal Free'],
  },
  {
    icon: Layers,
    title: 'Real-Time Digital ERP & QC',
    desc: 'Live 13-machine production scheduling, size-wise target tracking, and dedicated quality checking stations ensuring on-time delivery.',
    tags: ['Live Floor Plan', 'Target QC', 'On-Time Delivery'],
  },
];

const PRODUCT_LINES = [
  {
    icon: Shirt,
    title: 'Corporate & Office Uniforms',
    subtitle: 'Executive & Staff Apparel',
    desc: 'Custom-tailored office shirts, trousers, hospitality attire, and branded corporate wear with crisp embroidered logos.',
    accent: 'from-persian-600 to-indigo-700',
  },
  {
    icon: HardHat,
    title: 'Industrial & Safety Workwear',
    subtitle: 'Heavy-Duty Protection',
    desc: 'Durable coveralls, high-visibility safety vests, and reinforced factory uniforms engineered to elevate workforce safety.',
    accent: 'from-amber-600 to-orange-700',
  },
  {
    icon: BadgeCheck,
    title: 'Promotional Tees, Caps & Badges',
    subtitle: 'Brand Merchandising',
    desc: 'Polo shirts, event T-shirts, embroidered caps, woven patches, and sportswear emblems built for high-volume campaigns.',
    accent: 'from-emerald-600 to-teal-700',
  },
];

const CORE_VALUES = [
  {
    title: 'Trust',
    desc: 'Long-term buyer partnerships built on transparent lead times and consistent delivery.',
  },
  {
    title: 'Ethics',
    desc: 'Fair labor practices, statutory compliance, and safe working conditions across every shift.',
  },
  {
    title: 'Integrity',
    desc: 'Honest material sourcing, exact stitch counts, and uncompromised quality inspection.',
  },
  {
    title: 'Respect',
    desc: 'Empowering our community through continuous technical training and skills development.',
  },
];

export function BusinessHome({
  isLoggedIn,
  userLabel,
  promptLogin = false,
}: BusinessHomeProps) {
  const router = useRouter();
  const uid = useId();
  const loginDialogRef = useRef<HTMLDialogElement | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(promptLogin);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Respect prefers-reduced-motion on initial mount for auto-advancing carousel
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsCarouselPaused(true);
    }
  }, []);

  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  // Login modal state
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'otp'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Quote inquiry form state
  const [quoteName, setQuoteName] = useState('');
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteService, setQuoteService] = useState('Industrial Embroidery');
  const [quoteQty, setQuoteQty] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Native <dialog> lifecycle with closedby="any" + pointerdown/pointerup fallback
  useEffect(() => {
    const dialog = loginDialogRef.current;
    if (!dialog) return;

    dialog.setAttribute('closedby', 'any');

    if (isLoginOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isLoginOpen && dialog.open) {
      dialog.close();
    }

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          setIsLoginOpen(false);
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      return () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [isLoginOpen]);

  const handleOpenErp = () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setPasswordInput('');
    setOtpInput('');
    setNewPasswordInput('');
    setOtpSent(false);
    setForgotOtpSent(false);
    setAuthView('login');
    setIsLoginOpen(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    if (authView === 'forgot') {
      if (!forgotOtpSent) {
        const res = await requestPasswordResetAction({ email: emailInput });
        setAuthLoading(false);
        if (!res.success) {
          setAuthError(res.error || 'Could not send reset code.');
          return;
        }
        setForgotOtpSent(true);
        setAuthSuccessMsg(
          `Dinusha Embroidery sent a 6-digit password reset code to ${emailInput}. Enter the code and your new password below.`
        );
        return;
      }

      const res = await completePasswordResetWithOtpAction({
        email: emailInput,
        token: otpInput,
        newPassword: newPasswordInput,
      });
      setAuthLoading(false);
      if (!res.success) {
        setAuthError(res.error || 'Invalid or expired reset code.');
        return;
      }
      setIsLoginOpen(false);
      router.push('/erp');
      router.refresh();
      return;
    }

    if (authView === 'otp') {
      if (!otpSent) {
        const res = await sendEmailOtpAction({ email: emailInput });
        setAuthLoading(false);
        if (!res.success) {
          setAuthError(res.error || 'Could not send verification code.');
          return;
        }
        setOtpSent(true);
        setAuthSuccessMsg(
          `Verification code & link sent to ${emailInput}. Enter the 6-digit code from your email.`
        );
        return;
      }

      const res = await verifyEmailOtpAction({ email: emailInput, token: otpInput });
      setAuthLoading(false);
      if (!res.success) {
        setAuthError(res.error || 'Invalid or expired code.');
        return;
      }
      setIsLoginOpen(false);
      router.push('/erp');
      router.refresh();
      return;
    }

    // Standard Username / Email + Password login
    const res = await loginToErpAction({
      identifier: emailInput,
      email: emailInput,
      password: passwordInput,
    });
    setAuthLoading(false);
    if (!res.success) {
      setAuthError(res.error || 'Invalid username or password.');
      return;
    }

    setIsLoginOpen(false);
    router.push('/erp');
    router.refresh();
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);
    setQuoteSent(false);
    setQuoteSubmitting(true);

    const res = await submitQuotationAction({
      customerName: quoteName,
      companyName: quoteCompany,
      email: quoteEmail,
      phone: quotePhone,
      serviceType: quoteService,
      estimatedQty: quoteQty ? parseInt(quoteQty, 10) : null,
      requirements: quoteMessage,
    });

    setQuoteSubmitting(false);
    if (!res.success) {
      setQuoteError(res.error || 'Failed to submit quotation request.');
      return;
    }

    setQuoteSent(true);
    setQuoteName('');
    setQuoteCompany('');
    setQuoteEmail('');
    setQuotePhone('');
    setQuoteQty('');
    setQuoteMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* ===================================================================
          STICKY TOP NAVIGATION BAR
          =================================================================== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleOpenErp}
            title="Dinusha Embroidery ERP Login"
            className="flex items-center gap-3 shrink-0 text-left cursor-pointer group"
          >
            <img
              src="/images/dinusha-logo.jpg"
              alt="Dinusha Embroidery Logo"
              className="w-11 h-11 rounded-full object-cover shadow-xs ring-2 ring-persian-100 group-hover:ring-persian-400 transition-all"
            />
            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-900 leading-none group-hover:text-persian-700 transition-colors">
                Dinusha Embroidery
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Est. 2004 • Weliweriya, Sri Lanka
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600"
          >
            <a href="#about" className="hover:text-persian-600 transition-colors">
              About Us
            </a>
            <a href="#capabilities" className="hover:text-persian-600 transition-colors">
              Capabilities
            </a>
            <a href="#products" className="hover:text-persian-600 transition-colors">
              Products
            </a>
            <a href="#compliance" className="hover:text-persian-600 transition-colors">
              Quality &amp; Safety
            </a>
            <a href="#contact" className="hover:text-persian-600 transition-colors">
              Contact
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-persian-900 hover:bg-persian-800 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <span>Request Quote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs font-bold text-slate-700">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-persian-600"
            >
              About Us
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-persian-600"
            >
              Capabilities
            </a>
            <a
              href="#products"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-persian-600"
            >
              Products
            </a>
            <a
              href="#compliance"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-persian-600"
            >
              Quality &amp; Safety
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-persian-600"
            >
              Contact &amp; Quote
            </a>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* =================================================================
            HERO SECTION
            ================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-br from-persian-900 via-[#061d4a] to-slate-900 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(90, 138, 208, 0.45), transparent 45%), radial-gradient(circle at 80% 75%, rgba(16, 185, 129, 0.3), transparent 40%)',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-blue-100 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>20+ Years of Industrial Embroidery Excellence (Est. 2004)</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12]">
                Precision Industrial Embroidery &amp; Corporate Apparel Manufacturing
              </h1>

              <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl leading-relaxed">
                From a dedicated home-based workshop in 2004 to a modern industrial facility in
                Weliweriya, Dinusha Embroidery elevates the image and safety of your workforce with
                high-speed multi-head embroidery, corporate uniforms, and export-grade quality
                control.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-500/20 transition-colors"
                >
                  <span>Start an Order / Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#capabilities"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold backdrop-blur-sm transition-colors"
                >
                  <span>Explore Capabilities</span>
                </a>
              </div>
            </div>

            {/* Right Moving Factory Showcase & KPI Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md p-4 sm:p-5 space-y-4 shadow-2xl">
                {/* Moving Image Carousel */}
                <div
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Factory embroidery showcase"
                  className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 aspect-[16/10]"
                >
                  <div
                    className="flex h-full transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                  >
                    {HERO_SLIDES.map((slide) => (
                      <div key={slide.src} className="relative w-full h-full shrink-0">
                        <img
                          src={slide.src}
                          alt={slide.alt}
                          className="w-full h-full object-cover"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"
                        />
                        <div className="absolute bottom-3 left-3.5 right-24">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-slate-950">
                            {slide.badge}
                          </span>
                          <p className="text-xs sm:text-sm font-extrabold text-white mt-1 drop-shadow">
                            {slide.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Carousel Controls: Pause/Play + Prev/Next */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCarouselPaused((prev) => !prev)}
                      aria-label={isCarouselPaused ? 'Play slideshow' : 'Pause slideshow'}
                      className="p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      {isCarouselPaused ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlide(
                          (prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
                        )
                      }
                      aria-label="Previous photo"
                      className="p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)
                      }
                      aria-label="Next photo"
                      className="p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Compact KPI Strip */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-slate-950/40 border border-white/10 p-2.5 text-center">
                    <p className="text-base sm:text-lg font-extrabold font-mono text-white">2004</p>
                    <p className="text-[10px] font-semibold text-blue-200">Est. Year</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 border border-white/10 p-2.5 text-center">
                    <p className="text-base sm:text-lg font-extrabold font-mono text-emerald-300">
                      13+
                    </p>
                    <p className="text-[10px] font-semibold text-blue-200">Machines</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 border border-white/10 p-2.5 text-center">
                    <p className="text-base sm:text-lg font-extrabold font-mono text-amber-300">
                      100%
                    </p>
                    <p className="text-[10px] font-semibold text-blue-200">QC Trace</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 border border-white/10 p-2.5 text-center">
                    <p className="text-base sm:text-lg font-extrabold font-mono text-sky-300">24/7</p>
                    <p className="text-[10px] font-semibold text-blue-200">Live ERP</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-blue-100">
                    <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>#177/5 New Kandy Rd, Weliweriya West</span>
                  </div>
                  <a
                    href="https://dinushaemb.blogspot.com/p/about-us.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 shrink-0"
                  >
                    <span>Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ABOUT US, MISSION, VISION & CORE VALUES
            ================================================================= */}
        <section id="about" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-persian-50 text-persian-700 border border-persian-200">
                <Factory className="w-3.5 h-3.5" />
                About Dinusha Embroidery
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Growing With Our Workforce &amp; Global Apparel Partners Since 2004
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dinusha Embroidery began its journey in 2004 as a small, home-based embroidery
                operation. Through unwavering dedication to stitch precision, ethical manufacturing,
                and continuous investment in computerized multi-head machinery, we have grown into a
                trusted industrial embroidery and uniform manufacturing partner in Sri Lanka.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-persian-600">
                    Our Mission
                  </p>
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    &ldquo;Elevating the image and safety of your workforce.&rdquo;
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                    Our Vision
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Acting as a value-adding supplier that grows the community by creating employment
                    and upskilling talent with modern industry technology.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Values Grid */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Foundational Principles
                    </p>
                    <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      Our Core Values
                    </h3>
                  </div>
                  <Award className="w-6 h-6 text-persian-500" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CORE_VALUES.map((val) => (
                    <div
                      key={val.title}
                      className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-sm font-extrabold text-slate-900">{val.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{val.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            INDUSTRIAL CAPABILITIES
            ================================================================= */}
        <section id="capabilities" className="py-16 sm:py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-persian-600">
                Production Powerhouse
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Industrial Capabilities &amp; Technology
              </h2>
              <p className="text-sm text-slate-600">
                Combining high-speed computerized embroidery fleets with end-to-end garment
                finishing and live digital production tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between gap-4 hover:border-persian-300 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-persian-900 text-white flex items-center justify-center shadow-xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">{cap.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {cap.desc}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {cap.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-slate-700 border border-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================
            PRODUCT LINES
            ================================================================= */}
        <section id="products" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-persian-600">
                What We Manufacture
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tailored Apparel &amp; Embroidery Solutions
              </h2>
            </div>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-persian-600 hover:text-persian-800"
            >
              <span>Request custom samples</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRODUCT_LINES.map((prod) => {
              const Icon = prod.icon;
              return (
                <div
                  key={prod.title}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col"
                >
                  <div className={`bg-gradient-to-r ${prod.accent} p-5 text-white flex items-center justify-between`}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                        {prod.subtitle}
                      </p>
                      <h3 className="text-base font-extrabold mt-0.5">{prod.title}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{prod.desc}</p>
                    <a
                      href="#contact"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-persian-600"
                    >
                      <span>Inquire about bulk orders</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================
            QUALITY, NEEDLE SAFETY & DIGITAL ERP BANNER
            ================================================================= */}
        <section
          id="compliance"
          className="py-16 sm:py-20 bg-slate-900 text-white border-y border-slate-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Defect &amp; Needle Safety Standards
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Powered by Our In-House Factory ERP &amp; Compliance System
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every order at Dinusha Embroidery is tracked digitally from needle issuance to
                final quality checking. Our management system enforces broken-needle piece tracing,
                hourly machine output monitoring, and dedicated QC station sign-offs before
                delivery.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                  <p className="text-xs font-extrabold text-white">CLN-01 Needle Control</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Full broken-needle log &amp; Groz-Beckert stock audit.
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                  <p className="text-xs font-extrabold text-white">13-Machine Gantt</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Live operator assignment &amp; size-wise target plans.
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                  <p className="text-xs font-extrabold text-white">Dedicated QC Floor</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hourly checker targets &amp; defect-free dispatch tracking.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-gradient-to-br from-persian-800 to-persian-900 border border-persian-600/40 p-6 sm:p-8 space-y-5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Export-Ready Quality Assurance
                    </h3>
                    <p className="text-xs text-blue-200">
                      Every batch verified before dispatch
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs text-blue-100/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Groz-Beckert needle exchange &amp; broken-piece audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Conveyor metal detection &amp; safety compliance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Size-wise target checking &amp; clean finishing</span>
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-blue-50 text-persian-900 text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Request Sample / Quotation</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            CONTACT & REQUEST A QUOTE
            ================================================================= */}
        <section id="contact" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-persian-600">
                  Get In Touch
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Partner With Dinusha Embroidery
                </h2>
                <p className="text-sm text-slate-600">
                  Reach out for bulk corporate uniforms, industrial safety wear, or custom
                  computerized embroidery quotations.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-slate-200 p-4">
                  <MapPin className="w-5 h-5 text-persian-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Factory Address</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      #177/5 New Kandy Rd, Weliweriya West, Sri Lanka
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-slate-200 p-4">
                  <Phone className="w-5 h-5 text-persian-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Direct Telephone</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Landline:{' '}
                      <a href="tel:+94332258961" className="font-bold text-slate-800 hover:underline">
                        +94 33 2258961
                      </a>{' '}
                      • Mobile:{' '}
                      <a href="tel:+94777748849" className="font-bold text-slate-800 hover:underline">
                        +94 77 7748849
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-slate-200 p-4">
                  <Mail className="w-5 h-5 text-persian-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Email Inquiries</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      <a
                        href="mailto:dinushaemb@gmail.com"
                        className="font-bold text-persian-600 hover:underline"
                      >
                        dinushaemb@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Request Form */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleQuoteSubmit}
                className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Request a Production Quotation
                  </h3>
                  {quoteSent && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      Quotation request saved! Our team will contact you soon.
                    </span>
                  )}
                </div>

                {quoteError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{quoteError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={`${uid}-q-name`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Your Name *
                    </label>
                    <input
                      id={`${uid}-q-name`}
                      type="text"
                      required
                      value={quoteName}
                      onChange={(e) => setQuoteName(e.target.value)}
                      placeholder="e.g. Kasun Perera"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-q-company`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Company / Brand
                    </label>
                    <input
                      id={`${uid}-q-company`}
                      type="text"
                      value={quoteCompany}
                      onChange={(e) => setQuoteCompany(e.target.value)}
                      placeholder="e.g. Lanka Apparel Ltd"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-q-email`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Email Address *
                    </label>
                    <input
                      id={`${uid}-q-email`}
                      type="email"
                      required
                      value={quoteEmail}
                      onChange={(e) => setQuoteEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-q-phone`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Phone / WhatsApp *
                    </label>
                    <input
                      id={`${uid}-q-phone`}
                      type="tel"
                      required
                      value={quotePhone}
                      onChange={(e) => setQuotePhone(e.target.value)}
                      placeholder="+94 77 ..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-q-service`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Service / Product Line
                    </label>
                    <select
                      id={`${uid}-q-service`}
                      value={quoteService}
                      onChange={(e) => setQuoteService(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-persian-500 cursor-pointer"
                    >
                      <option value="Industrial Embroidery">Industrial Embroidery</option>
                      <option value="Corporate & Office Uniforms">Corporate &amp; Office Uniforms</option>
                      <option value="Protective & Safety Wear">Protective &amp; Safety Wear</option>
                      <option value="Promotional T-Shirts & Caps">Promotional T-Shirts &amp; Caps</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-q-qty`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Estimated Quantity (Pcs)
                    </label>
                    <input
                      id={`${uid}-q-qty`}
                      type="number"
                      min={1}
                      value={quoteQty}
                      onChange={(e) => setQuoteQty(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-q-msg`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Order Details &amp; Specifications *
                  </label>
                  <textarea
                    id={`${uid}-q-msg`}
                    rows={3}
                    required
                    value={quoteMessage}
                    onChange={(e) => setQuoteMessage(e.target.value)}
                    placeholder="Share garment type, embroidery placement, target delivery date..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-persian-900 hover:bg-persian-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {quoteSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Quote Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================================
          FOOTER
          =================================================================== */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center sm:text-left">
            <p className="font-bold text-white">
              Dinusha Embroidery (Pvt) Ltd • Est. 2004
            </p>
            <p className="mt-0.5">
              #177/5 New Kandy Rd, Weliweriya West, Sri Lanka •{' '}
              <a href="mailto:dinushaemb@gmail.com" className="hover:text-white">
                dinushaemb@gmail.com
              </a>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://dinushaemb.blogspot.com/p/about-us.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Company Blog
            </a>
            <button
              type="button"
              onClick={handleOpenErp}
              className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
            >
              {isLoggedIn ? `ERP (${userLabel || 'Active'})` : 'Staff Portal'}
            </button>
          </div>
        </div>
      </footer>

      {/* ===================================================================
          NATIVE <dialog> MODAL: MANAGEMENT ERP LOGIN
          =================================================================== */}
      <dialog
        ref={loginDialogRef}
        aria-labelledby={`${uid}-login-title`}
        onClose={() => setIsLoginOpen(false)}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl text-slate-900"
      >
        <div className="bg-gradient-to-r from-persian-900 to-persian-800 text-white p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 id={`${uid}-login-title`} className="text-base font-extrabold">
                Management ERP Portal
              </h2>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Sign in to access Production, Quality, Needle &amp; Payroll
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLoginOpen(false)}
            aria-label="Close login modal"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {authView === 'forgot' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Enter your registered work email. Dinusha Embroidery will send a 6-digit verification
                code to reset your password.
              </p>
              <div>
                <label
                  htmlFor={`${uid}-fg-email`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Registered Email *
                </label>
                <input
                  id={`${uid}-fg-email`}
                  type="email"
                  autoFocus
                  required
                  disabled={forgotOtpSent}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500 disabled:bg-slate-100"
                />
              </div>
              {forgotOtpSent && (
                <>
                  <div>
                    <label
                      htmlFor={`${uid}-fg-code`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      6-Digit Reset Code *
                    </label>
                    <input
                      id={`${uid}-fg-code`}
                      type="text"
                      inputMode="numeric"
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest outline-none focus:border-persian-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-fg-newpass`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      New Password *
                    </label>
                    <input
                      id={`${uid}-fg-newpass`}
                      type="password"
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setForgotOtpSent(false);
                    setOtpInput('');
                    setNewPasswordInput('');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="font-bold text-persian-600 hover:underline cursor-pointer"
                >
                  Back to Password Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('otp');
                    setOtpSent(false);
                    setForgotOtpSent(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="font-bold text-slate-600 hover:text-persian-600 cursor-pointer"
                >
                  Use Email OTP Login
                </button>
              </div>
            </div>
          ) : authView === 'otp' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Forgot your password? Verify your email with a one-time code to sign in directly.
              </p>
              <div>
                <label
                  htmlFor={`${uid}-otp-email`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Registered Email *
                </label>
                <input
                  id={`${uid}-otp-email`}
                  type="email"
                  autoFocus
                  required
                  disabled={otpSent}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500 disabled:bg-slate-100"
                />
              </div>
              {otpSent && (
                <div>
                  <label
                    htmlFor={`${uid}-otp-code`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    6-Digit Verification Code *
                  </label>
                  <input
                    id={`${uid}-otp-code`}
                    type="text"
                    inputMode="numeric"
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter code from email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest outline-none focus:border-persian-500"
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setOtpSent(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="font-bold text-persian-600 hover:underline cursor-pointer"
                >
                  Back to Password Login
                </button>
                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpInput('');
                      setAuthSuccessMsg(null);
                    }}
                    className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Change Email
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor={`${uid}-erp-email`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Username or Email *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={`${uid}-erp-email`}
                    type="text"
                    autoComplete="username"
                    autoFocus
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. admin or manager@dinushaemb.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`${uid}-erp-password`}
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('forgot');
                      setAuthError(null);
                      setAuthSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-persian-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id={`${uid}-erp-password`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-persian-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('otp');
                    setOtpSent(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-persian-600 cursor-pointer"
                >
                  Verify via Email OTP Code instead →
                </button>
              </div>
            </div>
          )}

          {authError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={authLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-persian-900 hover:bg-persian-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {authView === 'forgot'
                      ? forgotOtpSent
                        ? 'Reset Password & Enter'
                        : 'Send Reset Code'
                      : authView === 'otp'
                      ? otpSent
                        ? 'Verify & Sign In'
                        : 'Send OTP Code'
                      : 'Sign In to ERP'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
