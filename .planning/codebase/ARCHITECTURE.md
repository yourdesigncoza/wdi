# Architecture

**Analysis Date:** 2026-02-05

## Pattern Overview

**Overall:** Traditional MVC (Model-View-Controller) with procedural PHP backend and jQuery/Bootstrap frontend. Monolithic application structured around user roles and permissions.

**Key Characteristics:**
- Public-facing pages (login, index) separate from secured account pages
- API-driven AJAX interactions for data processing
- Role-based access control with permission validators
- Session-based authentication with CSRF token protection
- Functional programming model (procedural PHP functions) with some class-based abstractions

## Layers

**Presentation Layer:**
- Purpose: Render HTML templates and user interfaces
- Location: `*.php` files in root, `/account/`, `/executors/` directories
- Contains: HTML markup with embedded PHP, jQuery AJAX handlers, Bootstrap components
- Depends on: Template functions, authorization checks, language localization
- Used by: Direct browser requests, JavaScript AJAX calls

**API/Request Handler Layer:**
- Purpose: Process form submissions, AJAX requests, and business logic execution
- Location: `/api/` directory (66 endpoint files)
- Contains: Form validation, database operations, permission checks, response formatting
- Depends on: Validator class, database functions, authorization, error handling
- Used by: Frontend AJAX requests, form submissions

**Business Logic Layer:**
- Purpose: Core application functionality for wills, users, executors, groups, permissions
- Location: `/models/db_functions.php`, `/models/authorization.php`
- Contains: User management, will processing, group management, permission evaluation
- Depends on: Database layer, validation
- Used by: API handlers, page controllers

**Data Abstraction Layer:**
- Purpose: Database connectivity and low-level query execution
- Location: `/models/db_functions.php`, `/models/rb.php` (RedBean ORM)
- Contains: PDO prepared statements, query builders, connection pooling
- Depends on: Database configuration, PDO driver
- Used by: All business logic and API endpoints

**Support/Utility Layer:**
- Purpose: Cross-cutting concerns and helper functions
- Location: `/models/` directory
  - `funcs.php`: Formatting, string utilities, comment parsing
  - `error_functions.php`: Alert queuing, API response formatting
  - `form_builder.php`: Dynamic form generation (FormBuilder class)
  - `class_validator.php`: Input validation (Validator class)
  - `password.php`: Password hashing and security
  - `countries.php`: Locale/country data
  - `mail_settings.php`, `class.mail.php`: Email delivery
- Depends on: None (utilities)
- Used by: All layers

## Data Flow

**User Authentication:**

1. User submits login form on `/login.php` → POST to `/api/process_login.php`
2. API handler validates credentials using `Validator` class
3. Checks username/email and password against database via `db_functions.php`
4. Creates session with `loggedInUser` object (stores user_id, email, hash_pw, csrf_token)
5. Returns JSON response via `apiReturnSuccess()` or `apiReturnError()`
6. Frontend redirects to account dashboard on success

**Secured Page Access:**

1. User requests page like `/account/dashboard.php`
2. Page calls `securePage(__FILE__)` function which:
   - Checks if user is logged in via `isUserLoggedIn()`
   - Evaluates permission validators against page requirements
   - Uses `checkActionPermission()` to verify user has access
3. If authorized, page renders with user data
4. If not authorized, forwards to `/account/404.php`

**Form Submission with Dynamic Content:**

1. Page like `/account/user_will_information.php` loads form from `/forms/will/` directory
2. Form builder generates HTML from configuration
3. User submits → `/api/` endpoint processes
4. API validates input using Validator class
5. Database functions execute prepared statements with parameterized queries
6. Alerts queued in session via `addAlert()`
7. Response returned as JSON for AJAX or redirect for POST
8. Next page load displays alerts via `alertWidget()` JavaScript

**Will Generation & Document Creation:**

1. User navigates through will forms in `/forms/will/` (multi-step wizard)
2. Each step POSTs to corresponding API endpoint
3. Data stored in database via insert/update functions
4. Document generation pages (`/account/print-will-pdf.php`, etc.) call:
   - `/models/mpdf/` for PDF rendering
   - `/models/PHPWord/` for Word document generation
   - `/models/willpdf/` for will-specific formatting
5. Completed will stored in `/signed-will/files/`, `/validated-will/files/`, `/uploaded-documents/files/`

**State Management:**

- **Session State:** User authentication, alerts, referral pages stored in `$_SESSION`
- **Request State:** Current form data in `$_POST` or `$_GET`
- **Database State:** Persistent user data, will data, permissions, groups
- **Object State:** Single `loggedInUser` object instantiated from class in `/models/class.user.php`
- **Authorization State:** Permission validators evaluated per-request using PermissionValidators class

## Key Abstractions

**PermissionValidators:**
- Purpose: Encapsulate authorization logic for page/action access
- Location: `/models/authorization.php`
- Pattern: Static class methods for permission checking (isLoggedInUser, isUserPrimaryGroup, isDefaultGroup, etc.)
- Usage: `checkActionPermission('action_name', [user_id, group_id])` evaluates against defined permits

**FormBuilder:**
- Purpose: Dynamically generate HTML form elements from configuration
- Location: `/models/form_builder.php`
- Pattern: Class-based form abstraction with methods for field rendering
- Usage: `new FormBuilder()` instantiated and configured per form page

**Validator:**
- Purpose: Input validation and sanitization
- Location: `/models/class_validator.php`
- Pattern: Wrapper around Valitron validator with required field checking
- Usage: `$validate->requiredPostVar('username')`, `$validate->sanitize()`

**loggedInUser:**
- Purpose: Encapsulate authenticated user state and CSRF token handling
- Location: `/models/class.user.php`
- Pattern: Singleton-like object stored in global `$loggedInUser`
- Methods: `updateLastSignIn()`, `csrf_token($regen)`, `csrf_validate($token)`, `userLogOut()`

**Mail System:**
- Purpose: Unified email delivery with error handling
- Location: `/models/class.mail.php`
- Class: `userCakeMail` with PHPMailer integration
- Pattern: Configuration-driven SMTP settings, template support

## Entry Points

**Public Entry Points:**

**`/index.php`:**
- Location: Root directory
- Triggers: Direct browser navigation to domain root
- Responsibilities: Display landing page, check if user already logged in (forward to account if true), load navigation and jumbotron

**`/login.php`:**
- Location: Root directory
- Triggers: User clicks login button or navigates to /login.php
- Responsibilities: Display login form, handle login form submission via AJAX to `/api/process_login.php`, load dynamic navigation

**Secured Entry Points (require authentication):**

**`/account/index.php`:**
- Location: `/account/index.php`
- Triggers: User logs in successfully
- Responsibilities: Verify user logged in, fetch user's home page (dashboard, settings, etc.), redirect to appropriate account page

**`/account/dashboard.php`:**
- Location: `/account/dashboard.php`
- Triggers: Authenticated user navigates to dashboard
- Responsibilities: Call `securePage(__FILE__)` to verify access, render menu via `renderMenu()`, display user's will information and statistics

**`/account/user_will_information.php`:**
- Location: `/account/user_will_information.php`
- Triggers: User begins creating/editing will
- Responsibilities: Load multi-step form wizard, render form fields from `/forms/will/` directory, handle form steps

**Executor Entry Points:**

**`/executors/index.php`:**
- Location: `/executors/index.php`
- Triggers: Executor logs in
- Responsibilities: Authenticate executor credentials, redirect to executor dashboard

**`/executors/login/index.php`:**
- Location: `/executors/login/index.php`
- Triggers: Executor navigates to login
- Responsibilities: Display executor login form, handle executor authentication

**API Entry Points (all require POST):**

**`/api/process_login.php`:**
- Triggers: Form submission from `/login.php` (AJAX or POST)
- Validates username/email and password
- Returns JSON response with success/error status

**`/api/delete.php`:**
- Triggers: User deletion request
- Validates permission, removes user from database

**`/api/load_current_user.php`:**
- Triggers: Page needs current user data
- Returns user object as JSON

**Other API endpoints (66 total):**
- `/api/create_user_backend.php`, `/api/activate_user.php`, `/api/user_exec_reset_password.php`
- `/api/add_trust_minor_children.php`, `/api/will_marital_status.php`, `/api/process_deceased_confirmed.php`
- `/api/senforvalidation.php`, `/api/validate-will-delete.php`, etc.

## Error Handling

**Strategy:** Layered error handling with custom error handler, database exception catching, and user-facing alerts

**Patterns:**

**PHP Error Handler:**
- Function `logAllErrors()` defined in `/models/config.php`
- Set via `set_error_handler('logAllErrors')` in API files
- Logs errors to file system instead of displaying to user
- Throws ErrorException for fatal errors

**Try-Catch for Database Operations:**
```php
try {
    $db = pdoConnect();
    $stmt = $db->prepare($query);
    $stmt->execute($sqlVars);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    addAlert("danger", "Oops, looks like our database encountered an error.");
    error_log("Error in " . $e->getFile() . " on line " . $e->getLine() . ": " . $e->getMessage());
    return false;
} catch (ErrorException $e) {
    addAlert("danger", "Oops, looks like our server might have goofed.");
    return false;
}
```

**User-Facing Error Alerts:**
- Errors queued via `addAlert("danger", $message)` function
- Stored in `$_SESSION["userAlerts"]`
- Displayed by jQuery `alertWidget('display-alerts')` on next page load
- Types: "danger" (errors), "warning" (warnings), "success" (confirmations)

**API Error Responses:**
- AJAX requests return JSON: `{"errors": 1, "successes": 0}` via `apiReturnError($ajax)`
- POST requests redirect to landing page (default: 404.php)
- Error is indicated by `errors` count in JSON response

## Cross-Cutting Concerns

**Logging:**
- Approach: File-based logging via `error_log()` function to `errors.log` in root
- Severity levels: Errors logged with context (file, line, message)
- Debug logging: Can enable via setting `$dev_env = TRUE` in `/models/config.php` (currently FALSE)

**Validation:**
- Approach: Valitron validator wrapper in `/models/class_validator.php`
- Required field checking via `$validate->requiredPostVar('fieldname')`
- Custom validation rules defined in Valitron, language-specific in `/models/validation/lang/`
- Input sanitization via `$validate->sanitize()` method

**Authentication:**
- Approach: Session-based with password hashing using bcrypt-style functions from `/models/password.php`
- Session identifier: `"userWillsDB"` used in session management
- User object: Global `$loggedInUser` instantiated with `new loggedInUser()`
- Last sign-in tracking: `updateLastSignIn()` called to record user activity
- Session destruction: `destroySession("userWillsDB")` on logout clears session data

**Authorization:**
- Approach: Function-based permission checking with PermissionValidators class
- Page-level: `securePage(__FILE__)` called at top of protected pages
- Action-level: `checkActionPermission($action, $args)` called for specific operations
- Permit strings: Define which roles can perform actions (e.g., "admin_user", "group_admin")
- Default group: Certain permissions tied to default user group

**Language/Localization:**
- Approach: Global `lang()` function retrieves messages from language files
- Language files: `/models/languages/` contains locale-specific arrays
- Supported: `gb_GB.php` (English), `za_ZA_afrikaans.php`, `za_ZA_zulu.php`
- Selection: `/models/languages/setter.php` determines active language

---

*Architecture analysis: 2026-02-05*
