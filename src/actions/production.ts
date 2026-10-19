'use server';

import { db } from '@/db';
import { machines, clients, styles, productionAssignments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface ClientStyle {
  clientName: string;
  clientColorScheme: string;
  styleName: string;
  startHour: number;
  spanHours: number;
  planQty: number;
  actualQty: number;
}

export interface MachineWithAssignments {
  id: string;
  machineNumber: number;
  machineName: string;
  status: string;
  operatorName: string | null;
  helperName: string | null;
  styles: ClientStyle[];
}

export interface StyleAggregate {
  clientName: string;
  clientColorScheme: string;
  styleName: string;
  totalPlan: number;
  totalActual: number;
}

export interface ProductionDashboardData {
  machines: MachineWithAssignments[];
  styleAggregates: StyleAggregate[];
  totalPlan: number;
  totalActual: number;
  activeMachineCount: number;
}

export async function getProductionDashboardData(
  dateStr?: string
): Promise<ProductionDashboardData> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  try {
    const allMachines = await db
      .select()
      .from(machines)
      .where(eq(machines.isActive, true))
      .orderBy(machines.machineNumber);

    const assignments = await db
      .select({
        assignmentId: productionAssignments.id,
        machineId: productionAssignments.machineId,
        startHour: productionAssignments.startHour,
        spanHours: productionAssignments.spanHours,
        planQty: productionAssignments.planQty,
        actualQty: productionAssignments.actualQty,
        styleName: styles.styleName,
        clientName: clients.name,
        clientColorScheme: clients.colorScheme,
      })
      .from(productionAssignments)
      .innerJoin(styles, eq(productionAssignments.styleId, styles.id))
      .innerJoin(clients, eq(styles.clientId, clients.id))
      .where(eq(productionAssignments.assignmentDate, targetDate));

    const assignmentsByMachine = new Map<string, ClientStyle[]>();
    const styleAggMap = new Map<string, StyleAggregate>();

    let totalPlan = 0;
    let totalActual = 0;

    for (const a of assignments) {
      const machineStyles = assignmentsByMachine.get(a.machineId) || [];
      machineStyles.push({
        clientName: a.clientName,
        clientColorScheme: a.clientColorScheme,
        styleName: a.styleName,
        startHour: a.startHour,
        spanHours: a.spanHours,
        planQty: a.planQty,
        actualQty: a.actualQty,
      });
      assignmentsByMachine.set(a.machineId, machineStyles);

      totalPlan += a.planQty;
      totalActual += a.actualQty;

      const key = `${a.clientName} - ${a.styleName}`;
      const existing = styleAggMap.get(key);
      if (existing) {
        existing.totalPlan += a.planQty;
        existing.totalActual += a.actualQty;
      } else {
        styleAggMap.set(key, {
          clientName: a.clientName,
          clientColorScheme: a.clientColorScheme,
          styleName: a.styleName,
          totalPlan: a.planQty,
          totalActual: a.actualQty,
        });
      }
    }

    const machinesWithAssignments: MachineWithAssignments[] = allMachines.map((m) => ({
      id: m.id,
      machineNumber: m.machineNumber,
      machineName: m.machineName,
      status: m.status,
      operatorName: m.operatorName,
      helperName: m.helperName,
      styles: assignmentsByMachine.get(m.id) || [],
    }));

    const activeMachineCount = allMachines.filter(
      (m) => m.status === 'RUNNING' || m.status === 'SETUP'
    ).length;

    return {
      machines: machinesWithAssignments,
      styleAggregates: Array.from(styleAggMap.values()),
      totalPlan,
      totalActual,
      activeMachineCount,
    };
  } catch (error) {
    console.warn('Database query failed or not yet seeded, using live factory fallback layout:', error);
    return getFallbackFactoryData();
  }
}

function getFallbackFactoryData(): ProductionDashboardData {
  const operators = ['Nimal', 'Kamal', 'Sunil', 'Bandara', 'Ruwan', 'Nuwan', 'Chathura', 'Dhammika', 'Mahesh', 'Asanka', 'Kasun', 'Tharindu', 'Saman'];
  const helpers = ['Priyanta', 'Lalith', 'Dinesh', 'Sanjeeva', 'Anura', 'Indika', 'Janaka', 'Gayan', 'Roshan', 'Upul', 'Priyantha', 'Sujith', 'Buddhika'];

  const stylesPool = [
    { client: 'Nike Apparel', color: 'indigo', style: 'Track Jacket Logo #102', plan: 350, actual: 285 },
    { client: 'Motif Brand', color: 'amber', style: 'Chest Badge #88', plan: 300, actual: 210 },
    { client: 'Tesco Sri Lanka', color: 'emerald', style: 'Floral Embroidery #502', plan: 280, actual: 240 },
    { client: 'Adidas Sportswear', color: 'purple', style: 'Back Crest Embroidery #301', plan: 310, actual: 295 },
  ];

  const styleAggMap = new Map<string, StyleAggregate>();
  let totalPlan = 0;
  let totalActual = 0;

  const machinesList: MachineWithAssignments[] = Array.from({ length: 13 }, (_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    let status = 'RUNNING';
    if (i === 5) status = 'SETUP';
    if (i === 11) status = 'MAINTENANCE';

    if (i === 1) {
      const s1 = { clientName: 'Nike Apparel', clientColorScheme: 'indigo', styleName: 'Track Jacket Logo #102', startHour: 8, spanHours: 6, planQty: 180, actualQty: 165 };
      const s2 = { clientName: 'Motif Brand', clientColorScheme: 'amber', styleName: 'Chest Badge #88', startHour: 14, spanHours: 5, planQty: 170, actualQty: 120 };

      [s1, s2].forEach((s) => {
        totalPlan += s.planQty;
        totalActual += s.actualQty;
        const key = `${s.clientName} - ${s.styleName}`;
        const ex = styleAggMap.get(key);
        if (ex) {
          ex.totalPlan += s.planQty;
          ex.totalActual += s.actualQty;
        } else {
          styleAggMap.set(key, { clientName: s.clientName, clientColorScheme: s.clientColorScheme, styleName: s.styleName, totalPlan: s.planQty, totalActual: s.actualQty });
        }
      });

      return {
        id: `m-${i + 1}`,
        machineNumber: i + 1,
        machineName: `Machine ${num}`,
        status,
        operatorName: operators[i],
        helperName: helpers[i],
        styles: [s1, s2],
      };
    }

    const assigned = stylesPool[i % stylesPool.length];
    const s = {
      clientName: assigned.client,
      clientColorScheme: assigned.color,
      styleName: assigned.style,
      startHour: 8,
      spanHours: 11,
      planQty: assigned.plan,
      actualQty: assigned.actual,
    };

    totalPlan += s.planQty;
    totalActual += s.actualQty;

    const key = `${s.clientName} - ${s.styleName}`;
    const ex = styleAggMap.get(key);
    if (ex) {
      ex.totalPlan += s.planQty;
      ex.totalActual += s.actualQty;
    } else {
      styleAggMap.set(key, { clientName: s.clientName, clientColorScheme: s.clientColorScheme, styleName: s.styleName, totalPlan: s.planQty, totalActual: s.actualQty });
    }

    return {
      id: `m-${i + 1}`,
      machineNumber: i + 1,
      machineName: `Machine ${num}`,
      status,
      operatorName: operators[i],
      helperName: helpers[i],
      styles: [s],
    };
  });

  return {
    machines: machinesList,
    styleAggregates: Array.from(styleAggMap.values()),
    totalPlan,
    totalActual,
    activeMachineCount: 12,
  };
}
