# 🎯 QUICK START GUIDE - Web Hosting Installation

## For Complete Beginners - Step by Step

This guide will help you install AnomHome Overmind on your web hosting in **under 10 minutes**!

---

## ✅ What You Need

Before starting, make sure you have:

- [ ] A web hosting account (cPanel, Plesk, or similar)
- [ ] Login credentials for your hosting control panel
- [ ] A Windows computer (for running install.bat)
- [ ] An FTP program like FileZilla (optional, but helpful)

---

## 📦 Step 1: Prepare Files on Your Computer

1. **Download the Files**
   - Go to the GitHub repository
   - Click the green "Code" button
   - Click "Download ZIP"
   - Save the ZIP file to your computer

2. **Extract the ZIP File**
   - Right-click the ZIP file
   - Select "Extract All..."
   - Choose a location (like your Desktop)
   - Click "Extract"

3. **Run the Preparation Script**
   - Open the extracted folder
   - Find the file named `install.bat`
   - Double-click it to run
   - Wait for it to finish (it creates a new folder called `webhotel_deploy`)
   - A black window will appear and then close when done

4. **Check the Output**
   - Open the `webhotel_deploy` folder
   - You should see:
     - A `public` folder
     - A `php` folder
     - Other files and folders
   - Read the `UPLOAD_INSTRUCTIONS.txt` file

---

## 🌐 Step 2: Set Up Database

1. **Log into Your Hosting Control Panel**
   - Go to your hosting provider's website
   - Log in with your username and password
   - Find the control panel (usually cPanel or Plesk)

2. **Create a MySQL Database**
   - Look for "MySQL Databases" or "Database Manager"
   - Click on it
   - Create a new database:
     - Database name: `overmind_db` (or any name you like)
     - Click "Create Database"
   - **Write down the database name!**

3. **Create a Database User**
   - Still in MySQL Databases section
   - Scroll down to "MySQL Users"
   - Create a new user:
     - Username: `overmind_user` (or any name you like)
     - Password: Choose a strong password
     - Click "Create User"
   - **Write down the username and password!**

4. **Give User Access to Database**
   - Scroll down to "Add User to Database"
   - Select your user and your database
   - Click "Add"
   - On the next page, check "ALL PRIVILEGES"
   - Click "Make Changes"

---

## 📤 Step 3: Upload Files to Your Web Host

### Option A: Using File Manager (Easier)

1. **Open File Manager**
   - In your control panel, find "File Manager"
   - Click to open it
   - Navigate to your website's root folder (usually `public_html`)

2. **Upload Files**
   - Click "Upload" button
   - Select ALL files from the `webhotel_deploy` folder
   - Wait for upload to complete (may take a few minutes)

3. **Verify Upload**
   - Make sure you see folders: `public`, `php`, `data`, `uploads`, `tmp_uploads`
   - Make sure you see files: `index.html`, `.htaccess`, `install.php`

### Option B: Using FTP (FileZilla)

1. **Download FileZilla**
   - Go to https://filezilla-project.org/
   - Download FileZilla Client (free)
   - Install it on your computer

2. **Connect to Your Server**
   - Open FileZilla
   - Enter your FTP details (from your hosting provider):
     - Host: ftp.yourwebsite.com (or provided by host)
     - Username: Your FTP username
     - Password: Your FTP password
     - Port: 21 (usually)
   - Click "Quickconnect"

3. **Upload Files**
   - On the left side: Navigate to your `webhotel_deploy` folder
   - On the right side: Navigate to `public_html` or your website root
   - Select ALL files on the left
   - Right-click → Upload
   - Wait for transfer to complete

---

## 🔧 Step 4: Set Folder Permissions

1. **Using File Manager or FTP**
   - Find these folders: `uploads`, `tmp_uploads`, `data`
   - For each folder:
     - Right-click the folder
     - Select "Permissions" or "Change Permissions"
     - Check all boxes OR enter `755` or `777`
     - Click "OK" or "Apply"

---

## 🚀 Step 5: Run the Installation Wizard

### Optional: Enhanced Installer Security (Advanced)

For additional security, you can protect the installer with a token:

1. **Set Environment Variable** (before running installer)
   - In cPanel: Go to "PHP Variables" or "Environment Variables"
   - Add variable: `INSTALL_TOKEN` = `your-secret-token-here`
   - Use a long random string (e.g., `a8f4d9c2b7e3f1a9d4c8b2e7f3a1d9c4`)

2. **Access Installer with Token**
   - Go to: `http://yourwebsite.com/install.php?token=your-secret-token-here`
   - Without the correct token, installer will be blocked

**Note:** This is optional. If you don't set INSTALL_TOKEN, the installer works normally.

### Standard Installation

1. **Open Your Browser**
   - Go to: `http://yourwebsite.com/install.php`
   - Replace `yourwebsite.com` with your actual domain
   - If you set INSTALL_TOKEN, add `?token=your-token` to the URL

2. **Step 1: System Check**
   - The installer will check your server
   - All items should have a green checkmark ✓
   - If you see red X marks, contact your hosting support
   - Click "Continue to Database Setup"

3. **Step 2: Enter Database Details**
   - Database Host: `localhost` (in most cases)
   - Database Name: Enter the name you created (e.g., `overmind_db`)
   - Database Username: Enter the username you created
   - Database Password: Enter the password you created
   - Click "Test Connection & Continue"

4. **Step 3: Create Admin Account**
   - Admin Username: Choose a username (e.g., `admin`)
   - Admin Email: Enter your email
   - Admin Password: Choose a STRONG password
   - Confirm Password: Enter the same password again
   - Click "Create Database & Admin User"

5. **Step 4: Installation Complete! 🎉**
   - You'll see a success message
   - **IMPORTANT:** Save your login credentials!
   - Click "Go to Homepage"

---

## 🔒 Step 6: Secure Your Installation

1. **Delete install.php**
   - Go back to File Manager or FTP
   - Find the file `install.php` in your root folder
   - Delete it (very important for security!)

2. **First Login**
   - Go to: `http://yourwebsite.com`
   - You'll be redirected to the login page
   - Enter your admin username and password
   - Click "Login"

3. **Change Your Password**
   - After logging in, click on your username (top right)
   - Go to "Settings"
   - Change your password to something even more secure
   - Click "Save"

---

## ✨ You're Done!

Congratulations! Your AnomHome Overmind dashboard is now live!

### What You Can Do Now:

- ✅ Create short links
- ✅ Upload files (they auto-delete after 15 minutes)
- ✅ Create mind map notes
- ✅ Manage AI personas
- ✅ Customize your dashboard

### Optional: Add OpenAI Chat

If you want to use the AI chat feature:

1. Get an API key from https://platform.openai.com/api-keys
2. In File Manager, edit the file `php/config.php`
3. Find the line: `define('OPENAI_API_KEY', '');`
4. Add your key: `define('OPENAI_API_KEY', 'sk-your-key-here');`
5. Save the file

---

## 🆘 Having Problems?

### Common Issues:

**"Database connection failed"**
- Double-check your database name, username, and password
- Make sure they match exactly what you created in Step 2

**"Permission denied"**
- Check folder permissions (Step 4)
- Make sure `uploads`, `tmp_uploads`, and `data` are writable

**"Internal Server Error"**
- Make sure `.htaccess` file was uploaded
- Check if your PHP version is 7.4 or higher
- Contact your hosting support

**"Can't log in"**
- Make sure you're using the correct username and password
- Check if you have JavaScript enabled in your browser
- Try clearing your browser cache

### Still Need Help?

1. Check the main README.md file for more troubleshooting
2. Contact your web hosting support team
3. Open an issue on GitHub

---

## 📱 Mobile Access

Your dashboard works great on mobile devices!

- Just visit `http://yourwebsite.com` on your phone
- Log in with the same credentials
- Everything is touch-optimized

---

## 🔄 Automatic Cleanup

To automatically clean up expired uploads, set up a cron job:

1. In your control panel, find "Cron Jobs"
2. Add a new cron job:
   - Command: `php /path/to/your/website/php/cleanup.php`
   - Schedule: Every 15 minutes (`*/15 * * * *`)
3. Save

This will automatically delete expired files every 15 minutes.

---

**Enjoy your new personal dashboard! 🎉**
