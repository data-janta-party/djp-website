import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Volunteer applications submitted from the public form. */
export const volunteers = sqliteTable(
  'volunteers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    city: text('city').notNull(),
    interest: text('interest').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('volunteers_email_unique').on(table.email)],
);
