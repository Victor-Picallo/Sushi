import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const restaurantsTable = pgTable(
  'restaurants',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    country: text('country').notNull().default('España'),
    province: text('province').notNull().default(''),
    city: text('city').notNull().default(''),
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('restaurants_geo_idx').on(table.country, table.province, table.city),
  ],
);

export const restaurantMenusTable = pgTable('restaurant_menus', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id')
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  notes: text('notes').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roomsTable = pgTable('rooms', {
  id: text('id').primaryKey(),
  creatorId: text('creator_id').notNull(),
  creatorName: text('creator_name').notNull(),
  creatorToken: text('creator_token').notNull(),
  restaurantId: integer('restaurant_id').references(() => restaurantsTable.id, {
    onDelete: 'set null',
  }),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const roomPlayersTable = pgTable(
  'room_players',
  {
    id: serial('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => roomsTable.id, { onDelete: 'cascade' }),
    socketId: text('socket_id').notNull(),
    playerToken: text('player_token').notNull(),
    name: text('name').notNull(),
    score: integer('score').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('room_players_room_token_idx').on(table.roomId, table.playerToken),
  ],
);

export const userProfilesTable = pgTable('user_profiles', {
  playerToken: text('player_token').primaryKey(),
  authUserId: text('auth_user_id').unique(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('user'),
  avatarUrl: text('avatar_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sushiReviewsTable = pgTable('sushi_reviews', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id')
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: 'cascade' }),
  playerToken: text('player_token').notNull(),
  authorName: text('author_name').notNull(),
  pieceName: text('piece_name').notNull(),
  tasteScore: integer('taste_score').notNull(),
  sizeScore: integer('size_score').notNull(),
  presentationScore: integer('presentation_score').notNull(),
  comment: text('comment').notNull().default(''),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
