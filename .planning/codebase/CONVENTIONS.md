# Coding Conventions

**Analysis Date:** 2026-02-05

## Naming Patterns

**Files:**
- PHP files: lowercase with hyphens for word separation (e.g., `db-settings.php`, `form-validation.js`)
- Class files: lowercase with "class." prefix (e.g., `class.mail.php`, `class.user.php`)
- Utility/function files: descriptive names in lowercase with underscores or hyphens (e.g., `error_functions.php`, `secure_functions.php`)
- JavaScript files: lowercase with hyphens (e.g., `form-validation.js`, `widget-users.js`)

**Functions:**
- PHP functions: camelCase with leading lowercase (e.g., `formatPhone()`, `isUserLoggedIn()`, `loadUsers()`)
- Getter functions: prefix "fetch" or "get" (e.g., `fetchUser()`, `getLanguageFiles()`, `getUserDisplayName()`)
- Checker functions: prefix "is", "check", or "exists" (e.g., `isUserLoggedIn()`, `userIdExists()`, `checkRequestMode()`)
- Setter/creation functions: prefix "create", "add", "set" (e.g., `createUserBackend()`, `addAlert()`)
- JavaScript functions: camelCase (e.g., `userTable()`, `userForm()`, `updateUserEnabledStatus()`)

**Variables:**
- PHP: camelCase with leading lowercase (e.g., `$user_id`, `$loggedInUser`, `$errorCount`)
- JavaScript: camelCase with leading lowercase (e.g., `box_id`, `user_id`, `pagerOptions`)
- Configuration constants: UPPERCASE_WITH_UNDERSCORES (e.g., `SITE_ROOT`, `LOCAL_ROOT`, `ACCOUNT_ROOT`)
- Global configuration: camelCase (e.g., `$loggedInUser`, `$websiteName`)

**Classes:**
- Class names: PascalCase (e.g., `Validator`, `ErrorException`, `PDOException`)
- Properties: camelCase with leading lowercase
- Methods: camelCase with leading lowercase

## Code Style

**Formatting:**
- PHP indentation: 4 spaces or tabs (mixed usage observed; no strict enforcement detected)
- JavaScript indentation: 4 spaces (inconsistent, with some minified/compact code)
- Brace style: K&R style (opening brace on same line, closing on new line)
  ```php
  if ($condition) {
      // code
  } else {
      // code
  }
  ```
- No detected linter configuration (no .eslintrc, .prettierrc, or phpcs.xml)
- Code formatting is not standardized across the codebase

**Linting:**
- No linting tools detected
- No code style enforcer configured
- Code quality varies across modules

## Import Organization

**PHP Includes:**
- Pattern: Files included at top of scripts using `require_once()`
- Order in `models/config.php`:
  1. Database connection files
  2. Utility functions
  3. Error handling
  4. Template/form functions
  5. Validation libraries
  6. Mail libraries

**Example from `/opt/lampp/htdocs/wdi/models/config.php`:**
```php
require_once("db-settings.php");          // DB connection
require_once("countries.php");            // Data
require_once("funcs.php");                // Utility functions
require_once("error_functions.php");      // Error handling
require_once("template_functions.php");   // Template functions
require_once("password.php");             // Password utilities
require_once("db_functions.php");         // Database queries
require_once("validation/Validator.php"); // Validation
require_once("table_builder.php");        // UI builders
require_once("form_builder.php");         // Form generation
require_once("mail_settings.php");        // Mail configuration
```

**JavaScript Includes:**
- Loaded via HTML script tags in template files
- jQuery library loaded first, then custom widgets, then page-specific logic
- No module system or bundler detected

**Path Aliases:**
- Constant-based paths used:
  - `SITE_ROOT`: Root URL for site
  - `LOCAL_ROOT`: Local filesystem root
  - `ACCOUNT_ROOT`: Account section root
  - `FORMSPATH`: Path to form templates
- Variables used: `$db_table_prefix`, `$db_user_table_prefix` for database table namespacing

## Error Handling

**Patterns:**
- Try-catch blocks with multiple exception types:
  ```php
  try {
      // Database or operation code
  } catch (PDOException $e) {
      addAlert("danger", "Oops, looks like our database encountered an error.");
      error_log("Error in " . $e->getFile() . " on line " . $e->getLine() . ": " . $e->getMessage());
      return false;
  } catch (ErrorException $e) {
      addAlert("danger", "Oops, looks like our server might have goofed.");
      return false;
  } catch (RuntimeException $e) {
      addAlert("danger", "Oops, looks like our server might have goofed.");
      error_log("Error in " . $e->getFile() . " on line " . $e->getLine() . ": " . $e->getMessage());
      return false;
  }
  ```

- Session-based alerts for user-facing errors:
  ```php
  addAlert("danger", "Error message here");        // Error
  addAlert("warning", "Warning message here");     // Warning
  addAlert("success", "Success message here");     // Success
  ```

- Function return patterns:
  - Return `false` on error (common in secured functions)
  - Return data on success
  - Return `null` for missing optional parameters
  - Return boolean flags for status checks

- API error responses (JSON):
  ```php
  echo json_encode(array("errors" => 1, "successes" => 0));   // Error
  echo json_encode(array("errors" => 0, "successes" => 1));   // Success
  ```

- Header redirects for non-AJAX failures:
  ```php
  header('Location: ' . $failure_landing_page);
  exit();
  ```

## Logging

**Framework:** Native PHP error_log() function

**Patterns:**
- Error logging to file specified in PHP configuration
- User-facing alerts stored in `$_SESSION["userAlerts"]` array
- Console/browser alerts displayed via JavaScript widget
- Example logging:
  ```php
  error_log("Error in " . $e->getFile() . " on line " . $e->getLine() . ": " . $e->getMessage());
  ```

- File: `/opt/lampp/htdocs/wdi/errors.log` (configured in `/opt/lampp/htdocs/wdi/models/config.php`)
- Alert display handler: JavaScript function `alertWidget()` reads and displays `$_SESSION["userAlerts"]`

## Comments

**When to Comment:**
- File header with project name, version, and author:
  ```php
  /*
  WillsDB : 0.2 (beta)
  By John Montgomery ( YourDesign.co.za )
  Copyright (c) 2015
  */
  ```

- Function block separators using dashed lines:
  ```php
  /*--------------------------------
   * Formatting Functions
   --------------------------------*/
  ```

- Inline comments for non-obvious logic
- Comments for permission requirements

**Documentation:**
- phpDoc-style blocks for functions (though not consistently applied):
  ```php
  /**
   * Load data for specified user.
   * @param int $user_id the id of the user to load.
   * @return array $results fetch non-authorization related data for the specified user
   */
  function loadUser($user_id) {
  ```

- See `/opt/lampp/htdocs/wdi/models/secure_functions.php` for standard phpDoc usage
- Documentation not enforced across all functions
- TODO comments used sparingly:
  ```php
  // TODO: also use strip_tags()?
  ```

## Function Design

**Size:**
- Generally 20-100 lines per function
- Larger utility functions (100+ lines) consolidate multiple related operations
- Example: `createUserBackend()` in `/opt/lampp/htdocs/wdi/models/secure_functions.php` includes validation, permission checks, and data creation

**Parameters:**
- Functions accept individual parameters rather than objects/arrays
- Optional parameters use default values:
  ```php
  function loadUsers($limit = NULL){
  function ip_info($ip = NULL, $purpose = "location", $deep_detect = TRUE) {
  ```
- Global variables accessed via `global` keyword when needed

**Return Values:**
- Single return type per function (not typed in PHP 5.x style)
- Return boolean false on error/failure
- Return data array/object on success
- Return null for unset optional values
- JavaScript returns jQuery objects or strings depending on purpose

## Module Design

**Exports:**
- PHP modules export functions only (no module system)
- All functions are global scope unless in a class
- Classes encapsulate related functionality (e.g., `Validator` class in `/opt/lampp/htdocs/wdi/models/class_validator.php`)

**Organization:**
- One main responsibility per file
- Database functions consolidated in `/opt/lampp/htdocs/wdi/models/db_functions.php`
- Form-related functions in `/opt/lampp/htdocs/wdi/models/form_builder.php`
- Utility functions in `/opt/lampp/htdocs/wdi/models/funcs.php`
- Security functions in `/opt/lampp/htdocs/wdi/models/secure_functions.php`

**Barrel Files:**
- Not used; no index.php/module exporter pattern detected
- Configuration file (`models/config.php`) acts as central include point that loads all dependencies

---

*Convention analysis: 2026-02-05*
