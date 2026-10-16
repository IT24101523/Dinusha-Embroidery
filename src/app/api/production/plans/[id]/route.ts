import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const updatePlanSchema = z.object({
  styleName: z.string().optional(),
  planQty: z.number().int().nonnegative().optional(),
  actualQty: z.number().int().nonnegative().optional(),
  status: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updatePlanSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.data.styleName !== undefined) updates.style_name = validated.data.styleName;
    if (validated.data.planQty !== undefined) updates.plan_qty = validated.data.planQty;
    if (validated.data.actualQty !== undefined) updates.actual_qty = validated.data.actualQty;
    if (validated.data.status !== undefined) updates.status = validated.data.status;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("production_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan: data });
  } catch (error) {
    console.error("PATCH plan error:", error);
    return NextResponse.json({ error: "Failed to update production block" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("production_plans")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE plan error:", error);
    return NextResponse.json({ error: "Failed to delete production block" }, { status: 500 });
  }
}
