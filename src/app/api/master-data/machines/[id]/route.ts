import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const machineUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  heads: z.number().int().positive().optional(),
  speedSpm: z.number().int().positive().optional(),
  brand: z.string().min(1).optional(),
  types: z.array(z.string()).optional(),
  status: z.string().optional(),
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
    const validated = machineUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.data.name) updates.name = validated.data.name;
    if (validated.data.heads) updates.heads = validated.data.heads;
    if (validated.data.speedSpm) updates.speed_spm = validated.data.speedSpm;
    if (validated.data.brand) updates.brand = validated.data.brand;
    if (validated.data.types) updates.embroidery_types = validated.data.types;
    if (validated.data.status) updates.status = validated.data.status;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("machines")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, machine: data });
  } catch (error) {
    console.error("PUT machine error:", error);
    return NextResponse.json({ error: "Failed to update machine" }, { status: 500 });
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
    const { error } = await supabase.from("machines").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE machine error:", error);
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}
