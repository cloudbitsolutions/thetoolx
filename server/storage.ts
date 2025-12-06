import {
  users,
  tools,
  toolUsage,
  reviews,
  urlShortener,
  urlClicks,
  contributions,
  blogPosts,
  userFeedback,
  userMessages,
  userCredits,
  translations,
  subscriptionPricing,
  type User,
  type UpsertUser,
  type Tool,
  type InsertTool,
  type ToolUsage,
  type InsertToolUsage,
  type Review,
  type InsertReview,
  type URLShortener,
  type InsertURLShortener,
  type URLClick,
  type InsertURLClick,
  type Contribution,
  type InsertContribution,
  type BlogPost,
  type InsertBlogPost,
  type UserFeedback,
  type InsertUserFeedback,
  type UserMessage,
  type InsertUserMessage,
  type UserCredit,
  type InsertUserCredit,
  type Translation,
  type InsertTranslation,
  type SubscriptionPricing,
  type InsertSubscriptionPricing,
  type ContactMessage,
  type InsertContactMessage,
  contactMessages,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Subscription operations
  updateUserSubscription(userId: string, subscription: {
    subscriptionType: string;
    subscriptionStatus: string;
    subscriptionEndsAt?: Date;
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
  }): Promise<User>;

  // Tool operations
  getTools(options?: { category?: string; isActive?: boolean; isPremium?: boolean }): Promise<Tool[]>;
  getTool(id: number): Promise<Tool | undefined>;
  getToolBySlug(slug: string): Promise<Tool | undefined>;
  createTool(tool: InsertTool): Promise<Tool>;
  updateTool(id: number, tool: Partial<InsertTool>): Promise<Tool>;
  deleteTool(id: number): Promise<void>;
  incrementToolUsage(toolId: number): Promise<void>;

  // Tool usage tracking
  createToolUsage(usage: InsertToolUsage): Promise<ToolUsage>;
  getToolUsageStats(toolId: number): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number }>;

  // Reviews and ratings
  getReviews(toolId: number, options?: { approved?: boolean }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review>;
  getToolRatingStats(toolId: number): Promise<{ average: number; total: number }>;

  // URL shortener (premium feature)
  createShortUrl(urlData: InsertURLShortener): Promise<URLShortener>;
  getShortUrl(shortCode: string): Promise<URLShortener | undefined>;
  getUserShortUrls(userId: string): Promise<URLShortener[]>;
  deleteShortUrl(id: number, userId: string): Promise<void>;
  incrementUrlClicks(urlId: number): Promise<void>;
  createUrlClick(click: InsertURLClick): Promise<URLClick>;
  getUrlClickStats(urlId: number): Promise<URLClick[]>;
  getUrlAnalytics(userId: string): Promise<{
    totalUrls: number;
    totalClicks: number;
    urls: Array<URLShortener & { clickCount: number; recentClicks: URLClick[] }>;
  }>;

  // Contributions
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  getContributions(options?: { status?: string; type?: string }): Promise<Contribution[]>;
  updateContribution(id: number, contribution: Partial<InsertContribution>): Promise<Contribution>;

  // Admin operations
  // Contact messages operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(options?: { limit?: number }): Promise<ContactMessage[]>;
  deleteContactMessage(id: number): Promise<void>;
  getUserStats(): Promise<{ total: number; premium: number; active: number }>;
  getToolStats(): Promise<{ total: number; active: number; premium: number }>;
  getRevenueStats(): Promise<{ monthly: number; yearly: number; total: number }>;
  getDashboardStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    totalTools: number;
    activeTools: number;
    totalDownloads: number;
    dailyDownloads: number;
    revenue: number;
  }>;
  // Recent activity (tool usage) for admin
  getRecentActivity?(options?: { limit?: number; offset?: number }): Promise<{ activities: any[]; total: number }>;
  getAllUsers(options?: { page?: number; limit?: number; q?: string; subscriptionType?: string; updatedFrom?: Date; updatedTo?: Date }): Promise<{ users: User[]; total: number }>;
  updateUserStatus(userId: string, status: { subscriptionType?: string; subscriptionStatus?: string }): Promise<User>;

  // Blog operations
  getBlogPosts(options?: { limit?: number }): Promise<BlogPost[]>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;

  // User feedback operations
  getUserFeedback(options?: { limit?: number }): Promise<UserFeedback[]>;
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  updateUserFeedback(id: number, feedback: Partial<InsertUserFeedback>): Promise<UserFeedback>;

  // User messages operations
  getUserMessages(): Promise<UserMessage[]>;
  createUserMessage(message: InsertUserMessage): Promise<UserMessage>;
  updateUserMessage(id: number, message: Partial<InsertUserMessage>): Promise<UserMessage>;

  // Translation operations
  createTranslation(translation: InsertTranslation): Promise<Translation>;
  getUserTranslations(userId: string, limit?: number): Promise<Translation[]>;

  // Subscription pricing operations
  getSubscriptionPricing(): Promise<SubscriptionPricing[]>;
  createSubscriptionPricing(pricing: InsertSubscriptionPricing): Promise<SubscriptionPricing>;
  updateSubscriptionPricing(id: number, pricing: Partial<InsertSubscriptionPricing>): Promise<SubscriptionPricing>;
  deleteSubscriptionPricing(id: number): Promise<void>;
  getTranslationHistory(userId: string): Promise<Translation[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        ...userData,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, subscription: {
    subscriptionType: string;
    subscriptionStatus: string;
    subscriptionEndsAt?: Date;
    paymentStatus?: string;
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...subscription,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Tool operations
  async getTools(options?: { category?: string; isActive?: boolean; isPremium?: boolean }): Promise<Tool[]> {
    const conditions = [];
    if (options?.category) conditions.push(eq(tools.category, options.category));
    if (options?.isActive !== undefined) conditions.push(eq(tools.isActive, options.isActive));
    if (options?.isPremium !== undefined) conditions.push(eq(tools.isPremium, options.isPremium));

    // Put tools with tools_order = 0 at the end, then sort by toolsOrder then name
    // Note: raw sql expressions (sql``) do not expose .asc(), so pass the expression directly to orderBy.
    const orderExpr = sql`(CASE WHEN ${tools.toolsOrder} = 0 THEN 1 ELSE 0 END)`;
    if (conditions.length > 0) {
      return await db
        .select()
        .from(tools)
        .where(and(...conditions))
        // Pass raw sql expression directly; then sort by the numeric toolsOrder and name.
        .orderBy(orderExpr, asc(tools.toolsOrder), asc(tools.name));
    }

    return await db
      .select()
      .from(tools)
      .orderBy(orderExpr, asc(tools.toolsOrder), asc(tools.name));
  }

  async getTool(id: number): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool;
  }

  async getToolBySlug(slug: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.slug, slug));
    return tool;
  }

  // Contact messages operations
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }

  async getContactMessages(options?: { limit?: number }): Promise<ContactMessage[]> {
    const baseQuery = db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    const query = typeof options?.limit === 'number'
      ? baseQuery.limit(options.limit)
      : baseQuery;

    return await query;
  }

  async deleteContactMessage(id: number): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  async createTool(tool: InsertTool): Promise<Tool> {
    const [newTool] = await db.insert(tools).values(tool).returning();
    return newTool;
  }

  async updateTool(id: number, tool: Partial<InsertTool>): Promise<Tool> {
    const [updatedTool] = await db
      .update(tools)
      .set({ ...tool, updatedAt: new Date() })
      .where(eq(tools.id, id))
      .returning();
    return updatedTool;
  }

  async deleteTool(id: number): Promise<void> {
    await db.delete(tools).where(eq(tools.id, id));
  }

  async incrementToolUsage(toolId: number): Promise<void> {
    await db
      .update(tools)
      .set({
        usageCount: sql`${tools.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, toolId));
  }

  // Tool usage tracking
  async createToolUsage(usage: InsertToolUsage): Promise<ToolUsage> {
    const [newUsage] = await db.insert(toolUsage).values(usage).returning();
    return newUsage;
  }

  async getToolUsageStats(toolId: number): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(eq(toolUsage.toolId, toolId));

    const [todayCount] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(and(eq(toolUsage.toolId, toolId), sql`${toolUsage.createdAt} >= ${today}`));

    const [weekCount] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(and(eq(toolUsage.toolId, toolId), sql`${toolUsage.createdAt} >= ${thisWeek}`));

    const [monthCount] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(and(eq(toolUsage.toolId, toolId), sql`${toolUsage.createdAt} >= ${thisMonth}`));

    return {
      total: total.count,
      today: todayCount.count,
      thisWeek: weekCount.count,
      thisMonth: monthCount.count,
    };
  }

  // Reviews and ratings
  async getReviews(toolId: number, options?: { approved?: boolean }): Promise<Review[]> {
    const conditions = [eq(reviews.toolId, toolId)];

    if (options?.approved !== undefined) {
      conditions.push(eq(reviews.isApproved, options.approved));
    }

    return await db.select().from(reviews).where(and(...conditions)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async updateReview(id: number, review: Partial<InsertReview>): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview;
  }

  async getToolRatingStats(toolId: number): Promise<{ average: number; total: number }> {
    // Return average rating, total reviews, and total unique users who reviewed
    const [stats] = await db
      .select({
        average: sql`AVG(${reviews.rating})`.mapWith(Number),
        totalReviews: count(),
        // Use SQL to count distinct user IDs
        totalUsers: sql`COUNT(DISTINCT ${reviews.userId})`.mapWith(Number),
      })
      .from(reviews)
      //.where(and(eq(reviews.toolId, toolId), eq(reviews.isApproved, true)));
      .where(eq(reviews.toolId, toolId));

    return {
      // Keep backward compatible field names: average and total (totalReviews)
      average: stats.average || 0,
      total: stats.totalReviews,
      // New field for distinct users
      totalUsers: stats.totalUsers || 0,
    } as any;
  }

  // URL shortener
  async createShortUrl(urlData: InsertURLShortener): Promise<URLShortener> {
    const [newUrl] = await db.insert(urlShortener).values(urlData).returning();
    return newUrl;
  }

  async getShortUrl(shortCode: string): Promise<URLShortener | undefined> {
    const [url] = await db.select().from(urlShortener).where(eq(urlShortener.shortCode, shortCode));
    return url;
  }

  async getUserShortUrls(userId: string): Promise<URLShortener[]> {
    return await db
      .select()
      .from(urlShortener)
      .where(eq(urlShortener.userId, userId))
      .orderBy(desc(urlShortener.createdAt));
  }

  async incrementUrlClicks(urlId: number): Promise<void> {
    await db
      .update(urlShortener)
      .set({
        clickCount: sql`${urlShortener.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(urlShortener.id, urlId));
  }

  async createUrlClick(click: InsertURLClick): Promise<URLClick> {
    const [newClick] = await db.insert(urlClicks).values(click).returning();
    return newClick;
  }

  async getUrlClickStats(urlId: number): Promise<URLClick[]> {
    return await db
      .select()
      .from(urlClicks)
      .where(eq(urlClicks.urlId, urlId))
      .orderBy(desc(urlClicks.createdAt));
  }

  async deleteShortUrl(id: number, userId: string): Promise<void> {
    await db
      .delete(urlShortener)
      .where(and(eq(urlShortener.id, id), eq(urlShortener.userId, userId)));
  }

  async getUrlAnalytics(userId: string): Promise<{
    totalUrls: number;
    totalClicks: number;
    urls: Array<URLShortener & { clickCount: number; recentClicks: URLClick[] }>;
  }> {
    // Get user's URLs
    const urls = await this.getUserShortUrls(userId);

    const baseUrl = process.env.VITE_API_BASE_URL;
    const urlsWithShortenedUrl = urls.map(url => ({
      ...url,
      shortenedUrl: `${baseUrl}/s/${url.shortCode}`,
    }));

    // Get total clicks for all URLs
    const totalClicks = urlsWithShortenedUrl.reduce((sum, url) => sum + (url.clickCount || 0), 0);

    // Get recent clicks for each URL (last 10 clicks)
    const urlsWithClicks = await Promise.all(
      urlsWithShortenedUrl.map(async (url) => {
        const recentClicks = await db
          .select()
          .from(urlClicks)
          .where(eq(urlClicks.urlId, url.id))
          .orderBy(desc(urlClicks.createdAt))
          .limit(10);

        return {
          ...url,
          // Ensure clickCount is a number (not null) to satisfy the return type
          clickCount: Number(url.clickCount || 0),
          recentClicks,
        };
      })
    );

    return {
      totalUrls: urlsWithShortenedUrl.length,
      totalClicks,
      urls: urlsWithClicks,
    };
  }

  // Contributions
  async createContribution(contribution: InsertContribution): Promise<Contribution> {
    const [newContribution] = await db.insert(contributions).values(contribution).returning();
    return newContribution;
  }

  async getContributions(options?: { status?: string; type?: string }): Promise<Contribution[]> {
    const conditions = [];
    if (options?.status) conditions.push(eq(contributions.status, options.status));
    if (options?.type) conditions.push(eq(contributions.type, options.type));

    if (conditions.length > 0) {
      return await db.select().from(contributions).where(and(...conditions)).orderBy(desc(contributions.createdAt));
    }

    return await db.select().from(contributions).orderBy(desc(contributions.createdAt));
  }

  async updateContribution(id: number, contribution: Partial<InsertContribution>): Promise<Contribution> {
    const [updatedContribution] = await db
      .update(contributions)
      .set({ ...contribution, updatedAt: new Date() })
      .where(eq(contributions.id, id))
      .returning();
    return updatedContribution;
  }

  // Admin operations
  async getUserStats(): Promise<{ total: number; premium: number; active: number }> {
    const [total] = await db.select({ count: count() }).from(users);
    const [premium] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.subscriptionType} != 'free'`);
    const [active] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscriptionStatus, 'active'));

    return {
      total: total.count,
      premium: premium.count,
      active: active.count,
    };
  }

  async getToolStats(): Promise<{ total: number; active: number; premium: number }> {
    const [total] = await db.select({ count: count() }).from(tools);
    const [active] = await db.select({ count: count() }).from(tools).where(eq(tools.isActive, true));
    const [premium] = await db.select({ count: count() }).from(tools).where(eq(tools.isPremium, true));

    return {
      total: total.count,
      active: active.count,
      premium: premium.count,
    };
  }

  async getRevenueStats(): Promise<{ monthly: number; yearly: number; total: number }> {
    // Compute revenue using configured prices from `subscription_pricing`.
    // We convert all plan prices to USD and compute revenue for active subscriptions.
    // Assumptions:
    // - Use users with `subscriptionStatus === 'active'` to count currently-paying users.
    // - `subscription_pricing` has rows with `planType` ('monthly'|'yearly'), `price` (decimal) and `currency` (ISO code).
    // - A small, internal currency->USD rate map is used for conversions. If an unknown currency is found,
    //   we default to treating it as USD (rate = 1). Add or update rates as needed or wire up a currency rates service.

    // Fetch configured pricing
    const pricingRows = await db.select().from(subscriptionPricing);

    const findPrice = (plan: string) => pricingRows.find(p => p.planType === plan);
    const monthlyPlan = findPrice('monthly');
    const yearlyPlan = findPrice('yearly');

    // Currency conversion rates (1 unit of currency -> USD). Keep this list small and editable.
    const conversionRates: Record<string, number> = {
      USD: 1,
      INR: 0.012, // 1 INR ~= 0.012 USD
      EUR: 1.1,   // 1 EUR ~= 1.10 USD
      GBP: 1.25,  // 1 GBP ~= 1.25 USD
      // add more currencies here if required
    };

    const toUSD = (price: any, currency?: string) => {
      const num = price ? Number(price) : 0;
      const cur = (currency || 'USD').toUpperCase();
      const rate = conversionRates[cur] ?? 1;
      return num * rate;
    };

    const monthlyPriceUSD = toUSD(monthlyPlan?.price, monthlyPlan?.currency ?? 'USD');
    const yearlyPriceUSD = toUSD(yearlyPlan?.price, yearlyPlan?.currency ?? 'USD');

    // Count active subscribers for each plan type
    const [monthlyUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscriptionType, 'monthly'));

    const [yearlyUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscriptionType, 'yearly'));

    const monthlyRevenue = monthlyUsers.count * monthlyPriceUSD;
    const yearlyRevenue = yearlyUsers.count * yearlyPriceUSD;

    const monthlyRevenueRounded = Number(monthlyRevenue.toFixed(2));
    const yearlyRevenueRounded = Number(yearlyRevenue.toFixed(2));
    const totalRevenueRounded = Number((monthlyRevenueRounded + yearlyRevenueRounded).toFixed(2));

    return {
      monthly: monthlyRevenueRounded,
      yearly: yearlyRevenueRounded,
      total: totalRevenueRounded,
    };
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    totalTools: number;
    activeTools: number;
    totalDownloads: number;
    dailyDownloads: number;
    revenue: number;
    loggedInToday: number;
    loggedInYesterday: number;
    loggedInLastMonth: number;
    loggedInLastYear: number;
    toolUsageToday: number;
    toolUsageYesterday: number;
    toolUsageLastMonth: number;
    toolUsageLastYear: number;
  }> {
    const userStats = await this.getUserStats();
    const toolStats = await this.getToolStats();
    const revenueStats = await this.getRevenueStats();

    const [totalDownloads] = await db.select({ count: count() }).from(toolUsage);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailyDownloads] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(sql`${toolUsage.createdAt} >= ${today}`);

    // Login counts using users.updatedAt
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    lastMonth.setHours(0, 0, 0, 0);
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    lastYear.setHours(0, 0, 0, 0);

    const [todayLogins] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.updatedAt} >= ${today}`);

    const [yesterdayLogins] = await db
      .select({ count: count() })
      .from(users)
      .where(and(sql`${users.updatedAt} >= ${yesterday}`, sql`${users.updatedAt} < ${today}`));

    const [lastMonthLogins] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.updatedAt} >= ${lastMonth}`);

    const [lastYearLogins] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.updatedAt} >= ${lastYear}`);

    // Tool usage counts using toolUsage.createdAt
    const [toolUsageToday] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(sql`${toolUsage.createdAt} >= ${today}`);

    const [toolUsageYesterday] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(and(sql`${toolUsage.createdAt} >= ${yesterday}`, sql`${toolUsage.createdAt} < ${today}`));

    const [toolUsageLastMonth] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(sql`${toolUsage.createdAt} >= ${lastMonth}`);

    const [toolUsageLastYear] = await db
      .select({ count: count() })
      .from(toolUsage)
      .where(sql`${toolUsage.createdAt} >= ${lastYear}`);

    return {
      totalUsers: userStats.total,
      premiumUsers: userStats.premium,
      totalTools: toolStats.total,
      activeTools: toolStats.active,
      totalDownloads: totalDownloads.count,
      dailyDownloads: dailyDownloads.count,
      revenue: revenueStats.total,
      // Login counts based on users.updatedAt
      loggedInToday: todayLogins.count || 0,
      loggedInYesterday: yesterdayLogins.count || 0,
      loggedInLastMonth: lastMonthLogins.count || 0,
      loggedInLastYear: lastYearLogins.count || 0,
      toolUsageToday: toolUsageToday.count || 0,
      toolUsageYesterday: toolUsageYesterday.count || 0,
      toolUsageLastMonth: toolUsageLastMonth.count || 0,
      toolUsageLastYear: toolUsageLastYear.count || 0,
    };
  }

  // Recent activity (tool usage) for admin (paginated)
  async getRecentActivity(options?: { limit?: number; offset?: number }): Promise<{ activities: any[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Run two queries in parallel: one for total count, one for paginated rows
    const totalPromise = db.select({ count: count() }).from(toolUsage);

    const rowsPromise = db
      .select({
        id: toolUsage.id,
        toolId: toolUsage.toolId,
        userId: toolUsage.userId,
        createdAt: toolUsage.createdAt,
        toolName: tools.name,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(toolUsage)
      .leftJoin(tools, eq(toolUsage.toolId, tools.id))
      .leftJoin(users, eq(toolUsage.userId, users.id))
      .orderBy(desc(toolUsage.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult, rows] = await Promise.all([totalPromise, rowsPromise]);

    const total = Array.isArray(totalResult) && totalResult[0] ? (totalResult[0] as any).count || 0 : 0;

    const activities = rows.map((r: any) => ({
      id: r.id,
      toolId: r.toolId,
      toolName: r.toolName,
      userId: r.userId,
      userEmail: r.userEmail,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      createdAt: r.createdAt,
    }));

    return { activities, total };
  }

  async getAllUsers(options?: { page?: number; limit?: number; q?: string; subscriptionType?: string; updatedFrom?: Date; updatedTo?: Date }): Promise<{ users: User[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (options?.subscriptionType) {
      conditions.push(eq(users.subscriptionType, options.subscriptionType));
    }
    if (options?.q) {
      const q = `%${options.q}%`;
      conditions.push(or(like(users.firstName, q), like(users.lastName, q), like(users.email, q)));
    }
    if (options?.updatedFrom) {
      conditions.push(sql`${users.updatedAt} >= ${options.updatedFrom}`);
    }
    if (options?.updatedTo) {
      // To include the entire day for a date-only value, ensure time is end of day if the caller supplied a date without time.
      conditions.push(sql`${users.updatedAt} <= ${options.updatedTo}`);
    }

    if (conditions.length > 0) {
      const [usersResult, totalResult] = await Promise.all([
        db.select().from(users).where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(users.updatedAt)),
        db.select({ count: count() }).from(users).where(and(...conditions)),
      ]);

      return {
        users: usersResult,
        total: totalResult[0].count,
      };
    }

    const [usersResult, totalResult] = await Promise.all([
      db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.updatedAt)),
      db.select({ count: count() }).from(users),
    ]);

    return {
      users: usersResult,
      total: totalResult[0].count,
    };
  }

  async updateUserStatus(userId: string, status: { subscriptionType?: string; subscriptionStatus?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Blog operations
  async getBlogPosts(options?: { limit?: number }): Promise<BlogPost[]> {
    const query = db.select().from(blogPosts);
    if (options?.limit) {
      return await query.limit(options.limit).orderBy(desc(blogPosts.createdAt));
    }
    return await query.orderBy(desc(blogPosts.createdAt));
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    // If an authorId is provided, verify the user exists; otherwise remove authorId to avoid FK errors.
    const payload: any = { ...post };
    if (payload.authorId) {
      const [user] = await db.select().from(users).where(eq(users.id, payload.authorId)).limit(1);
      if (!user) {
        delete payload.authorId;
      }
    }

    // Ensure updatedAt/createdAt handled by DB defaults; insert provided fields.
    const [newPost] = await db.insert(blogPosts).values(payload).returning();
    return newPost;
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const payload: any = { ...post };
    if (payload.authorId) {
      const [user] = await db.select().from(users).where(eq(users.id, payload.authorId)).limit(1);
      if (!user) {
        delete payload.authorId;
      }
    }

    const [updatedPost] = await db
      .update(blogPosts)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updatedPost;
  }

  async getBlogPostById(id: number): Promise<BlogPost> {
    const [post] = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);

    return post;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // User feedback operations
  async getUserFeedback(options?: { limit?: number }): Promise<UserFeedback[]> {
    const query = db.select().from(userFeedback);
    if (options?.limit) {
      return await query.limit(options.limit).orderBy(desc(userFeedback.createdAt));
    }
    return await query.orderBy(desc(userFeedback.createdAt));
  }

  async createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [newFeedback] = await db.insert(userFeedback).values(feedback).returning();
    return newFeedback;
  }

  async updateUserFeedback(id: number, feedback: Partial<InsertUserFeedback>): Promise<UserFeedback> {
    const [updatedFeedback] = await db
      .update(userFeedback)
      .set({ ...feedback, updatedAt: new Date() })
      .where(eq(userFeedback.id, id))
      .returning();
    return updatedFeedback;
  }

  // User messages operations
  async getUserMessages(): Promise<UserMessage[]> {
    return await db.select().from(userMessages).orderBy(desc(userMessages.createdAt));
  }

  async createUserMessage(message: InsertUserMessage): Promise<UserMessage> {
    const [newMessage] = await db.insert(userMessages).values(message).returning();
    return newMessage;
  }

  async updateUserMessage(id: number, message: Partial<InsertUserMessage>): Promise<UserMessage> {
    const [updatedMessage] = await db
      .update(userMessages)
      .set({ ...message, updatedAt: new Date() })
      .where(eq(userMessages.id, id))
      .returning();
    return updatedMessage;
  }

  // Translation operations
  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    const [newTranslation] = await db.insert(translations).values(translation).returning();
    return newTranslation;
  }

  async getUserTranslations(userId: string, limit?: number): Promise<Translation[]> {
    const query = db
      .select()
      .from(translations)
      .where(eq(translations.userId, userId))
      .orderBy(desc(translations.createdAt));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  async getTranslationHistory(userId: string): Promise<Translation[]> {
    return await db
      .select()
      .from(translations)
      .where(eq(translations.userId, userId))
      .orderBy(desc(translations.createdAt))
      .limit(50); // Return last 50 translations
  }

  // Subscription pricing operations
  async getSubscriptionPricing(): Promise<SubscriptionPricing[]> {
    return await db
      .select()
      .from(subscriptionPricing)
      .orderBy(asc(subscriptionPricing.planType), asc(subscriptionPricing.price));
  }

  async createSubscriptionPricing(pricing: InsertSubscriptionPricing): Promise<SubscriptionPricing> {
    const [newPricing] = await db
      .insert(subscriptionPricing)
      .values(pricing)
      .returning();
    return newPricing;
  }

  async updateSubscriptionPricing(id: number, pricing: Partial<InsertSubscriptionPricing>): Promise<SubscriptionPricing> {
    const [updatedPricing] = await db
      .update(subscriptionPricing)
      .set({ ...pricing, updatedAt: new Date() })
      .where(eq(subscriptionPricing.id, id))
      .returning();
    return updatedPricing;
  }

  async deleteSubscriptionPricing(id: number): Promise<void> {
    await db
      .delete(subscriptionPricing)
      .where(eq(subscriptionPricing.id, id));
  }
}

export const storage = new DatabaseStorage();
