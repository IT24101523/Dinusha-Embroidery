'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDialog } from '@/components/system/dialog-provider';
import { loginAction } from '@/actions/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';

const DEMO_LOGINS = [
  { label: 'CEO', email: 'ceo@dinusha.com', role: 'Executive' },
  { label: 'Factory Mgr', email: 'manager@dinusha.com', role: 'Operations' },
  { label: 'Production', email: 'production@dinusha.com', role: 'Floor' },
  { label: 'Quality', email: 'quality@dinusha.com', role: 'Inspection' },
  { label: 'HR & Needle', email: 'hr@dinusha.com', role: 'Safety' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const router = useRouter();
  const dialog = useDialog();

  function selectDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Dinusha@2026');
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    // Client-side validation
    const validated = loginSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validated.error.issues.forEach((err) => {
        const field = err.path[0] as keyof LoginFormData;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    // Server action
    const result = await loginAction(formData);

    if (result.success) {
      dialog.toast('Login successful! Redirecting...', 'success', 'Welcome');
      router.push('/dashboard');
      router.refresh();
    } else {
      dialog.toast(result.error || 'Login failed', 'error', 'Authentication Failed');
    }

    setIsLoading(false);
  }

  return (
    <div>
      {/* Mobile branding */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="w-11 h-11 rounded-xl bg-persian-800 text-white flex items-center justify-center font-black text-xl shadow-lg">
          D
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-persian-800 tracking-wide uppercase">
            Dinusha Embroidery
          </h1>
          <p className="text-xs text-slate-500">Factory Operations System</p>
        </div>
      </div>

      {/* Form Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sign in to access the factory management dashboard
        </p>
      </div>

      {/* Demo Credentials Quick-Select */}
      <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-persian-800 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Local Demo Accounts (1-Click Fill)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_LOGINS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => selectDemoAccount(demo.email)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                email === demo.email
                  ? 'bg-persian-800 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-persian-500 hover:text-persian-800'
              }`}
            >
              {demo.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Password for all demo accounts: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-700 font-mono">Dinusha@2026</code>
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Work Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your.name@dinusha.lk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
            error={errors.email}
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-persian-500 hover:text-persian-800 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              error={errors.password}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-persian-500 hover:text-persian-800 transition-colors"
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}
