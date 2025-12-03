## Session Hijacking Tests

### Scope

- Session cookie handling (`sid` cookie).
- Session fixation and hijacking protection.

### Test Cases

- Stealing cookies via XSS (simulated).
- Session fixation: using same session ID before and after login.
- Forcing cookies over non-HTTPS (in production).
- Testing session timeout and idle expiration.

### Findings

- **Status**: _Pending manual testing_
- **Notes**: HttpOnly cookies mitigate simple JS theft; session IDs should be regenerated on login.


