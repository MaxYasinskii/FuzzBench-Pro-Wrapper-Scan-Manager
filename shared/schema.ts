import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // admin or user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security tools table
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // SAST or DAST
  description: text("description"),
  installCommand: text("install_command"),
  runCommand: text("run_command"),
  installed: boolean("installed").default(false),
  ownerId: varchar("owner_id").references(() => users.id), // admin user who owns the tool
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  projectPath: text("project_path"), // Path to project folder
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scans table
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  toolId: integer("tool_id").notNull().references(() => tools.id),
  status: varchar("status").notNull().default("pending"), // pending, running, completed, failed
  result: jsonb("result"),
  targetUrl: varchar("target_url"),
  options: text("options"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wrappers table
export const wrappers = pgTable("wrappers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  language: varchar("language").notNull(),
  filename: varchar("filename").notNull(),
  code: text("code").notNull(),
  path: varchar("path").notNull(),
  options: text("options"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas for inserts
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertScanSchema = createInsertSchema(scans)
  .omit({
    id: true,
    createdAt: true,
    finishedAt: true,
  })
  .extend({
    startedAt: z.date(),
  });

export const insertWrapperSchema = createInsertSchema(wrappers).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Wrapper = typeof wrappers.$inferSelect;
export type InsertWrapper = z.infer<typeof insertWrapperSchema>;
