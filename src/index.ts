import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { db } from "./drizzle";
import { avg, sum, eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sessions } from "./schema";

const app = new Hono();

const userIdValidator = zValidator(
  "header",
  z.object({
    userId: z.string().uuid(),
  })
);

app.post(
  "/courses/:courseId",
  userIdValidator,
  zValidator(
    "param",
    z.object({
      courseId: z.string().uuid(),
    })
  ),
  zValidator(
    "json",
    z.object({
      sessionId: z.string().uuid(),
      totalModulesStudied: z.number().int().positive(),
      averageScore: z.number().int().positive(),
      timeStudied: z.number().int().positive(),
    })
  ),
  async (c) => {
    const { userId } = c.req.valid("header");
    const { courseId } = c.req.valid("param");
    const validated = c.req.valid("json");
    await db.insert(sessions).values({
      courseId,
      userId,
      sessionId: validated.sessionId,
      totalModulesStudied: validated.totalModulesStudied,
      averageScore: validated.averageScore,
      timeStudied: validated.timeStudied,
    });
    return c.json(validated);
  }
);

app.get("/courses/:courseId", userIdValidator, async (c) => {
  const { userId } = c.req.valid("header");
  const courseId = c.req.param("courseId");

  const dbResponse = await db
    .select({
      totalModulesStudied: sum(sessions.totalModulesStudied),
      averageScore: avg(sessions.averageScore),
      timeStudied: sum(sessions.timeStudied),
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.courseId, courseId)));

  const result = dbResponse[0]

  if (!result) {
    return c.json({
      totalModulesStudied: 0,
      averageScore: 0,
      timeStudied: 0,
    });
  }

  return c.json(result);
});

app.get(
  "/courses/:courseId/sessions/:sessionId",
  userIdValidator,
  zValidator(
    "param",
    z.object({
      courseId: z.string().uuid(),
      sessionId: z.string().uuid(),
    })
  ),
  async (c) => {
    const sessionId = c.req.param("sessionId");
    const courseId = c.req.param("courseId");
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.courseId, courseId),
        eq(sessions.sessionId, sessionId)
      ),
    });
    if (!session) return c.json({ error: "Session not found" }, 404);

    const { totalModulesStudied, averageScore, timeStudied } = session;

    return c.json({
      sessionId,
      totalModulesStudied,
      averageScore,
      timeStudied,
    });
  }
);

export const handler = handle(app);
