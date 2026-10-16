import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split("T")[0];

    // Fetch machines
    const { data: machines, error: macError } = await supabase
      .from("machines")
      .select("*")
      .order("machine_number", { ascending: true });

    if (macError) throw macError;

    // Fetch today's plans
    const { data: plans, error: planError } = await supabase
      .from("production_plans")
      .select("*")
      .eq("plan_date", today)
      .order("start_col", { ascending: true });

    if (planError) throw planError;

    // If no plans for today, fetch the most recent plans so dashboard is populated
    let activePlans = plans || [];
    if (activePlans.length === 0) {
      const { data: latestPlans } = await supabase
        .from("production_plans")
        .select("*")
        .order("plan_date", { ascending: false })
        .limit(20);
      activePlans = latestPlans || [];
    }

    // Build machine matrix
    let totalPlan = 0;
    let totalActual = 0;
    const styleAggregates: Record<string, { client: string; style: string; plan: number; actual: number }> = {};

    const machineRows = (machines || []).map((m) => {
      const macPlans = activePlans.filter((p) => p.machine_id === m.id || p.machine_name === m.name);

      let macPlan = 0;
      let macActual = 0;

      const stylesList = macPlans.map((p) => {
        macPlan += p.plan_qty;
        macActual += p.actual_qty;

        const key = `${p.company_name} - ${p.style_name}`;
        if (!styleAggregates[key]) {
          styleAggregates[key] = {
            client: p.company_name,
            style: p.style_name,
            plan: 0,
            actual: 0,
          };
        }
        styleAggregates[key].plan += p.plan_qty;
        styleAggregates[key].actual += p.actual_qty;

        return {
          id: p.id,
          client: p.company_name,
          style: p.style_name,
          size: p.size,
          startCol: p.start_col,
          span: p.span,
          plan: p.plan_qty,
          actual: p.actual_qty,
        };
      });

      totalPlan += macPlan;
      totalActual += macActual;

      const compPercent = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

      return {
        id: m.name,
        dbId: m.id,
        num: m.machine_number,
        operator: m.current_operator || "Nimal",
        helper: m.current_helper || "Priyanta",
        status: m.status,
        plan: macPlan,
        actual: macActual,
        percentage: compPercent,
        styles: stylesList,
      };
    });

    const overallPct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0;

    return NextResponse.json({
      success: true,
      date: today,
      shift: "Day Shift (08:00 - 19:00)",
      summary: {
        totalPlan,
        totalActual,
        percentage: overallPct,
        activeMachines: machineRows.filter((m) => m.status === "RUNNING").length,
        totalMachines: machineRows.length,
      },
      styleBreakdown: Object.values(styleAggregates),
      machines: machineRows,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch production dashboard data" }, { status: 500 });
  }
}
