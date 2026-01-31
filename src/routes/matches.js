import { Router } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { matches } from '../db/schema.js';
import { db } from '../db/db.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchRouter = Router();

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    const MAX_LIMIT = 100;
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid payload.',
            details: JSON.stringify(parsed.error)
        });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit)
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: "Failed to list matches" })
    }

});

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid payload.',
            details: JSON.stringify(parsed.error)
        });
    }

    const { sport, homeTeam, awayTeam, startTime, endTime, homeScore, awayScore } = parsed.data;

    try {
        const [event] = await db.insert(matches).values({
            sport,
            homeTeam,
            awayTeam,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime)
        }).returning();

        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({ data: event });

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error creating match:', error);
        } else {
            console.error('Error creating match:', error.message);
        }

        res.status(500).json({
            error: 'Failed to create a match.'
        });
    }
});