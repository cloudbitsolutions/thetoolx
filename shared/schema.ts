import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  decimal,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"), // For local auth
  googleId: varchar("google_id"), // For Google OAuth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionType: varchar("subscription_type").default("free"), // free, monthly, yearly
  subscriptionStatus: varchar("subscription_status").default("inactive"), // active, cancelled, expired
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  razorpayCustomerId: varchar("razorpay_customer_id"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id"),
  paymentStatus: varchar("payment_status").default("unpaid"), // unpaid, completed, pending, failed
  language: varchar("language").default("en"), // en, hi
  theme: varchar("theme").default("light"), // light, dark
  role: varchar("role").default("user"), // user, admin
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tools table
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  category: varchar("category").notNull(), // video, converter, utility
  description: text("description"),
  icon: varchar("icon"),
  isPremium: boolean("is_premium").default(false),
  isLoginRequired: boolean("is_login_required").default(false),
  isFeatured: boolean("is_featured").default(false),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  toolsOrder: integer("tools_order").default(1),
  authorId: varchar("author_id").references(() => users.id),
  seoTitle: varchar("seo_title"),
  seoDescription: text("seo_description"),
  content: text("content"), // Rich text content for tool page
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tool usage tracking
export const toolUsage = pgTable("tool_usage", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").references(() => tools.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").references(() => tools.id),
  userId: varchar("user_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// URL shortener (premium feature)
export const urlShortener = pgTable("url_shortener", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  originalUrl: text("original_url").notNull(),
  shortCode: varchar("short_code").unique().notNull(),
  title: varchar("title"),
  clickCount: integer("click_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// URL click tracking
export const urlClicks = pgTable("url_clicks", {
  id: serial("id").primaryKey(),
  urlId: integer("url_id").references(() => urlShortener.id),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  referer: varchar("referer"),
  country: varchar("country"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User contributions/feedback
export const contributions = pgTable("contributions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // bug_report, feature_request, tool_suggestion
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected, implemented
  priority: varchar("priority").default("medium"), // low, medium, high
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tools: many(tools),
  toolUsage: many(toolUsage),
  reviews: many(reviews),
  urlShortener: many(urlShortener),
  contributions: many(contributions),
  blogPosts: many(blogPosts),
  userFeedback: many(userFeedback),
  sentMessages: many(userMessages, { relationName: "sentMessages" }),
  receivedMessages: many(userMessages, { relationName: "receivedMessages" }),
  userCredits: many(userCredits),
  translations: many(translations),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  author: one(users, { fields: [tools.authorId], references: [users.id] }),
  usage: many(toolUsage),
  reviews: many(reviews),
}));

export const toolUsageRelations = relations(toolUsage, ({ one }) => ({
  tool: one(tools, { fields: [toolUsage.toolId], references: [tools.id] }),
  user: one(users, { fields: [toolUsage.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tool: one(tools, { fields: [reviews.toolId], references: [tools.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const urlShortenerRelations = relations(urlShortener, ({ one, many }) => ({
  user: one(users, { fields: [urlShortener.userId], references: [users.id] }),
  clicks: many(urlClicks),
}));

export const urlClicksRelations = relations(urlClicks, ({ one }) => ({
  url: one(urlShortener, { fields: [urlClicks.urlId], references: [urlShortener.id] }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  user: one(users, { fields: [contributions.userId], references: [users.id] }),
  assignedUser: one(users, { fields: [contributions.assignedTo], references: [users.id] }),
}));

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").unique().notNull(),
  category: varchar("category"), // tutorials, tools, updates, tips, etc.
  author: varchar("author"), // display name of author (string)
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: varchar("cover_image"),
  //authorId: varchar("author_id").references(() => users.id),
  authorId: varchar("author_id"),
  status: varchar("status").default("draft"), // draft, published, archived
  featured: boolean("featured").default(false),
  seoTitle: varchar("seo_title"),
  seoDescription: text("seo_description"),
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User feedback table
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  toolId: integer("tool_id").references(() => tools.id),
  type: varchar("type").notNull(), // bug, feature_request, general, rating
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"), // 1-5 stars
  email: varchar("email"),
  status: varchar("status").default("pending"), // pending, in_progress, resolved, closed
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User messages table (for admin to send messages to users)
export const userMessages = pgTable("user_messages", {
  id: serial("id").primaryKey(),
  toUserId: varchar("to_user_id").references(() => users.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"), // info, warning, success, error
  priority: varchar("priority").default("normal"), // low, normal, high
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credits/tokens table for premium features
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  creditType: varchar("credit_type").notNull(), // download, conversion, api_call
  amount: integer("amount").notNull(),
  description: text("description"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Translation history table
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  sourceLang: varchar("source_lang").notNull(),
  targetLang: varchar("target_lang").notNull(),
  detectedLang: varchar("detected_lang"),
  confidence: decimal("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription pricing table
export const subscriptionPricing = pgTable("subscription_pricing", {
  id: serial("id").primaryKey(),
  planName: varchar("plan_name").notNull(),
  planType: varchar("plan_type").notNull(), // monthly, yearly
  price: decimal("price").notNull(),
  currency: varchar("currency").default("USD"),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog post relations
export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}));

// User feedback relations
export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, {
    fields: [userFeedback.userId],
    references: [users.id],
  }),
  tool: one(tools, {
    fields: [userFeedback.toolId],
    references: [tools.id],
  }),
}));

// User messages relations
export const userMessagesRelations = relations(userMessages, ({ one }) => ({
  toUser: one(users, {
    fields: [userMessages.toUserId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [userMessages.fromUserId],
    references: [users.id],
  }),
}));

// User credits relations
export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

// Translation relations
export const translationsRelations = relations(translations, ({ one }) => ({
  user: one(users, {
    fields: [translations.userId],
    references: [users.id],
  }),
}));

// Subscription pricing relations
export const subscriptionPricingRelations = relations(subscriptionPricing, ({ many }) => ({
  users: many(users),
}));

// Contact messages table (for users to contact admin)
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name"),
  email: varchar("email").notNull(),
  subject: varchar("subject"),
  category: varchar("category"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertToolSchema = createInsertSchema(tools);
export const insertToolUsageSchema = createInsertSchema(toolUsage);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertUrlShortenerSchema = createInsertSchema(urlShortener);
export const insertUrlClickSchema = createInsertSchema(urlClicks);
export const insertContributionSchema = createInsertSchema(contributions);
export const insertBlogPostSchema = createInsertSchema(blogPosts);
export const insertUserFeedbackSchema = createInsertSchema(userFeedback);
export const insertUserMessageSchema = createInsertSchema(userMessages);
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;
export const insertUserCreditSchema = createInsertSchema(userCredits);
export const insertTranslationSchema = createInsertSchema(translations);
export const insertSubscriptionPricingSchema = createInsertSchema(subscriptionPricing);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type InsertTool = typeof tools.$inferInsert;
export type ToolUsage = typeof toolUsage.$inferSelect;
export type InsertToolUsage = typeof toolUsage.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
export type URLShortener = typeof urlShortener.$inferSelect;
export type InsertURLShortener = typeof urlShortener.$inferInsert;
export type URLClick = typeof urlClicks.$inferSelect;
export type InsertURLClick = typeof urlClicks.$inferInsert;
export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = typeof contributions.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;
export type UserMessage = typeof userMessages.$inferSelect;
export type InsertUserMessage = typeof userMessages.$inferInsert;
export type UserCredit = typeof userCredits.$inferSelect;
export type InsertUserCredit = typeof userCredits.$inferInsert;
export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;
export type SubscriptionPricing = typeof subscriptionPricing.$inferSelect;
export type InsertSubscriptionPricing = typeof subscriptionPricing.$inferInsert;
