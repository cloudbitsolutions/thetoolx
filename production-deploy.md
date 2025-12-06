# TheToolx.com Production Deployment Guide

## Minimal Production Package.json

The `package.production.json` file contains only the essential server-side dependencies needed for production deployment. This reduces bundle size and improves deployment performance.

### Key Differences from Development:

**Excluded Client-Side Dependencies:**
- All React and frontend libraries (@radix-ui/*, react, react-dom, etc.)
- UI components and styling libraries (tailwind, framer-motion, etc.)
- Development tools (vite, typescript, esbuild, etc.)

**Included Server Dependencies:**
- **Database**: @neondatabase/serverless, drizzle-orm, drizzle-zod
- **Web Framework**: express, express-session
- **Authentication**: passport, passport-google-oauth20, passport-local, openid-client
- **File Processing**: mammoth (PDF), pdf-poppler, fluent-ffmpeg, multer
- **Payment**: razorpay
- **Utilities**: nanoid, node-fetch, memoizee, fast-speedtest-api, ytdl-core
- **WebSockets**: ws, bufferutil (optional)
- **Session Storage**: connect-pg-simple
- **Validation**: zod, zod-validation-error

### Production Build Process:

1. **Frontend Build**: `vite build` - Creates static assets in `dist/client`
2. **Server Build**: `esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
3. **Database Setup**: `drizzle-kit push` - Sync database schema

### Environment Variables Required:

```bash
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
SESSION_SECRET=your_session_secret
NODE_ENV=production
```

### Deployment Structure:

```
production/
├── dist/
│   ├── index.js          # Bundled server
│   └── client/           # Static frontend assets
├── package.production.json
└── .env
```

### Start Command:
```bash
NODE_ENV=production node dist/index.js
```

The server serves both the API endpoints and static frontend assets from a single process on port 5000.