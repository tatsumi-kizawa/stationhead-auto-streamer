# Session Management - Implementation Guide

## Overview

This document describes the session persistence implementation using Playwright's `storageState` API. This allows the Stationhead Auto Streamer to maintain login sessions across browser restarts, eliminating the need for repeated manual logins.

## Architecture

### Components

1. **SessionManager** (`src/browser/session.ts`)
   - Manages session file I/O operations
   - Validates session state
   - Provides session lifecycle management

2. **StationheadAuth** (`src/browser/auth.ts`)
   - High-level authentication interface
   - Integrates SessionManager with login logic
   - Handles session expiration and automatic re-login

3. **Test Script** (`scripts/test-session-auth.ts`)
   - Demonstrates usage
   - Validates session persistence functionality

## How It Works

### First Run (Fresh Login)

```
1. No session file exists
2. Create new browser context
3. Perform login (email + password)
4. Save session to file using storageState()
   → data/sessions/stationhead-session.json
```

### Subsequent Runs (Session Restoration)

```
1. Session file exists
2. Load session from file
3. Create browser context with restored session
4. Validate session is still active
5. If valid: Skip login ✅
   If invalid: Perform fresh login 🔄
```

## Usage

### Basic Usage

```typescript
import { chromium } from 'playwright';
import { StationheadAuth } from './src/browser/auth';

const browser = await chromium.launch({ headless: false });

// Create auth instance
const auth = new StationheadAuth(
  browser,
  'your@email.com',
  'yourpassword'
);

// Login (automatically uses session if available)
const context = await auth.login();

// Use the authenticated context
const page = await context.newPage();
await page.goto('https://www.stationhead.com');

// Logout when done (optional)
await auth.logout();
await browser.close();
```

### Advanced Usage

```typescript
// Custom session name (for multiple accounts)
const auth = new StationheadAuth(
  browser,
  'account1@email.com',
  'password1',
  'account1-session.json'
);

// Check session info
const sessionInfo = auth.getSessionInfo();
console.log(sessionInfo);
// Output: { path: '...', cookies: 6, origins: 2 }

// Manual session management
const sessionManager = new SessionManager('custom-session.json');
await sessionManager.saveSession(context);
const isValid = await sessionManager.isSessionValid(context);
sessionManager.deleteSession();
```

## Session File Structure

The session file (`stationhead-session.json`) contains:

```json
{
  "cookies": [
    {
      "name": "cookie_name",
      "value": "cookie_value",
      "domain": ".stationhead.com",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://www.stationhead.com",
      "localStorage": [
        {
          "name": "key",
          "value": "value"
        }
      ]
    }
  ]
}
```

**⚠️ Security Note:** This file contains sensitive authentication data and is automatically excluded from git via `.gitignore`.

## Session Validation

The `isSessionValid()` method checks:

1. **URL Check:** Not redirected to login page
2. **Element Check:** Presence of logged-in user elements
   - Profile button (`[aria-label*="Profile"]`)
   - User menu (`[aria-label*="User"]`)
   - Streaming-related content

If any check passes, the session is considered valid.

## API Reference

### SessionManager

#### Constructor
```typescript
new SessionManager(
  sessionName?: string,  // Default: 'stationhead-session.json'
  sessionsDir?: string   // Default: 'data/sessions'
)
```

#### Methods

**`saveSession(context: BrowserContext): Promise<void>`**
- Saves current session state to file

**`loadSession(browser: Browser, viewport?): Promise<BrowserContext>`**
- Loads session from file and creates context
- Returns new context if session doesn't exist

**`isSessionValid(context: BrowserContext): Promise<boolean>`**
- Validates if session is still active

**`hasSession(): boolean`**
- Checks if session file exists

**`deleteSession(): void`**
- Deletes saved session file

**`getSessionInfo(): object | null`**
- Returns session metadata (for debugging)

### StationheadAuth

#### Constructor
```typescript
new StationheadAuth(
  browser: Browser,
  email: string,
  password: string,
  sessionName?: string
)
```

#### Methods

**`login(): Promise<BrowserContext>`**
- Main login method
- Automatically handles session restoration/re-login

**`logout(): Promise<void>`**
- Clears session and closes context

**`getContext(): BrowserContext | null`**
- Returns current browser context

**`getSessionInfo(): object | null`**
- Returns session metadata

## Testing

### Run the test script

```bash
# First run: Will perform login and save session
npx ts-node scripts/test-session-auth.ts

# Second run: Will use saved session (no login)
npx ts-node scripts/test-session-auth.ts
```

### Expected Output (First Run)
```
🧪 Testing session persistence with StationheadAuth

ℹ️  No existing session, will perform fresh login
🔐 Starting fresh login...
📄 Navigating to login page...
✅ Login successful!
✅ Session saved to data/sessions/stationhead-session.json
```

### Expected Output (Subsequent Runs)
```
🧪 Testing session persistence with StationheadAuth

📂 Existing session found
🔄 Loading existing session from data/sessions/stationhead-session.json
🔍 Validating session...
✅ Session is valid
✅ Using existing valid session
```

## Error Handling

### Session Load Failure
- If session file is corrupted, falls back to fresh login
- Old session is deleted automatically

### Session Validation Failure
- If session is expired, performs fresh login
- New session is saved automatically

### Login Failure
- Saves error screenshot to `screenshots/login-error-{timestamp}.png`
- Throws error with descriptive message

## Security Considerations

1. **File Protection**
   - Session files are excluded from git (`.gitignore`)
   - Contains sensitive cookies and tokens
   - Should never be committed to version control

2. **File Permissions**
   - Session files are created with default user permissions
   - Consider restricting to owner-only (chmod 600) for production

3. **Session Expiration**
   - Sessions may expire after period of inactivity
   - Automatic re-login handles expiration gracefully

4. **Multiple Accounts**
   - Use different session names for different accounts
   - Prevents session conflicts

## Troubleshooting

### "Session invalid" on every run
- Session may have short expiration time
- Check Stationhead's cookie expiration settings
- Verify network connectivity

### Session file not created
- Check `data/sessions/` directory exists
- Verify write permissions
- Check disk space

### Login fails after session restoration
- Clear session manually: `rm data/sessions/stationhead-session.json`
- Run script again for fresh login
- Check credentials in `.env` file

## Future Enhancements

1. **Session Encryption**
   - Encrypt session files at rest
   - Use encryption key from environment variable

2. **Session Refresh**
   - Automatic token refresh before expiration
   - Extend session lifetime

3. **Multi-Account Support**
   - Session pool management
   - Account switching without re-login

4. **Session Analytics**
   - Track session lifetime
   - Monitor session validity
   - Alert on repeated login failures

## Related Files

- `src/browser/session.ts` - SessionManager implementation
- `src/browser/auth.ts` - StationheadAuth implementation
- `scripts/test-session-auth.ts` - Test and demo script
- `data/sessions/` - Session storage directory (gitignored)
- `.gitignore` - Excludes session files from version control

## References

- [Playwright storageState API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
