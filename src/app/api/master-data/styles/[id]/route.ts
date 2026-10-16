import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const threadSchema = z.object({
  color: z.string().min(1, "Color is required"),
  shade: z.string().min(1, "Shade is required"),
  brand: z.string().default("Madeira"),
  mLen: z.number().nonnegative(),
  cLen: z.number().positive(),
  reqCones: z.number().nonnegative().optional(),
});

const partSchema = z.object({
  name: z.string().min(1, "Part name is required"),
  qty: z.number().int().positive(),
  backing: z.string(),
  needle: z.string(),
  threads: z.array(threadSchema),
});

const styleUpdateSchema = z.object({
  code: z.string().min(1),
  company: z.string().min(1),
  name: z.string().min(1),
  fabric: z.string().default("White"),
  target: z.number().int().positive(),
  currency: z.string().default("LKR"),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
  parts: z.array(partSchema).min(1),
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
    const validated = styleUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const { code, company, name, fabric, target, currency, price, qty, parts } = validated.data;
    const supabase = createServerSupabaseClient();

    // Update style parent
    const { error: sErr } = await supabase
      .from("styles")
      .update({
        code,
        company_name: company,
        name,
        fabric_color: fabric,
        target_per_hour: target,
        currency,
        price,
        order_qty: qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (sErr) throw sErr;

    // Delete existing parts (cascades to threads)
    await supabase.from("style_parts").delete().eq("style_id", id);

    // Re-insert parts and threads
    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const { data: newPart, error: pErr } = await supabase
        .from("style_parts")
        .insert({
          style_id: id,
          name: part.name,
          part_qty: part.qty,
          backing: part.backing,
          needle_spec: part.needle,
          sort_order: pIdx + 1,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      for (let tIdx = 0; tIdx < part.threads.length; tIdx++) {
        const thread = part.threads[tIdx];
        const reqCones = (((thread.mLen * 1.5) * part.qty * qty) / thread.cLen);

        await supabase.from("style_threads").insert({
          part_id: newPart.id,
          color: thread.color,
          shade: thread.shade,
          brand: thread.brand,
          machine_len_meters: thread.mLen,
          cone_size_meters: thread.cLen,
          required_cones: reqCones,
          sort_order: tIdx + 1,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT style error:", error);
    return NextResponse.json({ error: "Failed to update style" }, { status: 500 });
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
    const { error } = await supabase.from("styles").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE style error:", error);
    return NextResponse.json({ error: "Failed to delete style" }, { status: 500 });
  }
}
