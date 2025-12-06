import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import express, { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const pgStore = connectPg(session);
  let sessionStore: any = undefined;
  if (process.env.DATABASE_URL) {
    try {
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: 7 * 24 * 60 * 60, // 7 days
        tableName: "sessions",
      });
    } catch (err) {
      console.warn('Failed to initialize Postgres session store, falling back to in-memory store. Error:', err);
      sessionStore = undefined;
    }
  } else {
    console.warn('No DATABASE_URL configured; using in-memory session store (development only).');
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    // cookie: {
    //   httpOnly: true,
    //   // Allow overriding secure cookie behavior for local production testing.
    //   // By default, use secure cookies in production, otherwise false.
    //   secure: ((): boolean => {
    //     if (typeof process.env.SESSION_COOKIE_SECURE !== 'undefined') {
    //       return process.env.SESSION_COOKIE_SECURE === 'true';
    //     }
    //     return process.env.NODE_ENV === "production";
    //   })(),
    //   // Default sameSite to 'lax' which works for most top-level navigations
    //   sameSite: (process.env.SESSION_COOKIE_SAMESITE as any) || 'lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // },
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only HTTPS in prod
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },


  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  console.log('Session store in use:', sessionStore ? 'Postgres' : 'In-memory (dev)');
  console.log('Session cookie settings -> secure:', sessionSettings.cookie?.secure, 'sameSite:', sessionSettings.cookie?.sameSite);
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const firstName = profile.name?.givenName || "";
            const lastName = profile.name?.familyName || "";
            const profileImageUrl = profile.photos?.[0]?.value;

            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            // Check if user exists
            let user = await storage.getUserByEmail(email);

            if (!user) {
              // Create new user (explicitly set subscription defaults)
              user = await storage.createUser({
                email,
                firstName,
                lastName,
                profileImageUrl,
                googleId: profile.id,
                subscriptionType: "free",
                subscriptionStatus: "inactive",
                paymentStatus: "unpaid",
              });
            } else {
              // Update existing user with Google info
              user = await storage.updateUser(user.id, {
                googleId: profile.id,
                profileImageUrl: profileImageUrl || user.profileImageUrl,
              });
            }

            // Bump updatedAt to mark last-login time
            try {
              user = await storage.updateUser(user.id, {});
            } catch (err) {
              console.error("Error updating user updatedAt after Google login:", err);
            }

            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, false);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      console.log("Registering user:", req.body);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create new user (explicitly set subscription defaults)
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        subscriptionType: "free",
        subscriptionStatus: "inactive",
        paymentStatus: "unpaid",
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Ensure session is saved before responding
        try {
          req.session.save((saveErr: any) => {
            if (saveErr) console.error('Session save error after register:', saveErr);
            console.log('[AUTH] session saved after register, sessionID=', req.sessionID);
            res.status(201).json({ message: "User created successfully", user });
          });
        } catch (e) {
          // If session.save is unavailable, fallback to immediate response
          console.warn('Session.save unavailable after register, responding anyway');
          res.status(201).json({ message: "User created successfully", user });
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Ensure body is parsed and log request details before passport runs so missing
  // credentials are visible (helps diagnose SSR vs CSR differences).
  app.post(
    "/api/auth/login",
    // Local parsing middlewares in case global parsers were not applied for some entrypoint
    express.json(),
    express.urlencoded({ extended: false }),
    (req, res, next) => {
      try {
        console.log("[AUTH LOGIN] pre-auth req.headers:", {
          host: req.headers.host,
          origin: req.headers.origin,
          referer: req.headers.referer,
          cookie: req.headers.cookie?.slice(0, 200),
          'content-type': req.headers['content-type'],
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log("[AUTH LOGIN] pre-auth req.body:", req.body);
        }
      } catch (e) {
        console.error("[AUTH LOGIN] failed to log request details:", e);
      }

      // If credentials are missing, give a clearer error instead of passport's generic 400
      const hasEmail = req.body && (typeof req.body.email === 'string' && req.body.email.length > 0);
      const hasPassword = req.body && (typeof req.body.password === 'string' && req.body.password.length > 0);
      if (!hasEmail || !hasPassword) {
        return res.status(400).json({ message: 'Missing credentials: email and password are required' });
      }

      return next();
    },
    passport.authenticate("local"),
    async (req, res, next) => {
      try {
        const user = req.user as any;
        if (!user) return res.status(500).json({ message: "No user after authentication" });

        // Determine subscription status based on subscriptionEndsAt
        const now = new Date();
        let newStatus = "inactive";
        if (user.subscriptionEndsAt) {
          const endsAt = new Date(user.subscriptionEndsAt);
          if (!isNaN(endsAt.getTime()) && endsAt > now) {
            newStatus = "active";
          }
        } else {
          newStatus = "inactive";
        }

        let returnedUser = user;
        if (newStatus !== user.subscriptionStatus) {
          try {
            // Update subscription status in DB (include subscriptionType to match storage API)
            const subscriptionType = user.subscriptionType || "free";
            returnedUser = await storage.updateUserSubscription(user.id, { subscriptionType, subscriptionStatus: newStatus });
            // Refresh session user to reflect updated values
            req.login(returnedUser, (err) => {
              if (err) console.error("Error updating session user after subscription status update:", err);
            });
          } catch (err) {
            console.error("Error updating subscription status:", err);
          }
        }

        // Always bump updatedAt on login and refresh session user
        try {
          const bumped = await storage.updateUser(returnedUser.id, {});
          returnedUser = bumped;
          req.login(returnedUser, (err) => {
            if (err) console.error("Error refreshing session user after login updatedAt:", err);
          });
        } catch (err) {
          console.error("Error updating user updatedAt after login:", err);
        }

        // Ensure session is saved before responding to the login
        try {
          req.session.save((saveErr: any) => {
            if (saveErr) console.error('Session save error after login:', saveErr);
            console.log('[AUTH] session saved after login, sessionID=', req.sessionID);
            res.json({ message: "Login successful", user: returnedUser });
          });
        } catch (e) {
          // Fallback
          res.json({ message: "Login successful", user: returnedUser });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  // Add GET logout endpoint for frontend compatibility
  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    (req, res, next) => {
      // You can override prompt by passing ?prompt=select_account in the URL
      const prompt = String(req.query.prompt || "select_account");
      passport.authenticate("google", { scope: ["profile", "email"], prompt, accessType: 'offline', includeGrantedScopes: true })(req, res, next);
    }
  );

  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/auth?error=google_auth_failed" }, (err, user, info) => {
      if (err) {
        console.error("[AUTH GOOGLE] passport authenticate error:", err);
        return next(err);
      }

      if (!user) {
        console.warn("[AUTH GOOGLE] no user returned from passport authenticate", info);
        return res.redirect("/auth?error=google_auth_failed");
      }

      console.log("[AUTH GOOGLE] before login - req.user:", !!req.user, "sessionID=", req.sessionID);

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[AUTH GOOGLE] req.logIn error:", loginErr);
          return next(loginErr);
        }

        // Ensure session is fully saved before redirecting
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[AUTH GOOGLE] session save error:", saveErr);
          }
          console.log("[AUTH GOOGLE] session saved, redirecting. sessionID=", req.sessionID);
          return res.redirect("/dashboard");
        });
      });
    })(req, res, next);
  });
}