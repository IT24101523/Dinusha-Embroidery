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

const styleSchema = z.object({
  code: z.string().min(1, "Style code is required"),
  company: z.string().min(1, "Company is required"),
  name: z.string().min(1, "Style name is required"),
  fabric: z.string().default("White"),
  target: z.number().int().positive(),
  currency: z.string().default("LKR"),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
  parts: z.array(partSchema).min(1, "At least one garment part is required"),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data: styles, error: stylesErr } = await supabase
      .from("styles")
      .select("*")
      .order("created_at", { ascending: false });

    if (stylesErr) throw stylesErr;

    const { data: parts, error: partsErr } = await supabase
      .from("style_parts")
      .select("*")
      .order("sort_order", { ascending: true });

    if (partsErr) throw partsErr;

    const { data: threads, error: threadsErr } = await supabase
      .from("style_threads")
      .select("*")
      .order("sort_order", { ascending: true });

    if (threadsErr) throw threadsErr;

    // Assemble nested structure
    const fullStyles = (styles || []).map((s) => {
      const styleParts = (parts || []).filter((p) => p.style_id === s.id);
      const nestedParts = styleParts.map((p) => {
        const partThreads = (threads || [])
          .filter((t) => t.part_id === p.id)
          .map((t) => ({
            id: t.id,
            color: t.color,
            shade: t.shade,
            brand: t.brand,
            mLen: parseFloat(t.machine_len_meters) || 0,
            cLen: parseFloat(t.cone_size_meters) || 5000,
            reqCones: parseFloat(t.required_cones) || 0,
          }));

        return {
          id: p.id,
          name: p.name,
          qty: p.part_qty,
          backing: p.backing,
          needle: p.needle_spec,
          threads: partThreads,
        };
      });

      return {
        id: s.id,
        code: s.code,
        company: s.company_name,
        name: s.name,
        fabric: s.fabric_color,
        target: s.target_per_hour,
        currency: s.currency,
        price: parseFloat(s.price) || 0,
        qty: s.order_qty,
        parts: nestedParts,
      };
    });

    return NextResponse.json({ success: true, styles: fullStyles });
  } catch (error) {
    console.error("GET styles error:", error);
    return NextResponse.json({ error: "Failed to fetch styles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = styleSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const { code, company, name, fabric, target, currency, price, qty, parts } = validated.data;
    const supabase = createServerSupabaseClient();

    // Insert Style
    const { data: newStyle, error: sErr } = await supabase
      .from("styles")
      .insert({
        code,
        company_name: company,
        name,
        fabric_color: fabric,
        target_per_hour: target,
        currency,
        price,
        order_qty: qty,
      })
      .select()
      .single();

    if (sErr) {
      if (sErr.code === "23505") {
        return NextResponse.json({ error: `Style with code '${code}' already exists` }, { status: 400 });
      }
      throw sErr;
    }

    // Insert Parts and Threads
    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const { data: newPart, error: pErr } = await supabase
        .from("style_parts")
        .insert({
          style_id: newStyle.id,
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

    return NextResponse.json({ success: true, styleId: newStyle.id });
  } catch (error) {
    console.error("POST style error:", error);
    return NextResponse.json({ error: "Failed to create master style" }, { status: 500 });
  }
}
