import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  theme: text('theme').notNull().default('system'),
  createdAt: createdAt(),
}, t => [uniqueIndex('users_email_idx').on(t.email)])

/** Listes / tableaux : une pièce (Salon, Cuisine…) ou un thème libre. */
export const boards = pgTable('boards', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('autre'),
  position: integer('position').notNull().default(0),
  createdAt: createdAt(),
}, t => [index('boards_user_idx').on(t.userId)])

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  /** Page du produit chez le marchand. */
  url: text('url'),
  /** Identifiant de la photo : fichiers `<image>.webp` et `<image>-thumb.webp` dans UPLOAD_DIR. */
  image: text('image'),
  /** Largeur / hauteur de la photo : réserve la place dans la grille avant chargement. */
  imageRatio: real('image_ratio'),
  brand: text('brand'),
  /** Nom du site marchand (« IKEA », « maisonsdumonde.com »…). */
  merchant: text('merchant'),
  /** Prix actuel, en centimes. */
  price: integer('price'),
  /** Prix barré quand une promotion est détectée, en centimes. */
  originalPrice: integer('original_price'),
  currency: text('currency').notNull().default('EUR'),
  dimensions: text('dimensions'),
  availability: text('availability').notNull().default('unknown'),
  color: text('color'),
  notes: text('notes'),
  quantity: integer('quantity').notNull().default(1),
  purchased: boolean('purchased').notNull().default(false),
  /** Dernière lecture de la page marchande (prix, stock). */
  checkedAt: timestamp('checked_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('products_user_idx').on(t.userId, t.createdAt)])

export const productBoards = pgTable('product_boards', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  boardId: integer('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, t => [primaryKey({ columns: [t.productId, t.boardId] }), index('product_boards_board_idx').on(t.boardId)])

/** Historique des prix relevés (à l'ajout, puis à chaque actualisation). */
export const priceChecks = pgTable('price_checks', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  price: integer('price'),
  originalPrice: integer('original_price'),
  availability: text('availability').notNull().default('unknown'),
  createdAt: createdAt(),
}, t => [index('price_checks_product_idx').on(t.productId, t.createdAt)])

export const productsRelations = relations(products, ({ many }) => ({
  productBoards: many(productBoards),
  priceChecks: many(priceChecks),
}))

export const boardsRelations = relations(boards, ({ many }) => ({
  productBoards: many(productBoards),
}))

export const productBoardsRelations = relations(productBoards, ({ one }) => ({
  product: one(products, { fields: [productBoards.productId], references: [products.id] }),
  board: one(boards, { fields: [productBoards.boardId], references: [boards.id] }),
}))

export const priceChecksRelations = relations(priceChecks, ({ one }) => ({
  product: one(products, { fields: [priceChecks.productId], references: [products.id] }),
}))
