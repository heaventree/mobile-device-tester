import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define device screen size type
export const screenSizeSchema = z.object({
  width: z.number(),
  height: z.number()
});

// Define device type
export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['phone', 'tablet', 'laptop']),
  manufacturer: z.string(),
  screenSizes: z.array(screenSizeSchema),
  osVersions: z.array(z.string())
});

export const devices = pgTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  manufacturer: text("manufacturer").notNull(),
  screenSizes: jsonb("screen_sizes").notNull().$type<Array<{width: number, height: number}>>(),
  osVersions: jsonb("os_versions").notNull().$type<string[]>()
});

export const insertDeviceSchema = createInsertSchema(devices);

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type ScreenSize = z.infer<typeof screenSizeSchema>;
