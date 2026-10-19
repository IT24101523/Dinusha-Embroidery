'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema, forgotPasswordSchema } from '@/lib/validations/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    const errorMsg = validated.error.issues?.[0]?.message || 'Validation failed';
    return { success: false, error: errorMsg };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { success: false, error: 'Invalid email or password. Please try again.' };
  }

  return { success: true };
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const rawData = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    role: formData.get('role'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const validated = registerSchema.safeParse(rawData);
  if (!validated.success) {
    const errorMsg = validated.error.issues?.[0]?.message || 'Validation failed';
    return { success: false, error: errorMsg };
  }

  const supabase = await createServerSupabaseClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
        role: validated.data.role,
      },
    },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    return { success: false, error: authError.message || 'Registration failed. Please try again.' };
  }

  if (authData.user) {
    try {
      await db.insert(userProfiles).values({
        authUserId: authData.user.id,
        fullName: validated.data.fullName,
        email: validated.data.email,
        role: validated.data.role,
      });
    } catch (dbErr) {
      console.warn('DB profile insert error:', dbErr);
    }
  }

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get('email'),
  };

  const validated = forgotPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    const errorMsg = validated.error.issues?.[0]?.message || 'Validation failed';
    return { success: false, error: errorMsg };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { success: false, error: 'Failed to send reset email. Please try again.' };
  }

  return { success: true };
}
