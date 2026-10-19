'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useDialog } from '@/components/system/dialog-provider';
import { registerAction } from '@/actions/auth';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';

const ROLE_OPTIONS = [
  { value: 'CEO', label: 'CEO — Chief Executive Officer' },
  { value: 'FACTORY_MANAGER', label: 'Factory Manager — Full Administrative Control' },
  { value: 'HR_NEEDLE_MANAGER', label: 'HR & Needle Manager — Safety & Payroll' },
  { value: 'PRODUCTION_MANAGER', label: 'Production Manager — Machine & Planning' },
  { value: 'QUALITY_MANAGER', label: 'Quality Manager — Inspection & Delivery' },
];

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Too Weak', color: 'text-rose-600', bgColor: 'bg-rose-500' },
    { score: 1, label: 'Weak', color: 'text-rose-600', bgColor: 'bg-rose-500' },
    { score: 2, label: 'Fair', color: 'text-amber-600', bgColor: 'bg-amber-500' },
    { score: 3, label: 'Good', color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
    { score: 4, label: 'Strong', color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
  ];

  return levels[score] || levels[0];
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const router = useRouter();
  const dialog = useDialog();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    // Client-side validation
    const validated = registerSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      validated.error.issues.forEach((err) => {
        const field = err.path[0] as keyof RegisterFormData;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    // Server action
    const result = await registerAction(formData);

    if (result.success) {
      dialog.toast('Account created successfully! Please sign in.', 'success', 'Registration Complete');
      router.push('/login');
    } else {
      dialog.toast(result.error || 'Registration failed', 'error', 'Registration Failed');
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
        <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
        <p className="text-sm text-slate-500 mt-1">
          Register to access the factory operations platform
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            icon={<User className="h-4 w-4" />}
            error={errors.fullName}
            autoComplete="name"
            disabled={isLoading}
          />
        </div>

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
          <Label htmlFor="role">Assigned Role</Label>
          <Select
            id="role"
            name="role"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={errors.role}
            options={ROLE_OPTIONS}
            placeholder="Select your role"
            defaultValue=""
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password}
              autoComplete="new-password"
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
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
          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength.score
                        ? passwordStrength.bgColor
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-semibold ${passwordStrength.color}`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              icon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
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
          <UserPlus className="h-4 w-4" />
          Create Account
        </Button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-persian-500 hover:text-persian-800 transition-colors"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
