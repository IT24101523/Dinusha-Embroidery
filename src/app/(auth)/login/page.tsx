'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDialog } from '@/components/system/dialog-provider';
import { loginAction } from '@/actions/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const router = useRouter();
  const dialog = useDialog();

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sign in to access the factory management dashboard
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
