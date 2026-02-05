# Codebase Concerns

**Analysis Date:** 2026-02-05

## Critical Security Issues

### Path Traversal / File Deletion Vulnerability
- **Issue:** Unvalidated user input directly used in file operations
- **Files:**
  - `signed-will/delete.php`
  - `validated-will/delete.php`
- **Risk:** High - Attackers can delete arbitrary files on the server
- **Problem:** Line 4-7: `$myFile = $_POST['filename'];` followed by `unlink($myFile)` with no validation
- **Fix approach:**
  - Implement whitelist of allowed file paths
  - Validate filename against user's uploaded documents only
  - Use a secure file storage abstraction layer with access controls
  - Never trust user-provided file paths directly

### Direct Unvalidated POST Parameter Access
- **Issue:** Multiple API endpoints access `$_POST` directly without sanitization
- **Files:**
  - `validated-will/delete-current.php` - Line 4
  - `signed-will/delete-current.php` - Line 4
  - `payment/web/result.php` - Lines 42-45
  - `payment/web/query.php` - Lines 21-23
  - `api/will_choose_executor.php` - Lines 25, 30, 155
  - `api/update_site_settings.php` - Lines 23-24, 46 (acknowledges with TODO comment)
- **Risk:** High - SQL Injection, cross-site scripting, command injection possible
- **Fix approach:**
  - Implement strict input validation on all endpoints
  - Use prepared statements consistently (codebase does this for some queries but inconsistently)
  - Add CSRF token validation for form submissions
  - Implement request signing for sensitive operations

### Global Variable Mismanagement
- **Issue:** 131+ uses of `global` keyword throughout codebase
- **Files:** Primarily in `models/db_functions.php`, `models/authorization.php`, `api/update_site_settings.php`
- **Risk:** Medium - State pollution, race conditions in concurrent requests, difficult to test
- **Explicitly flagged:** Line 46 of `api/update_site_settings.php` contains TODO: "get rid of these global variables! They're nothing but trouble!"
- **Fix approach:**
  - Refactor to use dependency injection
  - Create a configuration/settings service class
  - Pass required objects as function parameters instead of accessing globals
  - Use a singleton pattern for truly global resources (database connection)

## Tech Debt Issues

### Duplicate Vendor Libraries
- **Issue:** Multiple copies of same libraries in different locations
- **Files:**
  - PHPMailer: 3 copies
    - `PHPMailer/` (v5.2.14, dated 2019)
    - `executors/login/scripts/PHPMailer/` (v5.2.13, dated 2018)
    - `phpforms/mailer/phpmailer/` (v5.2.10, dated 2016)
  - jQuery-File-Upload: 2 copies
    - `phpforms/plugins/jQuery-File-Upload/`
    - `models/jQuery-File-Upload/`
- **Impact:** High maintenance burden, inconsistent versions, ~200KB+ duplicate code
- **Fix approach:**
  - Choose single canonical version
  - Remove duplicates
  - Use composer for dependency management
  - Consider modern replacement (SwiftMailer, newer PHPMailer with namespaces)

### Unresolved TODOs in Core Files
- **Issue:** Multiple unresolved TODO comments scattered through codebase
- **Files and issues:**
  - `forms/form_user.php:28` - "allow setting default groups"
  - `models/authorization.php:402` - "create permit option for the user's primary group only?"
  - `models/db_functions.php:693` - "make this cacheable so it doesn't have to be processed each time a page is loaded"
  - `models/db_functions.php:2119` - "check that user exists and isn't already assigned to group"
  - `models/db_functions.php:2268-2273` - "Match/Unmatch user(s) from a group" (2 unimplemented functions)
  - `models/secure_functions.php:1189` - "Check that user exists"
  - `models/secure_functions.php:1439` - "Check if selected group exists"
  - `models/template_functions.php:130` - "clear unspecified placeholders"
  - `models/class_validator.php:18` - "also use strip_tags()?"
  - `account/dashboard_sub_admin.php:15` - "account section has its own 404 page"
  - `account/dashboard_admin.php:15` - "account section has its own 404 page"
- **Risk:** Medium - Incomplete features, missing validations, performance problems
- **Fix approach:** Schedule review and completion of each TODO

### Hardcoded Email Address in Production Code
- **Issue:** Test email address hardcoded in production API
- **File:** `api/delete.php:51`
- **Code:** `$mail->addAddress('laudes.michael@gmail.com', 'Test Mail');`
- **Risk:** Medium - Sensitive data exposure, test code in production
- **Fix approach:**
  - Remove or move to configuration
  - Implement proper email configuration system
  - Use environment variables for test settings

### Overly Complex Files with High Coupling
- **Issue:** Very large monolithic files
- **Files and sizes:**
  - `models/mpdf/mpdf.php` - 32,751 lines (extremely difficult to test/maintain)
  - `models/rb.php` - 9,831 lines (RedBeanPHP ORM)
  - `phpforms/Form.php` - 2,157 lines
  - `phpforms/database/Mysql.php` - 1,984 lines
  - `models/db_functions.php` - 5,087 lines
- **Risk:** Medium - Difficult to understand, test, and modify. High bug surface area
- **Fix approach:**
  - Extract logical units into separate classes
  - Consider modular architecture
  - Implement single responsibility principle
  - Use dependency injection for clarity

## Security Gaps

### Inconsistent Session Management
- **Issue:** Session handling scattered across files, no centralized session service
- **Files:** Multiple entry points use `session_start()` differently
- **Pattern:** `@session_start()` in `validated-will/UploadHandler.php:239` - suppressed errors hide problems
- **Risk:** Session hijacking, fixation attacks
- **Fix approach:**
  - Centralize session management in config
  - Set secure session flags (HttpOnly, Secure, SameSite)
  - Implement session token refresh
  - Add explicit session validation

### File Upload Handling Security
- **Issue:** File upload handlers use deprecated patterns and lack validation
- **Files:**
  - `phpforms/plugins/jQuery-File-Upload/server/php/UploadHandler.php`
  - `signed-will/UploadHandler.php`
  - `validated-will/UploadHandler.php`
- **Risks:**
  - No MIME type verification (only filename extension checks)
  - No file size limits enforced
  - Uploaded files may be accessible/executable
- **Fix approach:**
  - Store uploads outside web root
  - Verify MIME types server-side (use fileinfo)
  - Set strict file size limits
  - Disable PHP execution in upload directory (.htaccess)
  - Rename files with random hash, strip original filename

### Missing CSRF Protection
- **Issue:** No CSRF tokens detected in POST handlers
- **Files:** All `/api/*.php` endpoints
- **Risk:** High - Forms vulnerable to cross-site request forgery
- **Fix approach:**
  - Generate unique token per user session
  - Include token in all forms
  - Validate token on form submission
  - Use SameSite cookie attribute

### Authentication Weaknesses
- **Issue:** Multiple authentication entry points with varying security
- **Files:**
  - `api/process_login.php`
  - `api/process_admin_login.php`
  - `api/process_login_executors.php`
  - `login-executor.php`
  - `login.php`
- **Problem:** Permission checking happens through `checkActionPermissionSelf()` which can be bypassed if function name doesn't match expected pattern
- **Risk:** Medium - Privilege escalation possible if permission checker misconfigured
- **Fix approach:**
  - Centralize authentication/authorization logic
  - Use explicit role-based access control (RBAC)
  - Implement middleware pattern for route protection
  - Add audit logging for auth failures

### Deprecated PHP Patterns
- **Issue:** Old PHP practices throughout codebase
- **Examples:**
  - Use of `@` error suppression operator (multiple files)
  - Manual `stripslashes()` and old escaping patterns
  - Inconsistent use of `isset()` vs `empty()` checks
  - Old-style string concatenation in SQL (though prepared statements used elsewhere)
- **Risk:** Low-Medium - Maintenance burden, potential for errors
- **Fix approach:**
  - Standardize on modern PHP patterns
  - Enable strict error reporting
  - Use null coalescing operator `??` instead of `isset()`
  - Ensure all database operations use prepared statements

## Performance Bottlenecks

### Unoptimized Database Queries
- **Issue:** Database functions called without caching or optimization
- **File:** `models/db_functions.php:693` - TODO explicitly notes "make this cacheable so it doesn't have to be processed each time a page is loaded"
- **Specific concern:** Group membership lookups happen frequently without caching
- **Fix approach:**
  - Implement query result caching
  - Add database indexing strategy
  - Use eager loading for related data
  - Consider ORM optimization

### Large PDF Processing
- **Issue:** mPDF library (32,751 lines) processes all PDFs synchronously
- **File:** `models/mpdf/mpdf.php`
- **Risk:** Long-running requests, server resource exhaustion with concurrent PDF generation
- **Fix approach:**
  - Implement async job queue (Redis, RabbitMQ)
  - Process PDFs in background workers
  - Add request timeout protection
  - Implement rate limiting

### Unnecessary File I/O
- **Issue:** Template and configuration files read from disk on every request
- **Files:**
  - `models/template_functions.php:133` - `file_get_contents($path)`
  - `models/willpdf/print-will-pdf.php:15-16` - CSS files loaded per request
  - `models/config.php` - Settings fetched from database on every request
- **Fix approach:**
  - Implement caching layer (Redis/Memcached)
  - Cache template compilation
  - Use opcode caching (APCu)
  - Load configuration once, reuse in request

## Test Coverage Gaps

### No Automated Testing
- **Issue:** No test files found in codebase
- **Risk:** High - Regressions go unnoticed, refactoring is dangerous
- **Critical untested areas:**
  - Authorization/permission checking
  - File upload handling
  - Payment processing integration
  - User creation and authentication
  - Will generation and PDF output
- **Fix approach:**
  - Implement unit testing (PHPUnit) for business logic
  - Add integration tests for API endpoints
  - Create fixtures for test data
  - Set up CI/CD pipeline with automated testing
  - Target minimum 70% code coverage

### Missing Input Validation Tests
- **Issue:** Validation functions exist but no corresponding tests
- **File:** `models/validation/Validator.php`
- **Risk:** Invalid data silently passes validation, corrupting database
- **Fix approach:**
  - Create comprehensive validation test suite
  - Test edge cases and boundary conditions
  - Test error messages and user feedback

## Dependency & Compatibility Issues

### PHP Version Compatibility
- **Issue:** Code targets very old PHP (5.2 era based on comments)
- **Examples:**
  - `PHPMailer/class.phpmailer.php:1168` - TODO about "idn_to_ascii" function for PHP <= 5.2
  - Old error handling patterns
- **Risk:** May not work on modern PHP (8.0+)
- **Fix approach:**
  - Target PHP 8.0+ with strict types
  - Remove legacy compatibility code
  - Update all dependencies to modern versions
  - Add type hints throughout codebase

### Outdated Vendor Libraries
- **Issue:** Multiple libraries are 6-10 years old
- **Examples:**
  - PHPMailer v5.2.10-5.2.14 (from 2014-2019, current is v6.9+)
  - jQuery 1.10-1.11 (extremely outdated)
  - Bootstrap (version unclear but likely very old based on file dates)
  - RedBean ORM 4.x era
  - mPDF has known security issues in older versions
- **Risk:** Medium-High - Known security vulnerabilities, compatibility issues
- **Fix approach:**
  - Update all dependencies
  - Use Composer for dependency management
  - Run security audit (`composer audit`)
  - Test thoroughly after updates

## Code Quality Issues

### Inconsistent Error Handling
- **Issue:** Different error handling patterns throughout codebase
- **Examples:**
  - Some places use exceptions, others return false
  - Some set error alerts, others output directly
  - Database connection errors sometimes logged, sometimes silent
- **Risk:** Medium - Errors silently fail, making debugging difficult
- **Fix approach:**
  - Standardize on exception-based error handling
  - Create custom exception hierarchy
  - Implement centralized error handler
  - Ensure all errors are logged

### Missing Input Validation in Core Operations
- **Issue:** Permission checks sometimes skip validation
- **File:** `models/authorization.php` - Permission validators are minimal
- **Example:** `isActive()` function (line 77-78) unconditionally returns true
- **Risk:** Medium - Bypasses may exist in permission system
- **Fix approach:**
  - Implement comprehensive validation
  - Add logging for permission checks
  - Create test cases for authorization edge cases

### Magic Strings and Hardcoded Values
- **Issue:** Configuration values scattered throughout code
- **Examples:**
  - Table prefixes passed through globals
  - Email templates referenced by string paths
  - Permission action names as strings
  - Alert message keys as strings
- **Risk:** Low-Medium - Brittleness, hard to refactor
- **Fix approach:**
  - Create configuration classes with constants
  - Use enums for known values
  - Centralize magic strings to one location

## Scaling Limitations

### Single Deployment Architecture
- **Issue:** Application assumes single server with shared filesystem
- **Risk:** Cannot scale horizontally, single point of failure
- **Files:** File operations in delete.php, UploadHandler.php assume local filesystem
- **Fix approach:**
  - Abstract file storage (use cloud storage: S3, GCS)
  - Use database for distributed state
  - Implement session storage in database (not file-based)
  - Use CDN for static assets

### Database Bottlenecks
- **Issue:** No indication of database optimization strategies
- **Risk:** Performance degrades with data growth
- **Fix approach:**
  - Analyze slow queries
  - Add appropriate indexes
  - Implement query result caching
  - Consider read replicas for reports

## Fragile Areas Requiring Careful Modification

### Authorization System
- **Files:** `models/authorization.php` (402 lines)
- **Fragility:** Complex permission validation with multiple static methods
- **Concern:** Permission checks scattered throughout codebase with function name matching
- **Safe modification:**
  - Add comprehensive test suite first
  - Refactor to centralized permission matrix
  - Add audit logging before/after changes

### Payment Processing
- **Files:** `payment/web/` directory with 7 PHP files
- **Fragility:** Handles sensitive financial data with hardcoded test email exposed
- **Concern:** Integration with PayGate, CHECKSUM validation critical
- **Safe modification:**
  - Document payment flow thoroughly
  - Add transaction logging
  - Test with actual PayGate sandbox
  - Review CHECKSUM generation (security-critical)

### User Creation/Registration
- **Files:** `api/create_user.php`, `account/create-user.php`
- **Fragility:** Creates accounts, sends emails, requires validation
- **Concern:** Permission checks, email sending, group assignment interdependent
- **Safe modification:**
  - Add integration tests with test database
  - Verify email sending doesn't fail silently
  - Test permission escalation prevention

### PDF Generation
- **Files:** `models/willpdf/`, `account/print-will-*.php`
- **Fragility:** Complex mPDF integration with custom CSS/HTML
- **Concern:** 32K line mPDF library is black box, CSS processing fragile
- **Safe modification:**
  - Test with various will types before changes
  - Use test fixtures for comparison
  - Monitor memory usage during generation

---

*Concerns audit: 2026-02-05*
