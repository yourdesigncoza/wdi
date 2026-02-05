# Technology Stack

**Analysis Date:** 2026-02-05

## Languages

**Primary:**
- PHP 5.3+ - Server-side application logic, page rendering, API endpoints
- JavaScript 1.10+ - Client-side interactivity, form validation, dynamic UI
- HTML5 - Page structure and templates
- CSS3 - Styling and responsive layout

**Secondary:**
- MySQL/SQL - Database queries and schema definitions
- Apache Config - Server directives and rewrite rules

## Runtime

**Environment:**
- PHP CLI/CGI - Executed via Apache LAMP stack
- Apache 2.x - Web server (configured with mod_rewrite based on .htaccess files)

**Server Stack:**
- LAMP: Linux, Apache, MySQL, PHP
- Running on cpt1.host-h.net (production) or localhost (development)

**Package Manager:**
- Composer (PHP) - For PHP package management
- npm (JavaScript) - For JavaScript package dependencies (jQuery File Upload, timepicker, etc.)
- Bower (JavaScript) - For front-end package management (legacy)

## Frameworks

**Core:**
- PHP Vanilla MVC - `models/` folder contains business logic, config, and functions
- No formal MVC framework; custom architecture with procedural and object-oriented code

**Template Engine:**
- PHP included templates - `models/page-templates/` and `models/mail-templates/` directories
- Dynamic page rendering via `include` statements

**Testing:**
- PHPUnit 4.8.* (included in PHPWord development dependencies)
- No active test suite in main codebase

**Build/Dev:**
- No explicit build system detected
- Manual file organization
- Composer for autoloading PHP classes

## Key Dependencies

**Critical:**

- **PHPMailer** 5.x+ - Email generation and SMTP transport
  - Location: `PHPMailer/` and `executors/login/scripts/PHPMailer/`
  - Used for user registration, password reset, notifications
  - Supports SMTP with TLS/SSL encryption

- **PHPWord** 0.18.x - Word document generation (DOCX, PDF, RTF)
  - Location: `models/PHPWord/`
  - Used for generating wills in Word format
  - Depends on PhpOffice/Common and Zend Escaper

- **Valitron** (validation library) - Input validation
  - Location: `models/validation/Validator.php`
  - Extended with custom DefaultValidator for field defaults
  - Localized validation messages in `models/validation/lang/`

- **jQuery** 1.10.2 - DOM manipulation and AJAX
  - Location: `js/jquery-1.10.2.min.js`
  - Used throughout application for dynamic interactions

- **jQuery File Upload** 10.3.0 - Multi-file upload with drag-drop
  - Location: `models/jQuery-File-Upload/` and `phpforms/plugins/jQuery-File-Upload/`
  - Handles document uploads with progress tracking
  - Supports chunked uploads

**Infrastructure:**

- **PayGate PayWeb3** - Payment processing SDK
  - Location: `payment/web/paygate.payweb3.php`
  - Provides payment initiation, processing, and query endpoints
  - Uses HTTPS to secure.paygate.co.za
  - Supports encryption keys and checksum validation

- **Bootstrap 3.x** - Responsive CSS framework
  - Location: `js/bootstrap.js`, `css/bootstrap.css`
  - Used for UI layout, forms, modals, alerts

- **Bootstrap DatePicker** - Date input field
  - Location: `js/bootstrap-datepicker.js`
  - Provides date selection UI

- **Bootstrap Select** - Enhanced select dropdowns
  - Location: `phpforms/plugins/bootstrap-select/`
  - Searchable and multi-select capabilities

- **TinyMCE** - Rich text editor
  - Location: `phpforms/plugins/tinymce/`
  - For editing document content

- **Handlebars.js** 1.2.0 - Client-side templating
  - Location: `js/handlebars-v1.2.0.js`
  - Used for dynamic template rendering in JavaScript

- **Morris.js** - Charts and graphs library
  - Location: `js/morris/`
  - For visualizing user and payment data

- **Tablesorter** - Dynamic table sorting
  - Location: `js/tablesorter/`
  - Makes HTML tables interactive

- **Twitter Bootstrap Wizard** - Multi-step form wizard
  - Location: `js/twitter-bootstrap-wizard/`
  - Used for registration and will creation workflows

## Configuration

**Environment:**

- **Database Configuration:** `models/db-settings.php`
  - Hardcoded credentials with comments for production/development servers
  - PDO DSN: `mysql:host=$db_host;dbname=$db_name;charset=utf8`
  - Defaults: localhost/wdi (development), cpt1.host-h.net (production)

- **Mail Configuration:** `models/mail_settings.php`
  - SMTP host, port, username, password, from address
  - Current: web@me365days.co.za via www4.cpt1.host-h.net:587 (TLS)
  - Reply-to: support@me365days.co.za

- **Core Configuration:** `models/config.php`
  - Site URL, title, admin group IDs, session name
  - Email activation settings
  - Default executor and admin password (hardcoded)
  - Language selection (default: 'en')

- **PHP Error Handling:** `.user.ini`
  - `display_errors=On`
  - `log_errors=On`
  - Error log: `/usr/home/medayzyzqt/PHP_errors.log`

**Build:**

- No build configuration files detected (package.json only in plugin directories)
- Direct file serving with Apache rewrite rules in `.htaccess` files

## Platform Requirements

**Development:**

- PHP 5.3+ with extensions:
  - `ctype` (required by PHPMailer)
  - `xml` (required by PHPWord)
  - `pdo` and `pdo_mysql` (database access)
  - `openssl` (for CSRF token generation)
  - `session` (for user sessions)

- MySQL 5.x+ database server
- Apache 2.x with `mod_rewrite` enabled
- cURL support for PayGate payment integration

**Production:**

- Hosted on cpt1.host-h.net
- LAMP stack on shared hosting
- HTTPS support (indicated by ssl/tls mail configuration)
- Database: medayzyzqt_db2 (production server)

---

*Stack analysis: 2026-02-05*
