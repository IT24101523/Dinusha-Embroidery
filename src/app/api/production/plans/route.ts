import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const SHIFT_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const planInputSchema = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  shift: z.string().default("day"),
  machineName: z.string().min(1, "Machine is required"),
  companyName: z.string().min(1, "Company is required"),
  styleName: z.string().min(1, "Style is required"),
  size: z.string().default("L"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  planQty: z.number().int().positive("Plan quantity must be greater than 0"),
  operator: z.string().min(1, "Operator is required"),
  helper: z.string().default("None"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = createServerSupabaseClient();
    const { data: plans, error } = await supabase
      .from("production_plans")
      .select("*")
      .eq("plan_date", dateParam)
      .order("start_col", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, plans: plans || [] });
  } catch (error) {
    console.error("GET plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = planInputSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
    }

    const input = validated.data;

    // Check date restriction
    const todayStr = new Date().toISOString().split("T")[0];
    if (input.planDate < todayStr) {
      return NextResponse.json({ error: "Planning is only allowed for today or future dates." }, { status: 400 });
    }

    // Calculate timeline startCol and span
    const startIdx = SHIFT_HOURS.indexOf(input.startTime);
    const endIdx = SHIFT_HOURS.indexOf(input.endTime);

    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json({ error: "Invalid shift start or end time" }, { status: 400 });
    }

    if (startIdx > endIdx) {
      return NextResponse.json({ error: "Start time cannot be later than end time" }, { status: 400 });
    }

    const startCol = startIdx + 1;
    const span = endIdx - startIdx + 1;

    const supabase = createServerSupabaseClient();

    // Find machine
    const { data: machine, error: macErr } = await supabase
      .from("machines")
      .select("id, name")
      .eq("name", input.machineName)
      .maybeSingle();

    if (macErr || !machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Insert production plan
    const { data: newPlan, error: insertErr } = await supabase
      .from("production_plans")
      .insert({
        plan_date: input.planDate,
        shift: input.shift,
        machine_id: machine.id,
        machine_name: machine.name,
        company_name: input.companyName,
        style_name: `${input.styleName} (${input.size})`,
        size: input.size,
        start_time: input.startTime,
        end_time: input.endTime,
        start_col: startCol,
        span: span,
        plan_qty: input.planQty,
        actual_qty: 0,
        operator: input.operator,
        helper: input.helper,
        status: "RUNNING",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Update machine current operator and helper
    await supabase
      .from("machines")
      .update({
        current_operator: input.operator,
        current_helper: input.helper !== "None" ? input.helper : "Priyanta",
        updated_at: new Date().toISOString(),
      })
      .eq("id", machine.id);

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error) {
    console.error("POST plan error:", error);
    return NextResponse.json({ error: "Failed to schedule production plan" }, { status: 500 });
  }
}
