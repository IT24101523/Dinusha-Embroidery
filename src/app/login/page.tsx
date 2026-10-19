"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, CheckCircle2, ArrowRight } from "lucide-react";
import { dialog } from "@/components/ui/dialog";

const DEMO_ACCOUNTS = [
  { role: "Production Manager", email: "production@dinusha.lk", pass: "Factory@2026", desc: "Full access to Production Matrix, Planner & Master Data" },
  { role: "Factory Manager", email: "factory.mgr@dinusha.lk", pass: "Factory@2026", desc: "Full administrative & floor oversight" },
  { role: "CEO", email: "ceo@dinusha.lk", pass: "Factory@2026", desc: "Executive view across all company operations" },
  { role: "HR & Needle Manager", email: "hr.needle@dinusha.lk", pass: "Factory@2026", desc: "Needle inventory & staff attendance" },
  { role: "Quality Manager", email: "quality@dinusha.lk", pass: "Factory@2026", desc: "Quality checking & delivery verification" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("production@dinusha.lk");
  const [password, setPassword] = useState("Factory@2026");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Authentication failed. Please verify credentials.");
        dialog.toast(data.error || "Authentication failed", "danger", "Login Error");
        setIsLoading(false);
        return;
      }

      dialog.toast(`Welcome back, ${data.user.name}!`, "success", "Signed In");
      router.push("/production/dashboard");
      router.refresh();
    } catch {
      setErrorMsg("Connection error. Please try again.");
      dialog.toast("Unable to communicate with authentication server", "danger", "Network Error");
      setIsLoading(false);
    }
  };

  const handleSelectAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-radial from-persian-800/40 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-persian-500/10 rounded-full blur-3xl pointer-events-none -top-48 -left-48" />
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -bottom-48 -right-48" />

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Factory Info Column */}
        <div className="lg:col-span-5 text-white space-y-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 bg-persian-800/80 border border-persian-600/40 px-3.5 py-1.5 rounded-2xl shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-lg">
              D
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase">DINUSHA EMBROIDERY</div>
              <div className="text-[10px] text-blue-200">Weliweriya Factory Floor</div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Factory Operations System
            </h1>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Industrial operations management system for high-volume embroidery machines, production scheduling, style matrices, and workforce tracking.
            </p>
          </div>

          <div className="space-y-2.5 pt-2 hidden sm:block">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>13 Live Multi-Head Tajima & Barudan Machines</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time Day Shift (08:00 - 19:00) Target Tracking</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role-Based Access Control & Direct Database Sync</span>
            </div>
          </div>
        </div>

        {/* Right Sign-in Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
                Operator Sign In
              </h2>
              <span className="bg-persian-50 text-persian-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-persian-200 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-persian-600" /> Secure Auth
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access the FactoryOps portal
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dinusha.lk"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-persian-800 hover:bg-persian-700 active:bg-persian-900 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to FactoryOps</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              Need a new account?{" "}
              <a href="/register" className="text-persian-700 font-extrabold hover:underline">
                Register staff here
              </a>
            </p>
          </div>

          {/* Quick-Select Demo Credentials Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
              <span>Quick Login Accounts (Click to Fill)</span>
              <span className="text-[10px] text-persian-600 font-bold lowercase">password: Factory@2026</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc.email, acc.pass)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    email === acc.email
                      ? "border-persian-500 bg-persian-50/60 ring-1 ring-persian-500"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{acc.role}</span>
                    <span className="text-[10px] font-mono text-slate-400">{acc.pass}</span>
                  </div>
                  <div className="text-[11px] font-medium text-persian-700 truncate mt-0.5">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
