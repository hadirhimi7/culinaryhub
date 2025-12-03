# 🍽️ CulinaryHub - Secure Recipe Sharing Platform

**Domain:** [culinaryhub.com](https://culinaryhub.com)

A secure, full-stack web application for sharing and discovering recipes. Built with security-first principles, featuring role-based access control, content moderation, and comprehensive audit logging.

---

## 📁 Project Structure

```
culinaryhub/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── setup/          # Express app configuration
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth, logging, error handling
│   │   └── db.ts           # SQLite database layer
│   ├── uploads/            # Secure file storage
│   └── logs/               # Application logs
├── frontend/               # React SPA (Vite + TypeScript)
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable components
│       ├── hooks/          # Custom React hooks
│       └── layouts/        # Layout components
├── data/                   # SQLite database files
├── logs/                   # Security audit logs
└── docs/
    ├── security/           # Security documentation
    └── penetration-testing/# Pen-testing templates
```

---

## 🚀 Quick Start


## 🔐 Security Measures Implementation

### 1. Password Hashing (bcrypt)

| Aspect | Details |
|--------|---------|
| **Purpose** | Secure password storage resistant to rainbow table attacks |
| **Algorithm** | bcrypt with 12 salt rounds |
| **Storage** | Only hashed passwords stored in database, never plaintext |

**📁 File Locations:**
- `backend/src/routes/auth.ts` (lines 40-43) - Registration password hashing
- `backend/src/routes/auth.ts` (lines 103-107) - Login password verification
- `backend/src/seed.ts` (line 42) - Seed user password hashing

```typescript
// backend/src/routes/auth.ts - Line 40
const passwordHash = await bcrypt.hash(password, 12);  // 12 salt rounds
const user = await createUser(name, email, passwordHash, role);

// Login verification - Line 103
const ok = await bcrypt.compare(password, user.password_hash);
```

---

### 2. Session-Based Authentication

| Aspect | Details |
|--------|---------|
| **Purpose** | Stateful authentication without JWT exposure risks |
| **Cookie Flags** | HttpOnly, SameSite=Lax, Secure (production) |
| **Session Regeneration** | On every login to prevent session fixation |

**📁 File Locations:**
- `backend/src/setup/app.ts` (lines 35-50) - Session middleware configuration
- `backend/src/routes/auth.ts` (lines 133-146) - Session regeneration on login
- `backend/src/middleware/auth.ts` (lines 10-35) - Session validation middleware

```typescript
// backend/src/setup/app.ts - Session config
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,        // Prevents XSS cookie theft
    secure: isProduction,  // HTTPS only in production
    sameSite: 'lax',       // CSRF protection
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

---

### 3. OTP (One-Time Password) Verification

| Aspect | Details |
|--------|---------|
| **Purpose** | Two-factor authentication for regular users |
| **Format** | 6-digit numeric code |
| **Expiry** | 10 minutes |
| **Applies To** | User role only (not admin/editor) |

**📁 File Locations:**
- `backend/src/routes/auth.ts` (lines 10-13) - OTP generation function
- `backend/src/routes/auth.ts` (lines 46-66) - OTP on registration
- `backend/src/routes/auth.ts` (lines 109-130) - OTP on login
- `backend/src/routes/auth.ts` (lines 156-191) - OTP verification endpoint
- `backend/src/db.ts` - OTP storage functions (createOtpCode, verifyOtpCode)
- `frontend/src/hooks/useAuth.tsx` (lines 85-115) - OTP UI handling
- `frontend/src/pages/LoginPage.tsx` (lines 200-280) - OTP input form

```typescript
// backend/src/routes/auth.ts - Line 10
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}
```

---

### 4. AFK (Away From Keyboard) Timeout

| Aspect | Details |
|--------|---------|
| **Purpose** | Protects unattended sessions from unauthorized use |
| **Timeout** | 25 minutes of inactivity |
| **Mechanism** | Frontend heartbeat + backend session tracking |

**📁 File Locations:**
- `backend/src/routes/auth.ts` (lines 264-295) - Heartbeat & activity check endpoints
- `backend/src/middleware/auth.ts` (line 25) - Activity timestamp update
- `frontend/src/hooks/useAuth.tsx` (lines 50-80) - Heartbeat interval & activity tracking

```typescript
// backend/src/routes/auth.ts - Line 283
const AFK_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes
if (lastActivity && (now - lastActivity) > AFK_TIMEOUT_MS) {
  req.session.destroy(() => {
    res.json({ active: false, reason: 'afk_timeout' });
  });
}
```

---

### 5. Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: manage users, approve posts, view logs, delete any content |
| **Editor** | Create/edit content, view all posts |
| **User** | View approved content, create posts (require approval), delete own posts |

**📁 File Locations:**
- `backend/src/middleware/auth.ts` (lines 37-55) - `requireRole` middleware
- `backend/src/routes/posts.ts` (lines 101, 291, 341, 377) - Role-protected routes
- `backend/src/routes/admin.ts` (lines 18-113) - Admin-only routes
- `frontend/src/components/ProtectedRoute.tsx` - Frontend route protection

```typescript
// backend/src/middleware/auth.ts - Line 37
export const requireRole = (roles: string[]) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      securityLogger.warn('forbidden_access', {
        userId: req.user?.id,
        attemptedRoles: roles
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

### 6. CSRF Protection

| Aspect | Details |
|--------|---------|
| **Purpose** | Prevents cross-site request forgery attacks |
| **Implementation** | csurf middleware with per-session tokens |
| **Header** | `X-CSRF-Token` required on all state-changing requests |

**📁 File Locations:**
- `backend/src/setup/app.ts` (lines 55-65) - CSRF middleware configuration
- `backend/src/setup/app.ts` (lines 70-75) - `/api/csrf-token` endpoint
- `frontend/src/hooks/useAuth.tsx` (lines 130-145) - CSRF token fetching
- `frontend/src/pages/ContentPage.tsx` (lines 120-135) - CSRF in form submissions

```typescript
// backend/src/setup/app.ts - CSRF setup
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

### 7. SQL Injection Prevention

| Aspect | Details |
|--------|---------|
| **Technique** | Parameterized queries with `?` placeholders |
| **Validation** | Zod schema validation on all inputs |
| **Database** | SQLite with sqlite3 driver |

**📁 File Locations:**
- `backend/src/db.ts` (entire file) - All database queries use parameterized statements
- `backend/src/routes/auth.ts` (lines 15-29) - Zod validation schemas
- `backend/src/routes/posts.ts` (lines 57-67) - Post validation schemas

```typescript
// backend/src/db.ts - Parameterized queries (SAFE)
db.get('SELECT * FROM users WHERE id = ?', [userId], callback);
db.run('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content]);

// NEVER concatenate user input:
// db.get(`SELECT * FROM users WHERE id = ${userId}`);  // VULNERABLE!
```

---

### 8. XSS Prevention

| Layer | Protection |
|-------|------------|
| **HTTP Headers** | Helmet middleware sets X-XSS-Protection, CSP |
| **React** | Automatic HTML escaping in JSX |
| **Validation** | Server-side input sanitization |

**📁 File Locations:**
- `backend/src/setup/app.ts` (lines 25-33) - Helmet configuration
- `frontend/src/pages/*.tsx` - React's automatic escaping

```typescript
// backend/src/setup/app.ts - Line 25
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

---

### 9. File Upload Security

| Measure | Implementation |
|---------|----------------|
| **MIME Validation** | Whitelist: image/jpeg, image/png, image/gif, image/webp |
| **Size Limit** | 15MB for images |
| **Filename** | Random UUID (prevents path traversal) |
| **Storage** | Non-public directory |
| **Authorization** | Only owner or admin can download/delete |

**📁 File Locations:**
- `backend/src/routes/posts.ts` (lines 14-42) - Multer config for post images
- `backend/src/routes/files.ts` (lines 15-50) - General file upload config
- `backend/src/routes/files.ts` (lines 80-120) - Download authorization check

```typescript
// backend/src/routes/posts.ts - Line 31
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },  // 15MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});
```

---

### 10. Rate Limiting

| Aspect | Details |
|--------|---------|
| **Purpose** | Prevents DoS attacks and brute force |
| **Limit** | 100 requests per 15 minutes per IP |
| **Response** | 429 Too Many Requests |

**📁 File Locations:**
- `backend/src/setup/app.ts` (lines 18-24) - Rate limiter configuration

```typescript
// backend/src/setup/app.ts - Line 18
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: { error: 'Too many requests' }
}));
```

---

### 11. Content Moderation

| Feature | Description |
|---------|-------------|
| **Approval Workflow** | Non-admin posts start as 'pending' |
| **Forbidden Words** | Configurable blocklist (e.g., "security") |
| **Ownership Check** | Users can only delete their own content |

**📁 File Locations:**
- `backend/src/routes/posts.ts` (lines 44-55) - Forbidden word filter
- `backend/src/routes/posts.ts` (lines 196-286) - Post creation with approval logic
- `backend/src/routes/posts.ts` (lines 288-336) - Approve/reject endpoints
- `backend/src/routes/posts.ts` (lines 474-522) - Delete authorization

```typescript
// backend/src/routes/posts.ts - Line 44
const FORBIDDEN_WORDS = ['security'];

function containsForbiddenWords(text: string) {
  const lowerText = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lowerText.includes(word)) return { hasForbidden: true, word };
  }
  return { hasForbidden: false };
}
```

---

### 12. Security Logging & Audit Trail

| Event | Logged Data |
|-------|-------------|
| Authentication | login_success, login_failed, logout, otp_verified |
| Content | post_created, post_approved, post_deleted |
| Admin Actions | user_deleted, forbidden_word_attempt |
| Security | unauthorized_access, forbidden_access |

**📁 File Locations:**
- `backend/src/middleware/logging.ts` - Winston logger configuration
- `backend/src/routes/auth.ts` (multiple lines) - Auth event logging
- `backend/src/routes/posts.ts` (multiple lines) - Content event logging
- `backend/src/routes/admin.ts` (lines 96-104, 151-249) - Admin action logging & log viewing
- `backend/logs/security.log` - Log output file

```typescript
// backend/src/middleware/logging.ts
export const securityLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' })
  ]
});

// Usage example - backend/src/routes/posts.ts
securityLogger.info('post_created', {
  postId: newId,
  authorName: user.name,
  title,
  description: `${user.name} created post "${title}"`
});
```

---

### 13. CORS Configuration

| Aspect | Details |
|--------|---------|
| **Purpose** | Controls cross-origin requests |
| **Credentials** | Enabled for cookie-based auth |
| **Origins** | Whitelist configured via environment |

**📁 File Locations:**
- `backend/src/setup/app.ts` (lines 12-17) - CORS middleware

```typescript
// backend/src/setup/app.ts - Line 12
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}));
```

---

### 14. User Management (Admin)

| Feature | Description |
|---------|-------------|
| **View Users** | Admin can see all registered users |
| **Delete Users** | Cascading delete (posts, files, OTPs) |
| **Protection** | Cannot delete other admins or self |

**📁 File Locations:**
- `backend/src/routes/admin.ts` (lines 30-52) - List users endpoint
- `backend/src/routes/admin.ts` (lines 54-113) - Delete user endpoint
- `frontend/src/pages/AdminPage.tsx` (lines 120-145) - User deletion UI

```typescript
// backend/src/routes/admin.ts - Line 64
if (targetUserId === adminId) {
  return res.status(400).json({ error: 'Cannot delete your own account' });
}
if (user.role === 'admin') {
  return res.status(403).json({ error: 'Cannot delete admin users' });
}
```

---

## 🗂️ Security Files Summary

| File | Security Features |
|------|-------------------|
| `backend/src/setup/app.ts` | Session, CORS, Helmet, Rate Limiting, CSRF |
| `backend/src/middleware/auth.ts` | Authentication, Authorization, RBAC |
| `backend/src/middleware/logging.ts` | Security audit logging |
| `backend/src/routes/auth.ts` | Password hashing, OTP, Session management |
| `backend/src/routes/posts.ts` | Content moderation, File upload security |
| `backend/src/routes/admin.ts` | User management, Log viewing |
| `backend/src/routes/files.ts` | File upload validation, Download authorization |
| `backend/src/db.ts` | Parameterized queries (SQL injection prevention) |
| `frontend/src/hooks/useAuth.tsx` | CSRF tokens, AFK timeout, Session handling |
| `frontend/src/components/ProtectedRoute.tsx` | Frontend route protection |

---

## 🌐 Production Deployment

### Environment Variables

**Backend (`backend/.env`):**
```env
NODE_ENV=production
PORT=4000
SESSION_SECRET=your-super-secure-random-secret-min-32-chars
FRONTEND_URL=https://culinaryhub.com
DATABASE_PATH=./data/database.sqlite
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=https://api.culinaryhub.com
```

### Domain Configuration

| Service | Domain |
|---------|--------|
| Frontend | `https://culinaryhub.com` |
| API Backend | `https://api.culinaryhub.com` |

---

## 📊 API Endpoints

### Authentication
| Method | Endpoint | Auth | File |
|--------|----------|------|------|
| POST | `/api/auth/register` | No | `routes/auth.ts` |
| POST | `/api/auth/login` | No | `routes/auth.ts` |
| POST | `/api/auth/logout` | Yes | `routes/auth.ts` |
| GET | `/api/auth/me` | Yes | `routes/auth.ts` |
| POST | `/api/auth/verify-otp` | No | `routes/auth.ts` |
| POST | `/api/auth/heartbeat` | Yes | `routes/auth.ts` |

### Content
| Method | Endpoint | Auth | File |
|--------|----------|------|------|
| GET | `/api/posts` | Yes | `routes/posts.ts` |
| POST | `/api/posts` | Yes | `routes/posts.ts` |
| DELETE | `/api/posts/:id` | Owner/Admin | `routes/posts.ts` |
| PUT | `/api/posts/:id/approve` | Admin | `routes/posts.ts` |

### Admin
| Method | Endpoint | Auth | File |
|--------|----------|------|------|
| GET | `/api/admin/users` | Admin | `routes/admin.ts` |
| DELETE | `/api/admin/users/:id` | Admin | `routes/admin.ts` |
| GET | `/api/admin/logs` | Admin | `routes/admin.ts` |

---

## 🧪 Testing

See `docs/penetration-testing/` for security test templates.

---

**CulinaryHub** - Share recipes securely. 🍳🔐
