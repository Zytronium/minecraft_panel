import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

// -------- server config --------
export const serverConfig = sqliteTable("server_config", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  key:         text("key").notNull().unique(),
  value:       text("value").notNull(),
  updatedAt:   text("updated_at").notNull().default(sql`(datetime('now'))`),
})

// -------- console log history --------
export const consoleLogs = sqliteTable("console_logs", {
  id:        integer("id").primaryKey({ autoIncrement: true }),
  message:   text("message").notNull(),
  source:    text("source", { enum: ["stdout", "stderr", "system"] }).notNull().default("stdout"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
})