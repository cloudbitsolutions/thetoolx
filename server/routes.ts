import type { Express, RequestHandler } from "express";
import express from 'express';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import Razorpay from "razorpay";
import crypto from "crypto";
import {
  insertReviewSchema,
  insertUrlShortenerSchema,
  insertContributionSchema,
  insertTranslationSchema,
} from "@shared/schema";
import axios from "axios";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// ESM/CommonJS-compatible __filename / __dirname helpers
// Try to use import.meta.url in ESM environments. If that's not available
// (for example when the app is built/bundled into CommonJS for production),
// fall back to sensible defaults using process.argv or process.cwd().
let __filename = '';
let __dirname = '';
try {
  // import.meta.url exists in ESM; in CommonJS this will throw.
  // @ts-ignore - import.meta may not be defined in some TS/Node targets
  __filename = fileURLToPath((import.meta as any).url);
  __dirname = path.dirname(__filename);
} catch (err) {
  // Fallback: use the executed script path or current working directory.
  __filename = process.argv && process.argv.length > 1 ? process.argv[1] : '';
  if (!__filename) {
    // As a last resort, assume server.js in current working dir (production bundle)
    __filename = path.join(process.cwd(), 'server.js');
  }
  __dirname = path.dirname(__filename) || process.cwd();
}
import FormData from "form-data";
import translate from "google-translate-api-x";
import { eq, and } from "drizzle-orm";

const PYSERVER_URL = process.env.PYSERVER_URL || "http://localhost:8000";

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_zsoe5M8iszfWGq",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "EgRGWst3pqhFdAqBD70TWVRI",
});

// Simple admin middleware for demo purposes
const isAdmin: RequestHandler = (req, res, next) => {
  // For demo purposes, we'll accept any request to admin endpoints
  // In production, this would check proper admin authentication
  console.log("Admin endpoint accessed:", req.path);
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin: delete contact message
  app.delete("/api/admin/contact-messages/:id", isAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });
      await storage.deleteContactMessage(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete contact message error:", err);
      res.status(500).json({ success: false, message: "Failed to delete contact message" });
    }
  });
  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, category, message } = req.body;
      if (!email || typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({ message: "Email is required" });
      }
      const contactMsg = await storage.createContactMessage({
        name,
        email,
        subject,
        category,
        message,
      });
      res.json({ success: true, contactMsg });
    } catch (err) {
      console.error("Contact form error:", err);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Admin: view contact messages
  app.get("/api/admin/contact-messages", isAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const messages = await storage.getContactMessages({ limit: limit ? Number(limit) : undefined });
      res.json({ success: true, messages });
    } catch (err) {
      console.error("Fetch contact messages error:", err);
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

    // Admin: recent activity (tool usage) with pagination
    app.get("/api/admin/recent-activity", isAdmin, async (req, res) => {
      try {
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const result = await storage.getRecentActivity({ limit, offset });
        res.json({ success: true, activities: result.activities, total: result.total });
      } catch (err) {
        console.error("Fetch recent activity error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch recent activity" });
      }
    });
  // Auth middleware
  await setupAuth(app);

  // Auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    try {
      const hasFn = typeof req.isAuthenticated === 'function';
      const auth = hasFn ? req.isAuthenticated() : false;
      console.log('[DEBUG] isAuthenticated middleware:', { path: req.path, isAuthenticated: auth, userId: req.user?.id, cookie: String(req.headers.cookie || '').slice(0,200) });
      if (!auth) {
        // Log before returning so we can see why requests are 401
        console.warn('[DEBUG] Unauthorized request blocked by isAuthenticated middleware for', req.path);
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (e) {
      console.error('Error in isAuthenticated middleware debug logging', e);
    }
    next();
  };

  // Debug route: show auth status and incoming cookie for troubleshooting (DEV only)
  app.get('/api/debug/session', (req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).json({ message: 'Not found' });
    try {
      const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;
      return res.json({ isAuthenticated: isAuth, userId: req.user?.id || null, cookie: String(req.headers.cookie || '').slice(0,200) });
    } catch (err) {
      console.error('Debug session route error:', err);
      return res.status(500).json({ message: 'Debug route failed' });
    }
  });

  // Premium tool access middleware
  const requirePremiumForTool = async (req: any, res: any, next: any) => {
    try {
      const toolId = parseInt(req.params.id);
      const userId = req.user ? req.user.id : null;

      // Get tool details
      const tool = await storage.getTool(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      // If tool is not premium, allow access
      if (!tool.isPremium && userId == null) {
        return next();
      }

      // If tool is premium, check user subscription
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionType === "free") {
        return res.status(403).json({
          message: "Premium subscription required",
          toolName: tool.name,
          isPremium: true,
        });
      }

      next();
    } catch (error) {
      console.error("Error checking premium access:", error);
      res.status(500).json({ message: "Failed to verify access" });
    }
  };

  // Razorpay Payment Integration
  app.post("/api/create-order", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, currency, planType } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email is required" });
      }

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to cents for USD
        currency,
        receipt: `ord_${Date.now().toString().slice(-10)}`,
        notes: {
          userId,
          planType,
          userEmail: user.email,
        },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_zsoe5M8iszfWGq",
      });
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/verify-payment", isAuthenticated, async (req: any, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planType,
      } = req.body;
      const userId = req.user.id;
      console.log("Verifying payment for user:", userId);
      console.log("Payment details", req.body);

      // Verify payment signature
      //const crypto = require("crypto");
      const hmac = crypto.createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "EgRGWst3pqhFdAqBD70TWVRI"
      );
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generated_signature = hmac.digest("hex");

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      // Payment is verified, update user subscription
      const subscriptionEndsAt = new Date();
      if (planType === "monthly") {
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
      } else if (planType === "yearly") {
        subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
      }

      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionType: planType,
        subscriptionStatus: "active",
        subscriptionEndsAt,
        paymentStatus: "completed",
        // Store Razorpay details for future reference
        razorpayCustomerId: req.user.razorpayCustomerId,
        razorpaySubscriptionId: razorpay_payment_id,
      });

      res.json({
        message: "Payment successful and subscription activated",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Subscription management
  app.get(
    "/api/subscription/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          subscriptionType: user.subscriptionType,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndsAt: user.subscriptionEndsAt,
          isPremium: user.subscriptionType !== "free" && user.subscriptionStatus === "active",
        });
      } catch (error) {
        console.error("Error fetching subscription status:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch subscription status" });
      }
    }
  );

  // Check if user can access a specific tool
  app.get("/api/tools/:id/access", isAuthenticated, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const userId = req.user.id;

      const tool = await storage.getTool(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      const user = await storage.getUser(userId);
      const hasAccess =
        !tool.isPremium || (user && user.subscriptionType !== "free" && user.subscriptionStatus === "active");

      res.json({
        hasAccess,
        toolName: tool.name,
        isPremium: tool.isPremium,
        userSubscription: user?.subscriptionType || "free",
        requiresUpgrade: tool.isPremium && user?.subscriptionType === "free" && user?.subscriptionStatus !== "active",
      });
    } catch (error) {
      console.error("Error checking tool access:", error);
      res.status(500).json({ message: "Failed to check tool access" });
    }
  });

  // Tools API
  app.get("/api/tools", async (req, res) => {
    try {
      const { category, isPremium, lang } = req.query;
      const options: any = {
        category: category as string,
        isActive: true,
      };

      // Only filter by isPremium if the query parameter is explicitly provided
      if (isPremium !== undefined) {
        options.isPremium = isPremium === "true";
      }

      const tools = await storage.getTools(options);

      // If no language requested or language is English, return original tools
      const targetLang = lang ? String(lang) : "en";
      if (!targetLang || targetLang === "en") {
        return res.json(tools);
      }

      // For non-en languages, attempt to lookup translations from the translations table
      const { db } = await import("./db");
      const { translations } = await import("@shared/schema");

      const translatedTools = await Promise.all(
        tools.map(async (tool: any) => {
          try {
            // Try to find a translation for the tool name
            const [nameRow] = await db
              .select()
              .from(translations)
              .where(and(eq(translations.sourceText, tool.name), eq(translations.targetLang, targetLang)))
              .limit(1);

            if (nameRow) {
              tool.translatedName = nameRow.translatedText;
            } else {
              // Fall back to translating on-demand and persisting
              const nameResult = await translate(tool.name || "", { to: targetLang, forceTo: true });
              const nameNorm: any = Array.isArray(nameResult) ? nameResult[0] : nameResult;
              if (nameNorm && nameNorm.text) {
                await storage.createTranslation({ userId: null, sourceText: tool.name || "", translatedText: nameNorm.text, sourceLang: nameNorm.from?.language?.iso || 'auto', targetLang });
                tool.translatedName = nameNorm.text;
              }
            }

            // Description/content translation
            const [descRow] = await db
              .select()
              .from(translations)
              .where(and(eq(translations.sourceText, tool.description || ""), eq(translations.targetLang, targetLang)))
              .limit(1);

            if (descRow) {
              tool.translatedDescription = descRow.translatedText;
            } else if (tool.description) {
              const descResult = await translate(tool.description || "", { to: targetLang, forceTo: true });
              const descNorm: any = Array.isArray(descResult) ? descResult[0] : descResult;
              if (descNorm && descNorm.text) {
                await storage.createTranslation({ userId: null, sourceText: tool.description || "", translatedText: descNorm.text, sourceLang: descNorm.from?.language?.iso || 'auto', targetLang });
                tool.translatedDescription = descNorm.text;
              }
            }

            return tool;
          } catch (e) {
            console.error('Tool translation failed for tool', tool.id, e);
            return tool;
          }
        })
      );

      res.json(translatedTools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.get("/api/tools/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const tool = await storage.getToolBySlug(slug);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }
      res.json(tool);
    } catch (error) {
      console.error("Error fetching tool:", error);
      res.status(500).json({ message: "Failed to fetch tool" });
    }
  });

  // Tool usage tracking (with premium check)
  app.post(
    "/api/tools/:id/usage",
    //isAuthenticated,
    //requirePremiumForTool,
    async (req: any, res) => {
      try {
        const toolId = parseInt(req.params.id);
        const { success, errorMessage } = req.body;

        const userId = req.user ? req.user.id : "user_1760016433270_0jsm561eb";
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");

        await storage.createToolUsage({
          toolId,
          userId,
          ipAddress,
          userAgent,
          success,
          errorMessage,
        });

        if (success) {
          await storage.incrementToolUsage(toolId);
        }

        res.json({ message: "Usage tracked successfully" });
      } catch (error) {
        console.error("Error tracking tool usage:", error);
        res.status(500).json({ message: "Failed to track usage" });
      }
    }
  );

  // Reviews API
  app.get("/api/tools/:id/reviews", async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const reviews = await storage.getReviews(toolId, { approved: true });
      const ratingStats = await storage.getToolRatingStats(toolId);
      res.json({ reviews, ratingStats });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Reviews summary (aggregated stats) - returns average rating, total reviews and total unique users
  app.get("/api/tools/:id/reviews/summary", async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const stats = await storage.getToolRatingStats(toolId);

      // Normalize response shape for frontend: average (float), totalReviews (number), totalUsers (number)
      res.json({
        average: Number(stats.average) || 0,
        totalReviews: Number((stats as any).total) || 0,
        totalUsers: Number((stats as any).totalUsers) || 0,
      });
    } catch (error) {
      console.error("Error fetching review summary:", error);
      res.status(500).json({ message: "Failed to fetch review summary" });
    }
  });

  app.post(
    "/api/tools/:id/reviews",
    //isAuthenticated,
    requirePremiumForTool,
    async (req: any, res) => {
      try {
        const toolId = parseInt(req.params.id);
        const userId = req.user ? req.user.id : "user_1760016433270_0jsm561eb";
        const { rating, comment } = req.body;

        const reviewData = insertReviewSchema.parse({
          toolId,
          userId,
          rating,
          comment,
        });

        const review = await storage.createReview(reviewData);
        res.json(review);
      } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).json({ message: "Failed to create review" });
      }
    }
  );

    // Admin: get user by id (to show reviewer name)
  app.get("/api/admin/users/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        id: user.id,
        firstName: (user as any).firstName || null,
        lastName: (user as any).lastName || null,
        email: (user as any).email || null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin: fetch all reviews for a tool (includes unapproved — admin view)
  app.get("/api/admin/tools/:id/reviews", async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const reviews = await storage.getReviews(toolId); // storage.getReviews can accept no approved filter
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching tool reviews (admin):", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Admin: update review (approve/unapprove)
  app.put("/api/admin/reviews/:id", async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { isApproved } = req.body;
      if (typeof isApproved !== "boolean") {
        return res.status(400).json({ message: "isApproved (boolean) is required" });
      }
      const updated = await storage.updateReview(reviewId, { isApproved });
      res.json(updated);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // URL Shortener API (Premium feature)
  app.post("/api/url-shortener", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionType === "free") {
        return res
          .status(403)
          .json({ message: "Premium subscription required" });
      }

      const { originalUrl, title } = req.body;
      const shortCode = Math.random().toString(36).substring(2, 8);

      const urlData = insertUrlShortenerSchema.parse({
        userId,
        originalUrl,
        shortCode,
        title,
      });

      const shortUrl = await storage.createShortUrl(urlData);
      res.json(shortUrl);
    } catch (error) {
      console.error("Error creating short URL:", error);
      res.status(500).json({ message: "Failed to create short URL" });
    }
  });

  app.get(
    "/api/url-shortener/my-urls",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const urls = await storage.getUserShortUrls(userId);
        res.json(urls);
      } catch (error) {
        console.error("Error fetching user URLs:", error);
        res.status(500).json({ message: "Failed to fetch URLs" });
      }
    }
  );

  app.get("/s/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      const shortUrl = await storage.getShortUrl(shortCode);

      if (!shortUrl || !shortUrl.isActive) {
        return res.status(404).json({ message: "Short URL not found" });
      }

      // Track click
      await storage.incrementUrlClicks(shortUrl.id);
      await storage.createUrlClick({
        urlId: shortUrl.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
      });

      res.redirect(shortUrl.originalUrl);
    } catch (error) {
      console.error("Error redirecting short URL:", error);
      res.status(500).json({ message: "Failed to redirect" });
    }
  });

  // Contributions API
  app.post("/api/contributions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { type, title, description } = req.body;

      const contributionData = insertContributionSchema.parse({
        userId,
        type,
        title,
        description,
      });

      const contribution = await storage.createContribution(contributionData);
      res.json(contribution);
    } catch (error) {
      console.error("Error creating contribution:", error);
      res.status(500).json({ message: "Failed to create contribution" });
    }
  });

  // URL Analytics Summary for Dashboard
  app.get(
    "/api/dashboard/url-summary",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const urls = await storage.getUserShortUrls(userId);

        let totalUrls = urls.length;
        let totalClicks = 0;
        let activeUrls = 0;
        let clicksToday = 0;

        const today = new Date().toISOString().split("T")[0];

        for (const url of urls) {
          totalClicks += url.clickCount;
          if (url.isActive) activeUrls++;

          // Get today's clicks for this URL
          const clicks = await storage.getUrlClickStats(url.id);
          const todayClicks = clicks.filter(
            (click) =>
              new Date(click.createdAt).toISOString().split("T")[0] === today
          );
          clicksToday += todayClicks.length;
        }

        res.json({
          totalUrls,
          activeUrls,
          totalClicks,
          clicksToday,
          urls: urls.slice(0, 5), // Recent 5 URLs for dashboard preview
        });
      } catch (error) {
        console.error("Error fetching URL summary:", error);
        res.status(500).json({ message: "Failed to fetch URL summary" });
      }
    }
  );

  // Dashboard API
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    console.log('[DEBUG] /api/dashboard/stats - isAuthenticated=', typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : 'no-fn', 'userId=', req.user?.id, 'cookie=', String(req.headers.cookie || '').slice(0,200));
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get actual user's tool usage stats from database
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query tool usage using the db instance
      const { db } = await import("./db");
      const { toolUsage } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const userUsage = await db
        .select()
        .from(toolUsage)
        .where(eq(toolUsage.userId, userId));

      const downloadsToday = userUsage.filter(
        (usage) => usage.usedAt >= today
      ).length;

      const totalDownloads = userUsage.length;

      // Get unique tools used by user
      const uniqueTools = new Set(userUsage.map((usage) => usage.toolId));
      const favoriteTools = uniqueTools.size;

      const userStats = {
        downloadsToday,
        totalDownloads,
        favoriteTools,
        planStatus: user.subscriptionType,
      };

      res.json(userStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent Activity API
  app.get(
    "/api/dashboard/recent-activity",
    isAuthenticated,
    async (req: any, res) => {
      console.log('[DEBUG] /api/dashboard/recent-activity - isAuthenticated=', typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : 'no-fn', 'userId=', req.user?.id, 'cookie=', String(req.headers.cookie || '').slice(0,200));
      try {
        const userId = req.user.id;

        // Get actual user activity from database
        const { db } = await import("./db");
        const { toolUsage, tools } = await import("@shared/schema");
        const { eq, desc } = await import("drizzle-orm");

        const recentUsage = await db
          .select()
          .from(toolUsage)
          .innerJoin(tools, eq(toolUsage.toolId, tools.id))
          .where(eq(toolUsage.userId, userId))
          .orderBy(desc(toolUsage.createdAt))
          .limit(5);

        // If no usage data exists, return empty array
        if (!recentUsage || recentUsage.length === 0) {
          return res.json([]);
        }

        const recentActivity = recentUsage.map((row) => {
          const usage = row.tool_usage;
          const tool = row.tools;

          const timeDiff = Date.now() - usage.createdAt.getTime();
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);

          let timeAgo;
          if (days > 0) {
            timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
          } else if (hours > 0) {
            timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
          } else {
            timeAgo = "Just now";
          }

          return {
            id: usage.id,
            toolName: tool.name,
            toolSlug: tool.slug || null,
            createdAt: usage.createdAt.toISOString(),
            time: timeAgo,
            type:
              tool.category === "downloader"
                ? "download"
                : tool.category === "converter"
                  ? "convert"
                  : "use",
            icon: tool.icon || "fas fa-tools",
            color: usage.success
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
          };
        });

        res.json(recentActivity);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        // Return empty array instead of error to avoid breaking the dashboard
        res.json([]);
      }
    }
  );

  // Admin middleware (updated for demo purposes)
  const isAdminAuth = async (req: any, res: any, next: any) => {
    // For demo purposes, bypass authentication checks
    console.log("Admin authentication bypassed for demo");
    next();
  };

  // Admin API

  // Multer setup for uploads - store files under ./uploads and keep original filename
  const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');
  // ensure uploads dir exists
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create uploads dir:', uploadsDir, e);
  }

  // Always serve uploaded files at /uploads so dev server and production can access them
  try {
    app.use('/uploads', express.static(uploadsDir));
    console.log('Serving uploads from', uploadsDir);
  } catch (e) {
    console.warn('Failed to mount uploads static route:', e);
  }

  // Explicit fallback route to serve uploads using sendFile.
  // This ensures that if other middleware rewrites requests (Vite dev middleware),
  // we still return the correct file bytes for /uploads/* paths.
  app.get('/uploads/*', (req: any, res: any) => {
    try {
      console.log('[uploads] request for', req.path);
      const rel = req.path.replace(/^\/uploads\//, '');
      const filePath = path.join(uploadsDir, decodeURIComponent(rel));
      console.log('[uploads] resolved filePath=', filePath);
      if (fs.existsSync(filePath)) {
        console.log('[uploads] sending file');
        return res.sendFile(filePath);
      }
      console.log('[uploads] file not found');
      return res.status(404).send('Not found');
    } catch (err) {
      console.error('Error serving upload file', err);
      return res.status(500).send('Server error');
    }
  });

  const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      cb(null, safeName);
    }
  });
  // Only accept JPEG and PNG, limit file size to 5MB
  const fileFilter = (req: any, file: any, cb: any) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PNG and JPEG images are allowed'), false);
    }
    cb(null, true);
  };

  const diskUpload = multer({ storage: storageEngine, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

  // Admin endpoint: upload file (authenticated via isAdmin)
  app.post('/api/admin/uploads', isAdmin, diskUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      // Compute base URL for uploaded files.
      // Priority:
      // 1. process.env.UPLOADS_BASE_URL (explicit override)
      // 2. If running in development, prefer localhost with PORT
      // 3. process.env.VITE_API_BASE_URL if set
      // 4. Fallback to request host (protocol + host)
      const baseUrl =
        process.env.UPLOADS_BASE_URL ||
        (process.env.NODE_ENV === 'development'
          ? `http://localhost:${process.env.PORT || 3000}`
          : process.env.VITE_API_BASE_URL) || `${req.protocol}://${req.get('host')}`;
      // The public URL - in production, you should serve /uploads statically or via CDN
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${req.file.filename}`;
      res.json({ url: publicUrl, filename: req.file.filename });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // User profile image upload - authenticated users
  app.post('/api/uploads/profile', isAuthenticated, diskUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const baseUrl =
        process.env.UPLOADS_BASE_URL ||
        (process.env.NODE_ENV === 'development'
          ? `http://localhost:${process.env.PORT || 3000}`
          : process.env.VITE_API_BASE_URL) || `${req.protocol}://${req.get('host')}`;

      const publicUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${req.file.filename}`;

      // Update user's profile image URL in the database
      try {
        const userId = req.user?.id;
        if (userId) {
          await storage.updateUser(userId, { profileImageUrl: publicUrl });
        }
      } catch (err) {
        console.error('Failed to update user profile image URL:', err);
        // continue - still return uploaded URL
      }

      res.json({ url: publicUrl, filename: req.file.filename });
    } catch (error) {
      console.error('Profile upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.get("/api/admin/stats", isAdminAuth, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/tools", isAdminAuth, async (req: any, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching admin tools:", error);
      res.status(500).json({ message: "Failed to fetch admin tools" });
    }
  });

  app.put("/api/admin/tools/:id", isAdminAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const updatedTool = await storage.updateTool(toolId, req.body);
      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  app.delete("/api/admin/tools/:id", isAdminAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      await storage.deleteTool(toolId);
      res.json({ message: "Tool deleted successfully" });
    } catch (error) {
      console.error("Error deleting tool:", error);
      res.status(500).json({ message: "Failed to delete tool" });
    }
  });

  // Admin: list users (paginated)
  app.get('/api/admin/users', isAdminAuth, async (req: any, res) => {
    try {
      const page = parseInt(String(req.query.page || '1')) || 1;
      const limit = parseInt(String(req.query.limit || '100')) || 100;
      const q = req.query.q ? String(req.query.q) : undefined;
      const subscriptionType = req.query.subscriptionType ? String(req.query.subscriptionType) : undefined;
      const updatedFrom = req.query.updatedFrom ? new Date(String(req.query.updatedFrom)) : undefined;
      const updatedTo = req.query.updatedTo ? new Date(String(req.query.updatedTo)) : undefined;
      const result = await storage.getAllUsers({ page, limit, q, subscriptionType, updatedFrom, updatedTo });
      // Filter out unwanted user
      const filteredUsers = Array.isArray(result.users)
        ? result.users.filter(u => u.id !== 'user_1760016433270_0jsm561eb')
        : result.users;
      res.json({ ...result, users: filteredUsers });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Admin: update a user
  app.put('/api/admin/users/:id', isAdminAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      const payload = req.body || {};
      const allowed: any = {};
      if (payload.firstName !== undefined) allowed.firstName = payload.firstName;
      if (payload.lastName !== undefined) allowed.lastName = payload.lastName;
      if (payload.email !== undefined) allowed.email = payload.email;
      if (payload.subscriptionType !== undefined) allowed.subscriptionType = payload.subscriptionType;
      if (payload.subscriptionStatus !== undefined) allowed.subscriptionStatus = payload.subscriptionStatus;

      const updated = await storage.updateUser(id, allowed);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Admin blog management
  app.get("/api/admin/blog", isAdminAuth, async (req: any, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/admin/blog/:id", isAdminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const postId = Number(id);
      const posts = await storage.getBlogPostById(postId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.put("/api/admin/blog/:id", isAdminAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      // Only pick allowed fields to avoid unexpected updates
      const allowed: Partial<any> = {
        title: req.body.title,
        slug: req.body.slug,
        category: req.body.category,
        // 'author' is the display name string; 'authorId' may be provided as a user id
        author: req.body.author,
        authorId: req.body.authorId,
        excerpt: req.body.excerpt,
        content: req.body.content,
        coverImage: req.body.coverImage,
        status: req.body.status,
        featured: req.body.featured,
        seoTitle: req.body.seoTitle,
        seoDescription: req.body.seoDescription,
        tags: req.body.tags,
      };

      const updatedPost = await storage.updateBlogPost(postId, allowed);
      res.status(200).json(updatedPost);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  // Admin: republish/re-index a blog post (update publishedAt or updatedAt)
  app.post('/api/admin/blog/:id/republish', isAdminAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { at } = req.body; // optional ISO date string
      const when = at ? new Date(at) : new Date();

      // If the post is not published yet, set publishedAt; otherwise update updatedAt
      const post = await storage.getBlogPostById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const payload: any = {};
      if (!post.publishedAt) {
        payload.publishedAt = when;
        payload.status = 'published';
      }
      payload.updatedAt = when;

      const updated = await storage.updateBlogPost(postId, payload);
      res.json({ success: true, post: updated });
    } catch (error) {
      console.error('Error republishing blog post:', error);
      res.status(500).json({ message: 'Failed to republish blog post' });
    }
  });

  app.delete("/api/admin/blog/:id", isAdminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const postId = Number(id);

      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      await storage.deleteBlogPost(postId);
      res.status(200).json({ message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  app.get("/api/admin/blog/recent", isAdminAuth, async (req: any, res) => {
    try {
      const posts = await storage.getBlogPosts({ limit: 5 });
      res.json(posts);
    } catch (error) {
      console.error("Error fetching recent blog posts:", error);
      res.status(500).json({ message: "Failed to fetch recent blog posts" });
    }
  });

  // Admin feedback management
  app.get("/api/admin/feedback", isAdminAuth, async (req: any, res) => {
    try {
      const feedback = await storage.getUserFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get("/api/admin/feedback/recent", isAdminAuth, async (req: any, res) => {
    try {
      const feedback = await storage.getUserFeedback({ limit: 5 });
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching recent feedback:", error);
      res.status(500).json({ message: "Failed to fetch recent feedback" });
    }
  });

  app.put("/api/admin/feedback/:id", isAdminAuth, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const updatedFeedback = await storage.updateUserFeedback(
        feedbackId,
        req.body
      );
      res.json(updatedFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Admin user management
  app.get("/api/admin/users", isAdminAuth, async (req: any, res) => {
    try {
      const { users } = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin messages
  app.get("/api/admin/messages", isAdminAuth, async (req: any, res) => {
    try {
      const messages = await storage.getUserMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/messages", isAdminAuth, async (req: any, res) => {
    try {
      const messageData = {
        ...req.body,
        fromUserId: "admin", // For demo purposes
      };
      const message = await storage.createUserMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Admin credits management
  app.get("/api/admin/credits", isAdminAuth, async (req: any, res) => {
    try {
      // For demo purposes, return empty array
      // In production, this would fetch from user_credits table
      res.json([]);
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.post("/api/admin/credits", isAdminAuth, async (req: any, res) => {
    try {
      const { userId, amount, type, reason } = req.body;

      // For demo purposes, just return success
      // In production, this would create a credit entry and update user balance
      res.json({
        id: Date.now(),
        userId,
        amount,
        type,
        reason,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error adding credits:", error);
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  // Create new tool
  app.post("/api/admin/tools", isAdminAuth, async (req: any, res) => {
    try {
      const toolData = req.body;
      const tool = await storage.createTool(toolData);
      res.json(tool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  // Update tool
  app.put("/api/admin/tools/:id", isAdminAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const toolData = req.body;
      const tool = await storage.updateTool(toolId, toolData);
      res.json(tool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  // Admin: republish/re-index a tool (update updatedAt or publishedAt)
  app.post('/api/admin/tools/:id/republish', isAdminAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const { at } = req.body; // optional ISO date to set published/updated at
      const when = at ? new Date(at) : new Date();

      const updated = await storage.updateTool(toolId, { updatedAt: when });
      res.json({ success: true, tool: updated });
    } catch (error) {
      console.error('Error republishing tool:', error);
      res.status(500).json({ message: 'Failed to republish tool' });
    }
  });

  // Public blog API endpoints
  app.get("/api/blog", async (req, res) => {
    try {
      const { lang } = req.query;
      const posts = await storage.getBlogPosts();
      // Only return published posts for public API
      const publishedPosts = posts.filter((post) => post.status === "published");

      const targetLang = lang ? String(lang) : "en";
      if (!targetLang || targetLang === "en") {
        return res.json(publishedPosts);
      }

      const { db } = await import("./db");
      const { translations } = await import("@shared/schema");

      const translatedPosts = await Promise.all(
        publishedPosts.map(async (post: any) => {
          try {
            // Title
            const [titleRow] = await db
              .select()
              .from(translations)
              .where(and(eq(translations.sourceText, post.title || ""), eq(translations.targetLang, targetLang)))
              .limit(1);

            if (titleRow) {
              post.translatedTitle = titleRow.translatedText;
            } else {
              const titleResult = await translate(post.title || "", { to: targetLang, forceTo: true });
              const titleNorm: any = Array.isArray(titleResult) ? titleResult[0] : titleResult;
              if (titleNorm && titleNorm.text) {
                await storage.createTranslation({ userId: null, sourceText: post.title || "", translatedText: titleNorm.text, sourceLang: titleNorm.from?.language?.iso || 'auto', targetLang });
                post.translatedTitle = titleNorm.text;
              }
            }

            // Excerpt
            const [excerptRow] = await db
              .select()
              .from(translations)
              .where(and(eq(translations.sourceText, post.excerpt || ""), eq(translations.targetLang, targetLang)))
              .limit(1);

            if (excerptRow) {
              post.translatedExcerpt = excerptRow.translatedText;
            } else if (post.excerpt) {
              const excerptResult = await translate(post.excerpt || "", { to: targetLang, forceTo: true });
              const excerptNorm: any = Array.isArray(excerptResult) ? excerptResult[0] : excerptResult;
              if (excerptNorm && excerptNorm.text) {
                await storage.createTranslation({ userId: null, sourceText: post.excerpt || "", translatedText: excerptNorm.text, sourceLang: excerptNorm.from?.language?.iso || 'auto', targetLang });
                post.translatedExcerpt = excerptNorm.text;
              }
            }

            return post;
          } catch (e) {
            console.error('Post translation failed for post', post.id, e);
            return post;
          }
        })
      );

      res.json(translatedPosts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/featured", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      // Return published posts marked as featured
      const featuredPosts = posts.filter(
        (post) => post.status === "published" && post.featured === true
      );
      res.json(featuredPosts);
    } catch (error) {
      console.error("Error fetching featured posts:", error);
      res.status(500).json({ message: "Failed to fetch featured posts" });
    }
  });

  app.get("/api/blog/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const posts = await storage.getBlogPosts();
      const post = posts.find(
        (p) => p.id === postId && p.status === "published"
      );

      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Fetch blog post by slug (public) for SEO-friendly URLs
  app.get("/api/blog/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params as { slug: string };
      const post = await storage.getBlogPostBySlug(slug);

      if (!post || post.status !== 'published') {
        return res.status(404).json({ message: "Blog post not found" });
      }

      // increment view count and persist; if update fails, still return the post
      const currentViews = Number((post as any).viewCount || 0);
      try {
        const updated = await storage.updateBlogPost(Number((post as any).id), { viewCount: currentViews + 1 });
        return res.json(updated);
      } catch (err) {
        console.error('Failed to increment view count:', err);
        return res.json(post);
      }
    } catch (error) {
      console.error("Error fetching blog post by slug:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // User preferences API
  app.put("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { theme, language } = req.body;

      const updatedUser = await storage.upsertUser({
        id: userId,
        theme,
        language,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Update user profile (name, email, avatar)
  app.put("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email, profileImageUrl } = req.body;

      // Build allowed update object
      const updates: any = {};
      if (typeof firstName !== "undefined") updates.firstName = firstName;
      if (typeof lastName !== "undefined") updates.lastName = lastName;
      if (typeof email !== "undefined") updates.email = email;
      if (typeof profileImageUrl !== "undefined") updates.profileImageUrl = profileImageUrl;

      // Persist update using storage layer
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Tool processing endpoints (these would integrate with actual services)
  // Helper function to check tool premium status and user access
  const checkToolAccess = async (toolSlug: string, userId: string) => {
    const tool = await storage.getToolBySlug(toolSlug);
    if (!tool) {
      throw new Error("Tool not found");
    }

    if (tool.isPremium) {
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionType === "free") {
        throw new Error("Premium subscription required for this tool");
      }
    }

    return tool;
  };

  app.post(
    "/api/process/facebook-video",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { url } = req.body;
        if (!url) {
          return res.status(400).json({ message: "URL is required" });
        }

        // Mock response - in production, this would integrate with actual Facebook API
        res.json({
          success: true,
          videoInfo: {
            title: "Sample Facebook Video",
            thumbnail: "https://via.placeholder.com/300x200",
            formats: [
              { quality: "720p", format: "mp4", size: "25.4 MB" },
              { quality: "480p", format: "mp4", size: "15.2 MB" },
            ],
          },
        });
      } catch (error) {
        console.error("Error processing Facebook video:", error);
        res.status(500).json({ message: "Failed to process video" });
      }
    }
  );

  app.post("/api/youtube/info", async (req, res) => {
    const { url } = req.body;

    try {
      if (!url) {
        return res
          .status(400)
          .json({ success: false, message: "Missing YouTube URL" });
      }

      // Call FastAPI to get available formats
      const fastApiResponse = await axios.get(
        PYSERVER_URL + "/formats/youtube",
        {
          params: { url },
        }
      );

      const data = fastApiResponse.data;

      if (!data.success) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to get video formats" });
      }

      const {
        title,
        thumbnail,
        duration,
        author,
        viewCount,
        availableFormats,
      } = data.videoInfo;

      const filteredFormats = availableFormats.filter(
        (f: any) =>
          f.format === "mp4" &&
          typeof f.quality === "string" &&
          f.quality.includes("p")
      );

      return res.status(200).json({
        success: true,
        videoInfo: {
          title,
          thumbnail,
          duration,
          author,
          viewCount,
          availableFormats: filteredFormats,
        },
      });
    } catch (err: any) {
      console.error("Error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch video info" });
    }
  });

  app.get("/api/download/youtube-video", async (req, res) => {
    const { url, itag } = req.query;

    if (!url || !itag) {
      return res.status(400).send("Missing URL or itag");
    }

    try {
      const response = await axios({
        method: "GET",
        url: PYSERVER_URL + "/stream/youtube/video",
        params: { url, video_itag: itag },
        responseType: "stream",
      });

      res.setHeader("Content-Type", "video/mp4");
      const filename =
        response.headers["content-disposition"]
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "video.mp4";

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      response.data.pipe(res);
    } catch (err: any) {
      console.error("Streaming failed:", err.message);
      //res.status(500).send("Failed to stream video.");
      return res
        .status(500)
        .json({ success: false, message: "Failed to stream video." });
    }
  });

  app.get("/api/download/video", async (req, res) => {
    const { url, toolType } = req.query;

    if (!url || !toolType) {
      return res.status(400).send("Missing URL, or toolType");
    }

    const toolTypeStr = String(toolType).split("-")[0].toLowerCase();
    const urlStr = String(url);
    const toolTypeRegexMap: Record<string, RegExp> = {
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
      facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
      twitter: /(?:https?:\/\/)?(?:www\.)?x\.com\//i,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i,
    };

    const isValid = toolTypeRegexMap[toolTypeStr]?.test(urlStr);

    if (!isValid) {
      return res
        .status(400)
        .send(`URL does not match the expected tool type: ${toolType}`);
    }

    try {
      const endpoint = toolTypeStr === "tiktok" ? "/stream/tiktok" : "/stream/video";
      console.log(`Fetching video from ${endpoint} for tool type: ${toolTypeStr}`);
      const params = toolTypeStr === "tiktok"
        ? { url } // TikTok uses only `url`
        : { url, tool_type: toolTypeStr }; // Others use `url` + `tool_type`

      const response = await axios({
        method: "GET",
        url: `${PYSERVER_URL}${endpoint}`,
        params,
        responseType: "stream",
      });

      res.setHeader("Content-Type", "video/mp4");
      const filename =
        response.headers["content-disposition"]
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "video.mp4";

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      response.data.pipe(res);
    } catch (err: any) {
      const axiosError = err.response;

      if (
        axiosError?.data &&
        axiosError.headers?.["content-type"]?.includes("application/json")
      ) {
        let errorMessage: any = "Failed to fetch video";
        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of axiosError.data) {
            chunks.push(chunk);
          }
          const errorBuffer = Buffer.concat(chunks).toString("utf8");
          const json = JSON.parse(errorBuffer);
          errorMessage = json || errorMessage;
        } catch (parseErr) {
          errorMessage = "Failed to parse error response";
        }

        console.error("Streaming failed:", errorMessage);
        res.status(axiosError.status || 500).json(errorMessage);
      } else {
        console.error("Streaming failed:", err.message);
        res.status(500).send("Failed to fetch video");
      }
    }
  });

  app.get("/api/download/media", async (req, res) => {
    const { url, toolType } = req.query;

    if (!url || !toolType) {
      return res.status(400).send("Missing URL, or toolType");
    }

    const toolTypeStr = String(toolType).split("-")[0].toLowerCase();
    const urlStr = String(url);
    const toolTypeRegexMap: Record<string, RegExp> = {
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
      facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
      twitter: /(?:https?:\/\/)?(?:www\.)?(twitter|x)\.com\//i,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i,
    };

    const isValid = toolTypeRegexMap[toolTypeStr]?.test(urlStr);

    if (!isValid) {
      return res
        .status(400)
        .send(`URL does not match the expected tool type: ${toolType}`);
    }

    try {
      console.log(`Fetching media from /stream/media for tool type: ${toolTypeStr}`);

      const section = req.query.section ? String(req.query.section) : undefined;
      const params: any = { url, tool_type: toolTypeStr };
      if (section) params.section = section;

      const response = await axios({
        method: "GET",
        url: `${PYSERVER_URL}/stream/media`,
        params,
        responseType: "stream",
      });

      // Pass through headers from Python server
      res.setHeader(
        "Content-Type",
        response.headers["content-type"] || "application/octet-stream"
      );

      const filename =
        response.headers["content-disposition"]
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "media";

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      response.data.pipe(res);
    } catch (err: any) {
      const axiosError = err.response;

      if (
        axiosError?.data &&
        axiosError.headers?.["content-type"]?.includes("application/json")
      ) {
        let errorMessage: any = "Failed to fetch media";
        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of axiosError.data) {
            chunks.push(chunk);
          }
          const errorBuffer = Buffer.concat(chunks).toString("utf8");
          const json = JSON.parse(errorBuffer);
          errorMessage = json || errorMessage;
        } catch (parseErr) {
          errorMessage = "Failed to parse error response";
        }

        console.error("Media streaming failed:", errorMessage);
        res.status(axiosError.status || 500).json(errorMessage);
      } else {
        console.error("Media streaming failed:", err.message);
        res.status(500).send("Failed to fetch media");
      }
    }
  });


  // app.post("/api/process/youtube-to-mp3", isAuthenticated, async (req, res) => {
  //   const { url } = req.body;

  //   if (!url) return res.status(400).json({ message: "URL is required" });

  //   try {
  //     const { data } = await axios.get(`${PYSERVER_URL}/youtube/audio-info`, {
  //       params: { url },
  //     });

  //     if (!data.success)
  //       return res
  //         .status(500)
  //         .json(data.message || "Failed to fetch audio info");

  //     res.json({ success: true, audioInfo: data.audioInfo });
  //   } catch (err: any) {
  //     console.error("Audio info fetch failed:", err.message);
  //     res.status(500).json(err.message || "Failed to fetch audio info");
  //   }
  // });

  // app.get("/api/download/youtube-audio", isAuthenticated, async (req, res) => {
  //   const { url } = req.query;
  //   if (!url) return res.status(400).send("Missing URL");

  //   try {
  //     const response = await axios({
  //       method: "GET",
  //       url: `${PYSERVER_URL}/stream/youtube/audio`,
  //       params: { url },
  //       responseType: "stream",
  //     });

  //     const filename =
  //       response.headers["content-disposition"]
  //         ?.split("filename=")[1]
  //         ?.replace(/"/g, "") || "audio.mp3";

  //     res.setHeader("Content-Type", "audio/mpeg");
  //     res.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename="${filename}"`
  //     );
  //     response.data.pipe(res);
  //   } catch (err: any) {
  //     console.error("Audio streaming failed:", err.message);
  //     res.status(500).send("Failed to stream audio.");
  //   }
  // });

  app.post("/api/process/youtube-to-mp3-full", async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ message: "URL is required" });
    console.log("Fetching full audio info for URL:", url);

    try {
      const { data } = await axios.get(`${PYSERVER_URL}/youtube/audio-full`, {
        params: { url },
      });

      if (!data.success)
        return res
          .status(500)
          .json(data.message || "Failed to fetch audio");

      res.json({ success: true, audioInfo: data.audioInfo });
    } catch (err: any) {
      console.error("Audio fetch failed:", err.message);
      res.status(500).json(err.message || "Failed to fetch audio");
    }
  });

  // Speed test is now handled client-side in the browser
  // This measures the user's actual internet connection speed
  const upload = multer({ storage: multer.memoryStorage() });
  app.post(
    "/api/convert/pdf-to-word",
    upload.single("file"),
    async (req, res) => {
      if (!req.file) return res.status(400).send("No file uploaded");

      try {
        const form = new FormData();
        form.append("file", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });

        const response = await axios.post(
          PYSERVER_URL + "/stream/pdf-to-word",
          form,
          {
            responseType: "stream",
            headers: form.getHeaders(), // ✅ only supported by correct `form-data` package
          }
        );

        const filename =
          response.headers["content-disposition"]
            ?.split("filename=")[1]
            ?.replace(/"/g, "") || "converted.docx";

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );

        response.data.pipe(res);
      } catch (err: any) {
        console.error("Streaming failed:", err.message);
        res.status(500).send("Streaming failed.");
      }
    }
  );

  app.post(
    "/api/remove-background/info",
    upload.single("image"),
    async (req, res) => {
      if (!req.file) {
        console.error("No image uploaded");
        return res.status(400).send("No image uploaded");
      }

      try {
        const form = new FormData();
        form.append("image", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });

        const response = await axios.post(
          `${PYSERVER_URL}/stream/remove-background`,
          form,
          {
            responseType: "stream",
            headers: form.getHeaders(),
          }
        );

        // Logging response status
        console.log(
          "✅ Background removal response:",
          response.status,
          response.statusText
        );

        const filename =
          response.headers["content-disposition"]
            ?.split("filename=")[1]
            ?.replace(/"/g, "") || "background_removed.png";

        res.setHeader("Content-Type", "image/png");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );

        response.data.pipe(res);
      } catch (error) {
        console.error(
          "❌ Background removal failed:",
          error?.response?.data || error.message
        );
        res.status(500).send("Background removal failed");
      }
    }
  );

  // Admin routes
  app.get("/api/admin/dashboard-stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/tools", isAdmin, async (req, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page || 1) || 1;
      const limit = Number(req.query.limit || 10) || 10;
      const q = req.query.q ? String(req.query.q) : undefined;
      const subscriptionType = req.query.subscriptionType ? String(req.query.subscriptionType) : undefined;
      const updatedFrom = req.query.updatedFrom ? new Date(String(req.query.updatedFrom)) : undefined;
      const updatedTo = req.query.updatedTo ? new Date(String(req.query.updatedTo)) : undefined;
      const result = await storage.getAllUsers({ page, limit, q, subscriptionType, updatedFrom, updatedTo });
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.post("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      // If an author string is provided, use it. Otherwise, if req.user exists, try to use their name.
      const payload: any = { ...req.body };
      if (payload.author && typeof payload.author === "string") {
        // keep author as provided (display name)
      } else if (req.user && req.user.firstName) {
        payload.author = `${req.user.firstName} ${req.user.lastName || ""}`.trim();
      } else if (req.user && req.user.email) {
        payload.author = req.user.email;
      }

      // Avoid passing an authorId that might reference a non-existent user in users table.
      if (payload.authorId && typeof payload.authorId === "string") {
        // If it's not a valid user id, do not include it. Storage layer can accept authorId if it's valid.
        const possibleId = payload.authorId;
        const user = await storage.getUser(possibleId).catch(() => null);
        if (!user) {
          delete payload.authorId;
        }
      }

      const post = await storage.createBlogPost(payload);
      res.json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.get("/api/admin/feedback", isAdmin, async (req, res) => {
    try {
      const feedback = await storage.getUserFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get("/api/admin/messages", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getUserMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/messages", isAdmin, async (req, res) => {
    try {
      const message = await storage.createUserMessage(req.body);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Admin pricing routes
  app.get("/api/admin/pricing", isAdmin, async (req, res) => {
    try {
      const pricing = await storage.getSubscriptionPricing();
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  app.post("/api/admin/pricing", isAdmin, async (req, res) => {
    try {
      const pricing = await storage.createSubscriptionPricing(req.body);
      res.json(pricing);
    } catch (error) {
      console.error("Error creating pricing:", error);
      res.status(500).json({ message: "Failed to create pricing" });
    }
  });

  app.put("/api/admin/pricing/:id", isAdmin, async (req, res) => {
    try {
      const pricingId = parseInt(req.params.id);
      const pricing = await storage.updateSubscriptionPricing(pricingId, req.body);
      res.json(pricing);
    } catch (error) {
      console.error("Error updating pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  app.delete("/api/admin/pricing/:id", isAdmin, async (req, res) => {
    try {
      const pricingId = parseInt(req.params.id);
      await storage.deleteSubscriptionPricing(pricingId);
      res.json({ message: "Pricing deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing:", error);
      res.status(500).json({ message: "Failed to delete pricing" });
    }
  });

  // Public pricing route (for landing and pricing pages)
  app.get("/api/pricing", async (req, res) => {
    try {
      const pricing = await storage.getSubscriptionPricing();
      const activePricing = pricing.filter(plan => plan.isActive);
      res.json(activePricing);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  // Translation API
  app.post("/api/translate", isAuthenticated, async (req: any, res) => {
    try {
      const { text, from, to } = req.body;
      const userId = req.user.id;

      if (!text || !text.trim()) {
        return res.status(400).json({
          message: "Text is required for translation",
          error: "MISSING_TEXT",
        });
      }

      if (!to) {
        return res.status(400).json({
          message: "Target language is required",
          error: "MISSING_TARGET_LANGUAGE",
        });
      }

      // Perform translation using google-translate-api-x
      const result = await translate(text, {
        from: from && from !== "auto" ? from : "auto",
        to,
        forceFrom: !!(from && from !== "auto"),
      });

      if (!result || !result.text) {
        return res.status(500).json({
          message: "Translation failed",
          error: "TRANSLATION_FAILED",
        });
      }

      const translationData = {
        userId,
        sourceText: text,
        translatedText: result.text,
        sourceLang: from || "auto",
        targetLang: to,
        detectedLang: result.from?.language?.iso || null,
        confidence: result.raw ? null : null, // confidence is not supported by this package
      };

      await storage.createTranslation(translationData);

      try {
        await storage.createToolUsage({
          toolId: 12,
          userId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          success: true,
          errorMessage: null,
        });
        await storage.incrementToolUsage(12);
      } catch (error) {
        console.error("Failed to track translation usage:", error);
      }

      res.json({
        translatedText: result.text,
        detectedLanguage: result.from?.language?.iso || null,
        success: true,
      });
    } catch (error: any) {
      console.error("Translation error:", error);

      try {
        await storage.createToolUsage({
          toolId: 12,
          userId: req.user?.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          success: false,
          errorMessage: error.message,
        });
      } catch (trackingError) {
        console.error("Failed to track translation error:", trackingError);
      }

      res.status(500).json({
        message:
          "Translation service temporarily unavailable. Please try again.",
        error: "TRANSLATION_SERVICE_ERROR",
        success: false,
      });
    }
  });

  // Translate a blog post by id (admin or authenticated) - returns translated fields
  app.post("/api/translate/blog/:id", isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { to, from } = req.body;
      if (!to) return res.status(400).json({ message: "Target language required" });

      const post = await storage.getBlogPostById(postId);
      if (!post) return res.status(404).json({ message: "Blog post not found" });

      // Translate title, excerpt, and content (content may be HTML - translate text only)
  const titleResult = await translate(post.title || "", { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });
  const excerptResult = await translate(post.excerpt || "", { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });

      // For content, strip HTML to translate plain text, then put translated text back as simple paragraph
      const plain = (post.content || "").replace(/<[^>]+>/g, " ");
  const contentResult = await translate(plain, { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });

      // Persist translations in translations table for history
      const userId = req.user?.id || null;
      await storage.createTranslation({ userId, sourceText: post.title || "", translatedText: titleResult.text, sourceLang: from || 'auto', targetLang: to, detectedLang: titleResult.from?.language?.iso || null });
      await storage.createTranslation({ userId, sourceText: post.excerpt || "", translatedText: excerptResult.text, sourceLang: from || 'auto', targetLang: to, detectedLang: excerptResult.from?.language?.iso || null });
      await storage.createTranslation({ userId, sourceText: plain, translatedText: contentResult.text, sourceLang: from || 'auto', targetLang: to, detectedLang: contentResult.from?.language?.iso || null });

      res.json({
        translated: {
          title: titleResult.text,
          excerpt: excerptResult.text,
          content: `<p>${(contentResult.text || "").replace(/\n/g, "</p><p>")}</p>`,
        },
      });
    } catch (error) {
      console.error("Error translating blog post:", error);
      res.status(500).json({ message: "Failed to translate blog post" });
    }
  });

  // Translate a tool by id - returns translated fields
  app.post("/api/translate/tool/:id", isAuthenticated, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const { to, from } = req.body;
      if (!to) return res.status(400).json({ message: "Target language required" });

      const tool = await storage.getTool(toolId);
      if (!tool) return res.status(404).json({ message: "Tool not found" });

  const nameResult = await translate(tool.name || "", { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });
  const descResult = await translate(tool.description || "", { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });

      const userId = req.user?.id || null;
      await storage.createTranslation({ userId, sourceText: tool.name || "", translatedText: nameResult.text, sourceLang: from || 'auto', targetLang: to, detectedLang: nameResult.from?.language?.iso || null });
      await storage.createTranslation({ userId, sourceText: tool.description || "", translatedText: descResult.text, sourceLang: from || 'auto', targetLang: to, detectedLang: descResult.from?.language?.iso || null });

      res.json({ translated: { name: nameResult.text, description: descResult.text } });
    } catch (error) {
      console.error("Error translating tool:", error);
      res.status(500).json({ message: "Failed to translate tool" });
    }
  });

  // Public translate endpoint for client-side translated blocks (no auth required)
  app.post('/api/translate/public', async (req: any, res) => {
    try {
      const { text, to, from } = req.body;
      if (!text) return res.status(400).json({ message: 'Text required' });
      if (!to) return res.status(400).json({ message: 'Target language required' });

      const result = await translate(String(text || ''), { from: from && from !== 'auto' ? from : 'auto', to, forceTo: true });
      res.json({ translated: result.text });
    } catch (err) {
      console.error('Public translate failed', err);
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  // Get translation history
  app.get("/api/translate/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await storage.getUserTranslations(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching translation history:", error);
      res.status(500).json({ message: "Failed to fetch translation history" });
    }
  });

  // Delete translation from history
  app.delete(
    "/api/translate/history/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // This would need to be implemented in storage if we want delete functionality
        res.json({ message: "Translation deleted" });
      } catch (error) {
        console.error("Error deleting translation:", error);
        res.status(500).json({ message: "Failed to delete translation" });
      }
    }
  );

  // URL Shortener API (Premium feature)
  app.post("/api/shorten", isAuthenticated, async (req: any, res) => {
    const { nanoid } = await import("nanoid");
    try {
      const userId = req.user.id;
      const { originalUrl, customSlug, title } = req.body;

      if (!originalUrl) {
        return res.status(400).json({ message: "Original URL is required" });
      }

      // Validate URL format
      try {
        new URL(originalUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Generate short code
      let shortCode = customSlug;
      if (!shortCode) {
        shortCode = nanoid(8);
      } else {
        // Check if custom slug is already taken
        const existingUrl = await storage.getShortUrl(shortCode);
        if (existingUrl) {
          return res.status(400).json({
            message:
              "Custom slug already exists. Please choose a different one.",
          });
        }
      }

      // Create shortened URL
      const shortUrl = await storage.createShortUrl({
        userId,
        originalUrl,
        shortCode,
        title: title || null,
      });

      const baseUrl =
        process.env.VITE_API_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const shortenedUrl = `${baseUrl}/s/${shortCode}`;

      res.json({
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortCode: shortUrl.shortCode,
        shortenedUrl,
        title: shortUrl.title,
        clickCount: shortUrl.clickCount,
        createdAt: shortUrl.createdAt,
      });
    } catch (error) {
      console.error("Error creating short URL:", error);
      res.status(500).json({ message: "Failed to create short URL" });
    }
  });

  // Get user's URLs
  app.get("/api/my-urls", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const urls = await storage.getUserShortUrls(userId);

      const baseUrl =
        process.env.VITE_API_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const urlsWithShortenedUrl = urls.map((url) => ({
        ...url,
        shortenedUrl: `${baseUrl}/s/${url.shortCode}`,
      }));

      res.json(urlsWithShortenedUrl);
    } catch (error) {
      console.error("Error fetching user URLs:", error);
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });

  // Delete URL
  app.delete("/api/urls/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const urlId = parseInt(req.params.id);

      await storage.deleteShortUrl(urlId, userId);
      res.json({ message: "URL deleted successfully" });
    } catch (error) {
      console.error("Error deleting URL:", error);
      res.status(500).json({ message: "Failed to delete URL" });
    }
  });

  // URL Analytics (Premium feature)
  app.get("/api/url-analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if user has premium access
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionType === "free") {
        return res.status(403).json({
          message: "Premium subscription required for URL analytics",
          isPremium: true,
        });
      }

      const analytics = await storage.getUrlAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching URL analytics:", error);
      res.status(500).json({ message: "Failed to fetch URL analytics" });
    }
  });

  // Short URL redirect handler
  app.get("/s/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      const shortUrl = await storage.getShortUrl(shortCode);

      if (!shortUrl || !shortUrl.isActive) {
        return res.status(404).send("Short URL not found or inactive");
      }

      // Track click
      await storage.incrementUrlClicks(shortUrl.id);
      await storage.createUrlClick({
        urlId: shortUrl.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || null,
        referer: req.get("Referer") || null,
        country: null, // Could be enhanced with IP geolocation
      });

      // Redirect to original URL
      res.redirect(shortUrl.originalUrl);
    } catch (error) {
      console.error("Error handling short URL redirect:", error);
      res.status(500).send("Internal server error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
