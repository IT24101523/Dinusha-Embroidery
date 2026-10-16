import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const machineSchema = z.object({
  name: z.string().min(1, "Machine name is required"),
  heads: z.number().int().positive(),
  speedSpm: z.number().int().positive(),
  brand: z.string().min(1),
  types: z.array(z.string()).min(1, "Select at least one embroidery type"),
  status: z.string().default("RUNNING"),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("machine_number", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, machines: data || [] });
  } catch (error) {
    console.error("GET machines error:", error);
    return NextResponse.json({ error: "Failed to fetch machines" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = machineSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    // Count existing machines to get next machine number
    const { count } = await supabase.from("machines").select("*", { count: "exact", head: true });
    const machineNumber = (count || 0) + 1;

    const { data, error } = await supabase
      .from("machines")
      .insert({
        name: validated.data.name,
        machine_number: machineNumber,
        heads: validated.data.heads,
        speed_spm: validated.data.speedSpm,
        brand: validated.data.brand,
        embroidery_types: validated.data.types,
        status: validated.data.status,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, machine: data });
  } catch (error) {
    console.error("POST machine error:", error);
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }
}
