## System Hardening Notes

### Baseline Hardening

- Enforce HTTPS with HSTS via reverse proxy (e.g., Nginx).
- Disable unnecessary HTTP methods (allow only GET/POST/PUT/DELETE where needed).
- Apply OS-level hardening (firewall rules, minimal services).

### Application Hardening

- Keep dependencies up to date and monitor for vulnerabilities.
- Enforce strong password policy and rate-limit login attempts.
- Ensure detailed errors are logged but not exposed to end users.

### Future Enhancements

- Add security headers at proxy level (CSP, Referrer-Policy, etc.).
- Integrate WAF rules tuned for the app.


