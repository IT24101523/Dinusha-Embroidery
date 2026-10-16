import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const companyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validated = companyUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.data.name) updates.name = validated.data.name;
    if (validated.data.contactPerson) updates.contact_person = validated.data.contactPerson;
    if (validated.data.email) updates.email = validated.data.email;
    if (validated.data.phone) updates.phone = validated.data.phone;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, company: data });
  } catch (error) {
    console.error("PUT company error:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE company error:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
