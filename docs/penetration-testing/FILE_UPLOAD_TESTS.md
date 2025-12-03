## File Upload Exploit Attempts

### Scope

- File upload endpoint and storage.
- File download/access control.

### Test Cases

- Upload of dangerous file types (`.php`, `.jsp`, `.exe`, etc.).
- Polyglot files (valid image + script).
- Oversized files (bypass of size limits).
- Path traversal attempts in filenames.
- Direct access to uploaded files without authorization.

### Findings

- **Status**: _Pending manual testing_
- **Notes**: Uploaded files are stored outside the public root and only served via authorized download endpoints.


