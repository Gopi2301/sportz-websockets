import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { listCommentaryQuerySchema, createCommentarySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRoutes = Router({ mergeParams: true });

commentaryRoutes.get('/', async (req, res) => {
    try {
        const params = matchIdParamSchema.parse(req.params);
        const query = listCommentaryQuerySchema.parse(req.query);

        const limit = query.limit || 100;

        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, params.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.status(200).json(results);
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error fetching commentary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

commentaryRoutes.post('/', async (req, res) => {
    try {
        const params = matchIdParamSchema.parse(req.params);
        const body = createCommentarySchema.parse(req.body);

        const [result] = await db.insert(commentary).values({
            matchId: params.id,
            ...body
        }).returning();

        try {
            // Trigger WebSocket broadcast
            if (res.app.locals.broadcastCommentary) {
                res.app.locals.broadcastCommentary(result.matchId, result);
            }
        } catch (error) {
            console.error("Error broadcasting commentary:", error);
        }

        res.status(201).json(result);

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error creating commentary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
