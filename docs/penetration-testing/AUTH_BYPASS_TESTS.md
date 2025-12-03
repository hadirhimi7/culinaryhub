## Authentication Bypass Attempts

### Scope

- Login, logout, and session handling.
- Access to protected routes without valid session.

### Test Cases

- Direct access to protected API routes without cookies.
- Manipulating session cookies.
- Reusing old session IDs after logout.
- Forcing role changes in requests.

### Findings

- **Status**: _Pending manual testing_
- **Notes**: Backend enforces role checks in middleware; verify there are no bypass paths.


