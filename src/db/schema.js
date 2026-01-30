import { pgTable, text, timestamp, integer, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";

// Enums
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "live", "finished"]);

// Matches Table
export const matches = pgTable("matches", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sport: text("sport").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    homeScore: integer("home_score").default(0),
    awayScore: integer("away_score").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Commentary Table
export const commentary = pgTable("commentary", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchId: integer("match_id").references(() => matches.id).notNull(),
    minute: integer("minute"),
    sequence: integer("sequence"),
    period: text("period"),
    eventType: text("event_type"),
    actor: text("actor"),
    team: text("team"),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
