import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { db } from "./drizzle";
import { todo } from "./stats.sql";

const app = new Hono()

app.get('/', async (c) => {
    console.log('Received request')
    const results = await db.select().from(todo).execute()
    return c.json(results)
})

app.post('/', async (c) => {
    console.log('post')
    const result = await db
        .insert(todo)
        .values({ title: "Todo", description: crypto.randomUUID() })
        .returning()
        .execute();
    return c.json(result)
})

export const handler = handle(app)