import { relations } from 'drizzle-orm';
import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  sessionId: uuid('session_id').primaryKey().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  totalModulesStudied: integer('total_modules_studied').notNull(),
  averageScore: integer('average_score').notNull(),
  timeStudied: integer('time_studied').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const courseRelations = relations(courses, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [sessions.courseId],
    references: [courses.id],
  }),
}));
