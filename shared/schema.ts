import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
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

// New schemas for gamification

// Define achievement types
export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  points: z.number(),
  category: z.enum(['testing', 'accessibility', 'performance', 'design']),
  criteria: z.object({
    type: z.enum(['count', 'score', 'completion']),
    target: z.number(),
    metric: z.string()
  })
});

// Define user progress type
export const userProgressSchema = z.object({
  userId: z.string(),
  totalPoints: z.number(),
  level: z.number(),
  achievements: z.array(z.string()), // Achievement IDs
  stats: z.object({
    sitesAnalyzed: z.number(),
    testsRun: z.number(),
    issuesFixed: z.number(),
    perfectScores: z.number()
  }),
  lastActive: z.string() // ISO date string
});

// Database tables for gamification
export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  points: integer("points").notNull(),
  category: text("category").notNull(),
  criteria: jsonb("criteria").notNull().$type<{
    type: 'count' | 'score' | 'completion',
    target: number,
    metric: string
  }>()
});

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  totalPoints: integer("total_points").notNull().default(0),
  level: integer("level").notNull().default(1),
  achievements: jsonb("achievements").notNull().$type<string[]>().default([]),
  stats: jsonb("stats").notNull().$type<{
    sitesAnalyzed: number,
    testsRun: number,
    issuesFixed: number,
    perfectScores: number
  }>(),
  lastActive: timestamp("last_active").notNull().defaultNow()
});

// Create insert schemas
export const insertDeviceSchema = createInsertSchema(devices);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserProgressSchema = createInsertSchema(userProgress);

// Export types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type ScreenSize = z.infer<typeof screenSizeSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;