'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema, forgotPasswordSchema } from '@/lib/validations/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';

import { cookies } from 'next/headers';

export const DEMO_ACCOUNTS: Record<string, { role: 'CEO' | 'FACTORY_MANAGER' | 'HR_NEEDLE_MANAGER' | 'PRODUCTION_MANAGER' | 'QUALITY_MANAGER'; fullName: string; password: string }> = {
  'ceo@dinusha.com': {
    role: 'CEO',
    fullName: 'Dinusha Wickramasinghe',
    password: 'Dinusha@2026',
  },
  'manager@dinusha.com': {
    role: 'FACTORY_MANAGER',
    fullName: 'Kamal Silva',
    password: 'Dinusha@2026',
  },
  'production@dinusha.com': {
    role: 'PRODUCTION_MANAGER',
    fullName: 'Nimal Perera',
    password: 'Dinusha@2026',
  },
  'quality@dinusha.com': {
    role: 'QUALITY_MANAGER',
    fullName: 'Sunil Fernando',
    password: 'Dinusha@2026',
  },
  'hr@dinusha.com': {
    role: 'HR_NEEDLE_MANAGER',
    fullName: 'Anura Bandara',
    password: 'Dinusha@2026',
  },
};

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

  const emailLower = validated.data.email.toLowerCase().trim();

  // Check demo accounts for local testing
  const demoAccount = DEMO_ACCOUNTS[emailLower];
  if (demoAccount && validated.data.password === demoAccount.password) {
    const cookieStore = await cookies();
    cookieStore.set(
      'factory_local_session',
      JSON.stringify({
        email: emailLower,
        fullName: demoAccount.fullName,
        role: demoAccount.role,
      }),
      {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    );
    return { success: true };
  }

  // Supabase Auth
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (error) {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return {
          success: false,
          error: 'Local mode: Use a demo account (e.g. ceo@dinusha.com / Dinusha@2026) or connect Supabase.',
        };
      }
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }

    return { success: true };
  } catch (err) {
    console.warn('Auth sign-in fallback:', err);
    return {
      success: false,
      error: 'Use a demo account (e.g. ceo@dinusha.com / Dinusha@2026) for local testing.',
    };
  }
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
  try {
    const cookieStore = await cookies();
    cookieStore.delete('factory_local_session');
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Logout fallback:', err);
  }
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
