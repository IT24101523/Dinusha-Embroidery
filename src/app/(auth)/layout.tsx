'use client';

import { Factory, Shield, BarChart3 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left Side - Branding Showcase (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-gradient-to-br from-[#002d62] via-[#001a3d] to-[#0e2280] relative overflow-hidden flex-col justify-between p-10">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-10 w-48 h-48 rounded-full bg-white/3" />

        {/* Top branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white text-[#002d62] flex items-center justify-center font-black text-2xl shadow-lg">
              D
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wide uppercase">
                Dinusha Embroidery
              </h1>
              <span className="text-xs text-blue-200/80 font-medium">Pvt Ltd</span>
            </div>
          </div>
        </div>

        {/* Center feature list */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Factory Operations System
            </h2>
            <p className="text-blue-200/80 text-sm leading-relaxed">
              Streamline your embroidery factory with real-time production tracking, quality management, and financial insights.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Factory className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">13-Machine Production Matrix</h3>
                <p className="text-xs text-blue-200/70">Visual Gantt planner with live actual vs plan tracking</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Needle Safety & Compliance</h3>
                <p className="text-xs text-blue-200/70">Tesco-compliant broken needle records and audit trails</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Financial & P&L Analytics</h3>
                <p className="text-xs text-blue-200/70">Multi-currency revenue, COGS, and margin tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-blue-300/50">
            © {new Date().getFullYear()} Dinusha Embroidery Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
