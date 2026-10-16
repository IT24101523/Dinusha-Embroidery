import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, companies: data || [] });
  } catch (error) {
    console.error("GET companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = companySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: validated.data.name,
        contact_person: validated.data.contactPerson,
        email: validated.data.email,
        phone: validated.data.phone,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A company with this name already exists" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, company: data });
  } catch (error) {
    console.error("POST company error:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
