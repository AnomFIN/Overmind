@echo off
REM ============================================================================
REM AnomHome Overmind - Web Hosting Installation Preparation Script
REM This script prepares the files for upload to a PHP/MySQL web hosting
REM ============================================================================

echo.
echo ========================================================================
echo    AnomHome Overmind - Web Hosting Installation Preparation
echo ========================================================================
echo.
echo This script will prepare your files for upload to a web hosting service.
echo.
echo Requirements on your web host:
echo   - PHP 7.4 or higher
echo   - MySQL 5.7 or higher
echo   - At least 100MB disk space
echo   - Support for .htaccess files (Apache) or equivalent
echo.
pause

echo.
echo [Step 1/5] Creating deployment directory...
if not exist "webhotel_deploy" mkdir webhotel_deploy
if not exist "webhotel_deploy\php" mkdir webhotel_deploy\php
if not exist "webhotel_deploy\uploads" mkdir webhotel_deploy\uploads
if not exist "webhotel_deploy\tmp_uploads" mkdir webhotel_deploy\tmp_uploads
if not exist "webhotel_deploy\data" mkdir webhotel_deploy\data
if not exist "webhotel_deploy\public" mkdir webhotel_deploy\public
echo [OK] Deployment directories created

echo.
echo [Step 2/5] Copying public HTML/CSS/JS files...
xcopy /E /I /Y public webhotel_deploy\public >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Could not copy some public files
) else (
    echo [OK] Public files copied
)

echo.
echo [Step 3/5] Copying configuration files...
if exist ".env.example" (
    copy /Y .env.example webhotel_deploy\.env.example >nul 2>&1
    echo [OK] Configuration example copied
) else (
    echo [WARNING] No .env.example found
)

echo.
echo [Step 4/5] Creating database configuration template...
(
echo ^<?php
echo // Database Configuration
echo // EDIT THESE VALUES AFTER UPLOADING TO YOUR SERVER
echo.
echo define^('DB_HOST', 'localhost'^);
echo define^('DB_NAME', 'your_database_name'^);
echo define^('DB_USER', 'your_database_user'^);
echo define^('DB_PASS', 'your_database_password'^);
echo define^('DB_CHARSET', 'utf8mb4'^);
echo.
echo // Application Configuration
echo define^('APP_URL', 'http://yourdomain.com'^);
echo define^('SECRET_KEY', 'CHANGE_THIS_TO_RANDOM_STRING'^);
echo.
echo // Session Configuration
echo define^('SESSION_LIFETIME', 3600 * 24 * 7^); // 7 days
echo.
echo // Upload Configuration
echo define^('MAX_UPLOAD_SIZE', 100 * 1024 * 1024^); // 100MB
echo define^('UPLOAD_TTL', 900^); // 15 minutes
echo.
echo // OpenAI Configuration ^(Optional^)
echo define^('OPENAI_API_KEY', ''^^);
echo ?^>
) > webhotel_deploy\php\config.php.example
echo [OK] Configuration template created

echo.
echo [Step 5/5] Creating installation instructions file...
(
echo UPLOAD INSTRUCTIONS
echo ===================
echo.
echo 1. Upload all files from the 'webhotel_deploy' folder to your web hosting
echo.
echo 2. Rename php/config.php.example to php/config.php
echo.
echo 3. Edit php/config.php with your database credentials
echo.
echo 4. Open your website in a browser and navigate to:
echo    http://yourdomain.com/install.php
echo.
echo 5. Follow the on-screen instructions to complete installation
echo.
echo 6. Delete install.php after successful installation for security
echo.
echo FOLDER PERMISSIONS:
echo -------------------
echo Make sure these folders are writable ^(chmod 755 or 777^):
echo   - /uploads
echo   - /tmp_uploads
echo   - /data
echo.
echo DEFAULT LOGIN:
echo --------------
echo Username: admin
echo Password: admin123
echo.
echo IMPORTANT: Change the default password immediately after first login!
) > webhotel_deploy\UPLOAD_INSTRUCTIONS.txt
echo [OK] Instructions file created

echo.
echo ========================================================================
echo [SUCCESS] Deployment package prepared!
echo ========================================================================
echo.
echo Next steps:
echo   1. Check the 'webhotel_deploy' folder
echo   2. Read UPLOAD_INSTRUCTIONS.txt
echo   3. Upload all files to your web hosting
echo   4. Run install.php from your browser
echo.
echo Note: The PHP backend files will be created during the actual upload.
echo       This script only prepares the structure and static files.
echo.
echo ========================================================================
pause
