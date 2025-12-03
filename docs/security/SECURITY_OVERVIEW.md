## Security Overview

This document summarizes the security architecture for **Project S1 2025**.

### Authentication & Authorization

- Session-based authentication with `express-session` and HttpOnly cookies.
- Passwords hashed with bcrypt before storage.
- Roles: `admin`, `editor`, `user`.
- Permissions enforced via middleware on backend routes and role-based UI on the frontend.

### Data Protection

- All passwords hashed using bcrypt with a per-password salt.
- Sensitive fields (e.g., email) are encrypted at rest using Node's `crypto` module (AES-256).
- HTTPS/TLS must be enforced at the reverse proxy or hosting layer (e.g., Nginx, Cloudflare).

### SQL Injection Prevention

- SQLite with parameterized queries only.
- No string concatenation of untrusted input into SQL statements.

### Session Management

- HttpOnly, `sameSite=lax` cookies.
- Session expiration (1 hour).
- Session ID regeneration after login.

### File Upload Security

- File size limits.
- MIME type checks and extension whitelisting.
- Sanitized filenames.
- Files stored outside the public web root.
- Hook for malware scanning (ClamAV or external API can be integrated).

### Logging & Monitoring

- Security-relevant events logged to `logs/security.log`.
- Events: failed logins, unauthorized access attempts, file uploads, server errors.
- Logs are structured for easier parsing and analysis.


