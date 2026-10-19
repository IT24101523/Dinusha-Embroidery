import { pgTable, uuid, varchar, integer, boolean, timestamp, pgEnum, date } from 'drizzle-orm/pg-core';

export const machineStatusEnum = pgEnum('machine_status', [
  'RUNNING',
  'SETUP',
  'MAINTENANCE',
  'IDLE',
]);

export type MachineStatus = (typeof machineStatusEnum.enumValues)[number];

export const machines = pgTable('machines', {
  id: uuid('id').defaultRandom().primaryKey(),
  machineNumber: integer('machine_number').notNull().unique(),
  machineName: varchar('machine_name', { length: 100 }).notNull(),
  brand: varchar('brand', { length: 100 }),
  heads: integer('heads'),
  speed: integer('speed'),
  status: machineStatusEnum('status').notNull().default('IDLE'),
  operatorName: varchar('operator_name', { length: 255 }),
  helperName: varchar('helper_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  colorScheme: varchar('color_scheme', { length: 50 }).notNull().default('slate'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const styles = pgTable('styles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  styleName: varchar('style_name', { length: 255 }).notNull(),
  targetPerHour: integer('target_per_hour'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productionAssignments = pgTable('production_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  machineId: uuid('machine_id').notNull().references(() => machines.id),
  styleId: uuid('style_id').notNull().references(() => styles.id),
  assignmentDate: date('assignment_date').notNull(),
  startHour: integer('start_hour').notNull(),
  spanHours: integer('span_hours').notNull().default(11),
  planQty: integer('plan_qty').notNull().default(0),
  actualQty: integer('actual_qty').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
export type ProductionAssignment = typeof productionAssignments.$inferSelect;
export type NewProductionAssignment = typeof productionAssignments.$inferInsert;
