import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "@/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserRole } from "@/db/schema";

const COOKIE_NAME = "factory_session";
const secretKey = new TextEncoder().encode(env.AUTH_SECRET);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CEO", "FACTORY_MANAGER", "HR_NEEDLE_MANAGER", "PRODUCTION_MANAGER", "QUALITY_MANAGER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function authenticateUser(input: LoginInput): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const validated = loginSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message };
  }

  const supabase = createServerSupabaseClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, password_hash, name, role")
    .eq("email", validated.data.email.toLowerCase())
    .maybeSingle();

  if (error || !user) {
    return { success: false, error: "Invalid email or password" };
  }

  const isValidPassword = await bcrypt.compare(validated.data.password, user.password_hash);
  if (!isValidPassword) {
    return { success: false, error: "Invalid email or password" };
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };

  await setSessionCookie(sessionUser);
  return { success: true, user: sessionUser };
}

export async function registerUser(input: RegisterInput): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const validated = registerSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message };
  }

  const supabase = createServerSupabaseClient();
  const emailLower = validated.data.email.toLowerCase().trim();

  // Check if email already registered
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();

  if (existingUser) {
    return { success: false, error: "An account with this email address already exists" };
  }

  const passwordHash = await bcrypt.hash(validated.data.password, 10);

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      name: validated.data.name.trim(),
      email: emailLower,
      password_hash: passwordHash,
      role: validated.data.role,
    })
    .select("id, email, name, role")
    .single();

  if (error || !newUser) {
    console.error("User registration error:", error);
    return { success: false, error: "Failed to register user. Please try again." };
  }

  const sessionUser: SessionUser = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role as UserRole,
  };

  await setSessionCookie(sessionUser);
  return { success: true, user: sessionUser };
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
