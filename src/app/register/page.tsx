"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Shield, CheckCircle2, ArrowRight } from "lucide-react";
import { dialog } from "@/components/ui/dialog";

const ROLES = [
  { value: "PRODUCTION_MANAGER", label: "Production Manager", desc: "Oversee machine matrix, planning & styles" },
  { value: "FACTORY_MANAGER", label: "Factory Manager", desc: "Floor oversight & machine allocation" },
  { value: "CEO", label: "CEO / Director", desc: "Executive dashboards and reports" },
  { value: "HR_NEEDLE_MANAGER", label: "HR & Needle Manager", desc: "Needle inventory & staff compliance" },
  { value: "QUALITY_MANAGER", label: "Quality Manager", desc: "Inspection, checking & daily delivery" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("PRODUCTION_MANAGER");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      dialog.toast("Password must be at least 6 characters long", "warning", "Validation");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      dialog.toast("Passwords do not match", "warning", "Validation");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Registration failed. Please check your details.");
        dialog.toast(data.error || "Registration failed", "danger", "Register Error");
        setIsLoading(false);
        return;
      }

      dialog.toast(`Account created for ${data.user.name}!`, "success", "Welcome");
      router.push("/production/dashboard");
      router.refresh();
    } catch {
      setErrorMsg("Unable to communicate with server. Please try again.");
      dialog.toast("Unable to communicate with server", "danger", "Network Error");
      setIsLoading(false);
    }
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
              <div className="text-[10px] text-blue-200">Factory Registration Portal</div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Create Staff Account
            </h1>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Register authorized staff to access floor operations, production schedules, machine logs, and style masters.
            </p>
          </div>

          <div className="space-y-2.5 pt-2 hidden sm:block">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct live sync with factory database</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role-based access permissions</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Encrypted credentials & secure JWT sessions</span>
            </div>
          </div>
        </div>

        {/* Right Registration Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
                Staff Registration
              </h2>
              <span className="bg-persian-50 text-persian-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-persian-200 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-persian-600" /> Authorized
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fill in your details below to activate your operator profile
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ruwan Silva"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ruwan@dinusha.lk"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Factory Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-persian-500 focus:bg-white transition-all cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — ({r.desc})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-persian-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-persian-800 hover:bg-persian-700 active:bg-persian-900 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-persian-700 font-extrabold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
