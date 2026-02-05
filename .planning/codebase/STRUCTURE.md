# Codebase Structure

**Analysis Date:** 2026-02-05

## Directory Layout

```
/opt/lampp/htdocs/wdi/
├── index.php                    # Public landing page
├── login.php                    # Public login page
├── 404.php                      # Error page
├── forgot_password.php          # Password reset page
├── login-executor.php           # Executor login page
├── header-loggedout.php         # Navigation bar (public)
├── jumbotron_links.php          # Landing page links section
│
├── account/                     # Authenticated user account pages
│   ├── index.php               # Account entry point (redirects to user's home page)
│   ├── dashboard.php           # User dashboard
│   ├── dashboard_admin.php     # Administrator dashboard
│   ├── dashboard_sub_admin.php # Sub-administrator dashboard
│   ├── user_will_information.php # Will creation/editing (main form)
│   ├── user_details.php        # User profile/settings
│   ├── account_settings.php    # Account settings
│   ├── users.php               # User management (admin)
│   ├── groups.php              # Group management
│   ├── partner.php             # Partner user page
│   ├── partner-exec.php        # Partner executor page
│   ├── partner-sub.php         # Partner sub-admin page
│   ├── create-user.php         # Create new user (admin)
│   ├── administrator.php       # Administrator settings
│   ├── site_authorization.php  # Authorization settings
│   ├── site_settings.php       # Site-wide settings
│   ├── admin_mark_payment.php  # Payment marking
│   ├── admin-switch-logout.php # Admin impersonation logout
│   ├── notify-me.php           # Notification preferences
│   ├── logout.php              # Logout handler
│   ├── print-will-*.php        # Will document generation (PDF, Word, HTML)
│   └── 404.php                 # Access denied page
│
├── api/                         # API endpoints (66 files)
│   ├── process_login.php       # Login handler
│   ├── load_current_user.php   # Load user data
│   ├── delete_user.php         # User deletion
│   ├── activate_user.php       # User activation
│   ├── delete.php              # Generic deletion
│   ├── update_exec_user.php    # Update executor
│   ├── delete_group.php        # Delete group
│   ├── add_trust_minor_children.php
│   ├── will_marital_status.php
│   ├── process_deceased_confirmed.php
│   ├── process_deceased_not_registered.php
│   ├── senforvalidation.php    # Send for validation
│   ├── validate-will-delete.php
│   ├── user_exec_reset_password.php
│   ├── generate_captcha.php
│   ├── current_will.php
│   ├── update_action_permit.php
│   ├── load_permission_validators.php
│   ├── load_secure_functions.php
│   ├── update_plugin_settings.php
│   └── [52 other specialized endpoints]
│
├── executors/                   # Executor interface
│   ├── index.php               # Executor dashboard entry
│   ├── login/
│   │   ├── index.php           # Executor login page
│   │   ├── register.php        # Executor registration
│   │   ├── forgot_exec_password.php
│   │   ├── js/
│   │   │   ├── login.js
│   │   │   ├── signup.js
│   │   │   ├── jquery-2.2.4.min.js
│   │   │   └── bootstrap.js
│   │   └── login/              # Login form templates
│   └── css/
│
├── models/                      # Core business logic and utilities
│   ├── config.php              # Main configuration and requires
│   ├── config-localhost.php    # Local development config
│   ├── db-settings.php         # Database credentials
│   ├── db-settings-live.php    # Production database config
│   │
│   ├── db_functions.php        # User/will/group database operations (1000+ lines)
│   ├── authorization.php       # Permission system and validators
│   ├── class.user.php          # loggedInUser class (authentication)
│   ├── class.mail.php          # userCakeMail class (email delivery)
│   ├── class_validator.php     # Validator class (input validation)
│   ├── form_builder.php        # FormBuilder class (dynamic forms)
│   │
│   ├── funcs.php               # Utility functions (formatting, parsing)
│   ├── error_functions.php     # Alert management, API responses
│   ├── template_functions.php  # Page rendering helpers
│   ├── password.php            # Password hashing/verification
│   ├── countries.php           # Country/locale data
│   ├── mail_settings.php       # Email configuration
│   ├── post.php                # POST variable handling
│   ├── secure_functions.php    # Security utilities
│   ├── validation/
│   │   ├── Validator.php       # Valitron library
│   │   └── lang/               # Validation messages
│   │       ├── en.php
│   │       └── [other locales]
│   │
│   ├── languages/              # Localization strings
│   │   ├── gb_GB.php           # English
│   │   ├── za_ZA_afrikaans.php # Afrikaans
│   │   ├── za_ZA_zulu.php      # Zulu
│   │   ├── select-language.php # Language selector
│   │   └── setter.php          # Set active language
│   │
│   ├── page-templates/         # HTML templates
│   │   ├── head.php            # <head> template
│   │   ├── footer.php          # Footer template
│   │   └── [other shared templates]
│   │
│   ├── mail-templates/         # Email templates
│   ├── search/                 # Search functionality
│   │   └── search.php
│   │
│   ├── rb.php                  # RedBean ORM library
│   ├── chrome.php              # Chrome PHP debugging
│   │
│   ├── jQuery-File-Upload/     # File upload handler (3rd party)
│   ├── mpdf/                   # PDF generation library (3rd party)
│   ├── PHPWord/                # Word document library (3rd party)
│   ├── willpdf/                # Will-specific PDF formatting
│   └── table_builder.php       # Table generation
│
├── forms/                       # Dynamic form definitions
│   ├── dynamic.php             # Dynamic form template
│   ├── delete.php              # Delete confirmation form
│   ├── form_user-bu.php        # User form backup
│   ├── form_group.php          # Group management form
│   ├── form_confirm_delete.php # Delete confirmation
│   ├── user-register.php       # User registration form
│   ├── user-register-backend.php # Backend registration
│   ├── user-edit-mail-pass.php # Email/password change
│   ├── user-executor-private.php # Executor form
│   ├── user-get-validated-will.php
│   ├── user-upload-documents-bu.php
│   ├── user-upload-own-signed-will.php
│   ├── user-upload-signed-will.php
│   ├── table_users_in_group_sub_admin.php
│   ├── exec-user-edit.php
│   ├── will/                   # Will-specific forms (multi-step wizard)
│   │   ├── notify_me.php
│   │   ├── choose-own-executors-bu.php
│   │   ├── notify_me_friends.php
│   │   ├── legacy.php
│   │   └── [other will steps]
│   └── [30+ other form files]
│
├── payment/                     # Payment processing
│   ├── web/
│   │   └── index.php
│   └── lib/
│       └── js/                 # Payment JS libraries
│
├── phpforms/                    # Form library (3rd party)
│   ├── index.php               # Form library demo/index
│   ├── Form.php                # Main form class
│   ├── plugins-path.php
│   ├── plugins/                # Form plugins (jQuery, tinymce, etc.)
│   ├── plugins-config/
│   ├── templates/              # Form templates
│   ├── database/               # Form database utilities
│   ├── documentation/
│   ├── mailer/
│   └── Validator/              # Form validation
│
├── PHPMailer/                   # Email library (3rd party)
│   ├── class.phpmailer.php
│   ├── extras/
│   └── language/
│
├── css/                         # Stylesheets
│   ├── bootstrap/              # Bootstrap framework
│   ├── tablesorter/            # Table sorting styles
│   └── fonts/                  # Font files
│
├── js/                          # Client-side JavaScript
│   ├── form-validation.js      # Form validation logic
│   ├── widget-users.js         # User management widget
│   ├── widget-permits.js       # Permission widget
│   ├── morris/                 # Chart library
│   ├── raphael/                # Vector graphics library
│   ├── tablesorter/            # Table sorting library
│   ├── locales/                # Localization JS
│   └── twitter-bootstrap-wizard/ # Multi-step form wizard
│
├── docs/                        # Documentation
├── fonts/                       # Font files
│
├── signed-will/                 # User signed will storage
│   └── files/                  # Uploaded signed wills
│
├── validated-will/              # Validated will storage
│   └── files/                  # Generated valid wills
│
├── uploaded-documents/          # User document storage
│   └── files/                  # Uploaded supporting documents
│
├── part-print-will-word/        # Will export templates
│
└── .planning/                   # Project planning (added by orchestrator)
    └── codebase/
        ├── ARCHITECTURE.md
        └── STRUCTURE.md
```

## Directory Purposes

**Root Files:**
- `index.php`: Public landing page, checks if user logged in
- `login.php`: Public login form
- `login-executor.php`: Executor login page
- `forgot_password.php`: Password reset request form
- `header-loggedout.php`: Navigation bar template for public pages
- `jumbotron_links.php`: Dynamic links section on landing page
- `404.php`: Generic error/access denied page
- `auth.md`, `LICENSE.md`: Documentation files

**`/account/` - Authenticated User Pages:**
- Purpose: All pages requiring user authentication
- Contains: Dashboard, user settings, will management, document generation, admin interfaces
- Access: Controlled by `securePage()` function checking user role
- Key files: `user_will_information.php` (main will form), `dashboard.php` (user home), `*_admin.php` (admin-only)

**`/api/` - Request Endpoints:**
- Purpose: Handle AJAX and form submissions with JSON responses
- Contains: 66 endpoint files for specific operations
- Access: Some public (process_login), most require authentication
- Pattern: Each file handles single operation (create, update, delete, process)

**`/executors/` - Executor Interface:**
- Purpose: Separate authentication and dashboard for will executors
- Contains: Login system, executor-specific forms, dashboard
- Key: `/executors/login/` handles executor credentials separately from user authentication

**`/models/` - Core Business Logic:**
- Purpose: All reusable functions, classes, and utilities
- Key subdirectories:
  - `languages/`: Localization strings for all UI text
  - `validation/`: Valitron validator with language-specific messages
  - `page-templates/`: Shared HTML templates (head, footer)
  - `mail-templates/`: Email message templates
  - Third-party libraries: `mpdf/`, `PHPWord/`, `jQuery-File-Upload/`, `rb.php`

**`/forms/` - Form Definitions:**
- Purpose: Dynamic form structures for user input
- Contains: User registration, will creation, document upload, group management
- Subdirectory `/forms/will/`: Multi-step will wizard forms
- Pattern: Each form dynamically rendered using form_builder.php

**`/payment/` - Payment Processing:**
- Purpose: Handle payment integrations
- Contains: Payment gateway handlers and JavaScript libraries

**`/phpforms/` - Form Library:**
- Purpose: Third-party form builder library with advanced features
- Status: Included but not primary will form system
- Contains: Demo forms, form templates, plugins for rich editors, file uploads

**`/css/` - Stylesheets:**
- Purpose: Bootstrap framework and custom styles
- Contains: Bootstrap components, table sorting styles, font files
- Subdirectory: `tablesorter/` for sortable table styling

**`/js/` - Client-Side Code:**
- Purpose: jQuery plugins, widgets, form validation
- Key files: `form-validation.js` (client-side validation), `widget-users.js` (user UI)
- Libraries: Morris.js (charts), Raphael (graphics), Twitter Bootstrap Wizard (multi-step forms)

**`/signed-will/files/`, `/validated-will/files/`, `/uploaded-documents/files/` - File Storage:**
- Purpose: Store generated and uploaded documents
- Generated: Directories created at runtime, not in git
- Permissions: Should be writable by web server

**`/docs/` - Documentation:**
- Purpose: Project documentation

## Key File Locations

**Entry Points:**

**Public Entry:**
- `index.php`: Main landing page, redirects to account if logged in
- `login.php`: Login form page
- `forgot_password.php`: Password reset form

**Authenticated Entry:**
- `/account/index.php`: Account router, redirects to user's home page
- `/account/dashboard.php`: Default user dashboard

**Admin Entry:**
- `/account/dashboard_admin.php`: Administrator dashboard
- `/account/dashboard_sub_admin.php`: Sub-administrator dashboard

**Executor Entry:**
- `/executors/index.php`: Executor dashboard entry point
- `/executors/login/index.php`: Executor login

**Configuration:**
- `/models/config.php`: Main configuration file (requires all dependencies)
- `/models/db-settings.php`: Database credentials
- `/models/db-settings-live.php`: Production database credentials
- `/models/languages/setter.php`: Active language selection
- `/models/mail_settings.php`: Email configuration

**Core Logic:**
- `/models/db_functions.php`: User, will, and group database operations (primary business logic)
- `/models/authorization.php`: Permission system and PermissionValidators class
- `/models/class_validator.php`: Validator class for input validation
- `/models/form_builder.php`: FormBuilder class for dynamic form generation
- `/models/error_functions.php`: Alert system and API response functions

**Database:**
- `/models/db_functions.php`: Query builders for users, wills, groups, executors
- `/models/rb.php`: RedBean ORM library
- `/models/post.php`: POST variable handling

**Authentication:**
- `/models/class.user.php`: loggedInUser class
- `/models/password.php`: Password hashing/verification
- `/api/process_login.php`: Login request handler

**Utilities:**
- `/models/funcs.php`: Formatting (phone, currency), string utilities, comment parsing
- `/models/template_functions.php`: Page rendering helpers (renderAccountPageHeader, renderMenu)
- `/models/countries.php`: Country data and locale
- `/models/secure_functions.php`: Security utilities

**Third-Party Libraries:**
- `/models/mpdf/`: mPDF library for PDF generation
- `/models/PHPWord/`: PHPWord library for Word document generation
- `/models/jQuery-File-Upload/`: jQuery File Upload plugin
- `/models/rb.php`: RedBean ORM
- `/phpforms/`: Advanced form builder library
- `/PHPMailer/`: PHPMailer email library

**Client-Side:**
- `/js/form-validation.js`: Client-side form validation
- `/js/widget-users.js`: User management UI
- `/js/widget-permits.js`: Permission management UI
- `/js/twitter-bootstrap-wizard/`: Multi-step form wizard

## Naming Conventions

**Files:**
- Public pages: lowercase with hyphens (e.g., `forgot_password.php`, `admin-switch-logout.php`)
- API endpoints: lowercase with underscores or hyphens (e.g., `process_login.php`, `validate-will-delete.php`)
- Classes: `class.ClassName.php` (e.g., `class.user.php`, `class.mail.php`)
- Form files: descriptive with `form_` or `user-` prefix (e.g., `form_group.php`, `user-register.php`)
- Forms by domain: `form_` for non-user (groups), `user-` for user-related, `will/` subdirectory for will steps

**Directories:**
- Lowercase with hyphens for multi-word names (e.g., `/uploaded-documents/`, `/signed-will/`)
- Functional grouping by domain: `account/` (pages), `api/` (endpoints), `models/` (logic), `forms/` (forms)
- Vendor/third-party: Preserved as-is (`/jQuery-File-Upload/`, `/PHPMailer/`, `/PHPWord/`)

**Functions:**
- camelCase convention (e.g., `isUserLoggedIn()`, `addAlert()`, `apiReturnSuccess()`)
- Prefixes indicate purpose:
  - `fetch*`: Retrieve data from database (`fetchUserHomePage()`, `fetchConfigParameters()`)
  - `check*`: Validate or verify something (`checkRequestMode()`, `checkActionPermission()`)
  - `is*`: Boolean check (`isUserLoggedIn()`, `isDefaultGroup()`)
  - `api*`: API response handling (`apiReturnError()`, `apiReturnSuccess()`)
  - `add*`: Insert or queue (`addAlert()`)

**Variables:**
- `$loggedInUser`: Global authenticated user object
- `$_SESSION["userAlerts"]`: Alert queue for user-facing messages
- `$_SESSION["__csrf_token"]`: CSRF token
- `$db_table_prefix`: Database table prefix (configurable)
- `$email_login`: Boolean config for email vs username login
- `$dev_env`: Development environment flag (enables verbose errors)

**Database:**
- `{$db_user_table_prefix}users`: User accounts
- `{$db_user_table_prefix}groups`: User groups
- `{$db_user_table_prefix}wills`: Will documents
- `{$db_user_table_prefix}executor_private`: Executor accounts
- Table prefix configurable via `db-settings.php`

**Classes:**
- `loggedInUser`: Session-based user object
- `PermissionValidators`: Static permission checking methods
- `FormBuilder`: Dynamic form generation
- `Validator`: Input validation wrapper
- `userCakeMail`: Email delivery
- Vendor classes: RedBean (ORM), Valitron (validation), mPDF, PHPWord

## Where to Add New Code

**New User Feature:**
- Primary code: `/models/db_functions.php` (add database functions)
- API handler: `/api/new_feature.php` (new endpoint)
- Form: `/forms/feature.php` or `/forms/will/feature.php` (if part of wizard)
- Page: `/account/feature.php` (if user-facing page)
- Authorization: `/models/authorization.php` (add permission validators if needed)

**New Admin Page:**
- Page: `/account/admin_feature.php` (follows naming convention)
- Check: Call `securePage(__FILE__)` at top to verify access
- Logic: Use functions from `/models/db_functions.php` or create new functions there
- Authorization: Define permission check in `/models/authorization.php`

**New API Endpoint:**
- File: `/api/operation_name.php`
- Template: Require config, set error handler, check request mode, validate input, execute, return response
- Validation: Use Validator class with `requiredPostVar()` for required fields
- Response: Use `apiReturnSuccess()` or `apiReturnError()` with appropriate $ajax flag
- Alerts: Use `addAlert()` for user-facing messages

**New Form:**
- Definition: `/forms/form_name.php` or `/forms/domain/form_name.php`
- Pattern: Use FormBuilder class to generate fields dynamically
- Submission: POST to `/api/process_form_name.php`
- Integration: Include form in page using `<?php include 'forms/form_name.php'; ?>`

**New Utility Function:**
- Location: `/models/funcs.php` (general), `/models/db_functions.php` (database), `/models/template_functions.php` (rendering)
- Pattern: Document with PHPDoc-style comment block
- Naming: Follow camelCase convention with appropriate prefix (fetch*, check*, is*, add*)

**New Language/Localization:**
- File: `/models/languages/locale_code.php` (e.g., `es_ES.php` for Spanish)
- Array structure: `$LANG['KEY'] = 'translation';`
- Usage in pages: `<?php echo lang("KEY"); ?>`
- Configuration: Set in `/models/languages/setter.php`

**New Email Template:**
- File: `/models/mail-templates/template_name.php`
- Variable substitution: `{{username}}`, `{{email}}`, etc.
- Sending: Use `userCakeMail` class methods
- Configuration: Set sender in `/models/mail_settings.php`

**New Third-Party Library:**
- Directory: Create in `/models/vendor_name/` or `/lib/vendor_name/`
- Requirement: Add include in `/models/config.php`
- Namespace: If using modern PHP library with namespaces, include before use

## Special Directories

**`/signed-will/files/`, `/validated-will/files/`, `/uploaded-documents/files/`:**
- Purpose: Store user-uploaded and system-generated documents
- Generated: Yes, created at runtime
- Committed: No, should be in .gitignore
- Permissions: Must be writable by web server (0755 or 0777)
- Cleanup: May require periodic deletion of old files

**`/node_modules/`, `/vendor/`:**
- Purpose: Dependency directories for npm/composer packages
- Generated: Yes, created by package managers
- Committed: No, should be in .gitignore
- Status: Not currently used (no package.json or composer.json in root)

**`/models/jQuery-File-Upload/server/php/`:**
- Purpose: Server-side file upload handler for jQuery File Upload plugin
- File: `/models/jQuery-File-Upload/server/php/UploadHandler.php`
- Usage: Handles multipart form uploads with validation
- Configuration: Set in `/models/jquery-file-upload-template.php`

---

*Structure analysis: 2026-02-05*
