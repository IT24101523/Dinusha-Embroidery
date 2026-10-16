import { pgTable, uuid, text, integer, numeric, date, timestamp, jsonb } from "drizzle-orm/pg-core";

export const roleEnum = ["CEO", "FACTORY_MANAGER", "HR_NEEDLE_MANAGER", "PRODUCTION_MANAGER", "QUALITY_MANAGER"] as const;
export type UserRole = (typeof roleEnum)[number];

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<UserRole>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  machineNumber: integer("machine_number").notNull(),
  heads: integer("heads").notNull().default(15),
  speedSpm: integer("speed_spm").notNull().default(1000),
  brand: text("brand").notNull().default("Tajima"),
  embroideryTypes: jsonb("embroidery_types").$type<string[]>().notNull(),
  status: text("status").notNull().default("RUNNING"),
  currentOperator: text("current_operator").default("Nimal"),
  currentHelper: text("current_helper").default("Priyanta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const styles = pgTable("styles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  companyName: text("company_name").notNull(),
  name: text("name").notNull(),
  fabricColor: text("fabric_color").notNull().default("White"),
  targetPerHour: integer("target_per_hour").notNull().default(20),
  currency: text("currency").notNull().default("LKR"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("150.00"),
  orderQty: integer("order_qty").notNull().default(1000),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const styleParts = pgTable("style_parts", {
  id: uuid("id").defaultRandom().primaryKey(),
  styleId: uuid("style_id").notNull().references(() => styles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  partQty: integer("part_qty").notNull().default(1),
  backing: text("backing").notNull().default("Tearaway (Standard)"),
  needleSpec: text("needle_spec").notNull().default("DBxK5 75/11"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const styleThreads = pgTable("style_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  partId: uuid("part_id").notNull().references(() => styleParts.id, { onDelete: "cascade" }),
  color: text("color").notNull(),
  shade: text("shade").notNull(),
  brand: text("brand").notNull().default("Madeira"),
  machineLenMeters: numeric("machine_len_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  coneSizeMeters: numeric("cone_size_meters", { precision: 10, scale: 2 }).notNull().default("5000"),
  requiredCones: numeric("required_cones", { precision: 10, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const productionPlans = pgTable("production_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  planDate: date("plan_date").notNull(),
  shift: text("shift").notNull().default("day"),
  machineId: uuid("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  machineName: text("machine_name").notNull(),
  companyName: text("company_name").notNull(),
  styleName: text("style_name").notNull(),
  size: text("size").notNull().default("L"),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("18:00"),
  startCol: integer("start_col").notNull().default(1),
  span: integer("span").notNull().default(11),
  planQty: integer("plan_qty").notNull().default(300),
  actualQty: integer("actual_qty").notNull().default(0),
  operator: text("operator").notNull().default("Nimal"),
  helper: text("helper").notNull().default("Priyanta"),
  status: text("status").notNull().default("RUNNING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type Style = typeof styles.$inferSelect;
export type StylePart = typeof styleParts.$inferSelect;
export type StyleThread = typeof styleThreads.$inferSelect;
export type ProductionPlan = typeof productionPlans.$inferSelect;
