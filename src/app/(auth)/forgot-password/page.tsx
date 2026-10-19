'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDialog } from '@/components/system/dialog-provider';
import { resetPasswordAction } from '@/actions/auth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const dialog = useDialog();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
    };

    const validated = forgotPasswordSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<Record<keyof ForgotPasswordFormData, string>> = {};
      validated.error.issues.forEach((err) => {
        const field = err.path[0] as keyof ForgotPasswordFormData;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    const result = await resetPasswordAction(formData);

    if (result.success) {
      setIsSubmitted(true);
      dialog.toast('Password reset email sent. Check your inbox.', 'success', 'Email Sent');
    } else {
      dialog.toast(result.error || 'Failed to send reset email', 'error', 'Error');
    }

    setIsLoading(false);
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          We&apos;ve sent a password reset link to your email address. Please check your inbox and follow the instructions.
        </p>
        <Link href="/login">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
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
        <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your work email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Reset Form */}
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          <Send className="h-4 w-4" />
          Send Reset Link
        </Button>
      </form>

      {/* Back to login */}
      <p className="text-center text-sm text-slate-500 mt-6">
        <Link
          href="/login"
          className="font-semibold text-persian-500 hover:text-persian-800 transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
