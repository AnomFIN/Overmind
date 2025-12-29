# 🚀 Deployment Verification Checklist

Use this checklist to ensure your webhotel deployment is secure and functional.

## Pre-Deployment (On Your Computer)

- [ ] Downloaded repository from GitHub
- [ ] Ran `install.bat` successfully
- [ ] Verified `webhotel_deploy` folder was created
- [ ] All files present in `webhotel_deploy` folder:
  - [ ] `public` folder with HTML/CSS/JS files
  - [ ] `php` folder with backend files
  - [ ] `uploads`, `tmp_uploads`, `data` folders
  - [ ] `index.html` redirect file
  - [ ] `.htaccess` configuration file
  - [ ] `install.php` wizard

## Database Setup

- [ ] Logged into hosting control panel
- [ ] Created MySQL database
- [ ] Created MySQL user
- [ ] Granted user full privileges on database
- [ ] Noted down credentials:
  - Database name: _______________
  - Database user: _______________
  - Database password: _______________

## File Upload

- [ ] Uploaded all files from `webhotel_deploy` to web host
- [ ] Files uploaded to correct directory (`public_html`, `www`, or `htdocs`)
- [ ] Verified all folders exist on server
- [ ] Set folder permissions:
  - [ ] `uploads` - 755 or 777
  - [ ] `tmp_uploads` - 755 or 777
  - [ ] `data` - 755 or 777

## Installation Wizard

- [ ] (Optional) Set `INSTALL_TOKEN` environment variable for enhanced security
- [ ] Opened `http://yourwebsite.com/install.php` in browser (with `?token=` if INSTALL_TOKEN set)
- [ ] **Step 1: System Check** - All green checkmarks ✓
- [ ] **Step 2: Database Configuration** - Entered credentials and tested connection
- [ ] **Step 3: Admin User** - Created admin account
- [ ] **Step 4: Complete** - Saw success message

## Security

- [ ] Deleted `install.php` file from server
- [ ] Logged in with admin credentials
- [ ] Changed admin password in Settings
- [ ] Tested logout and login again
- [ ] Verified session persistence
- [ ] (If INSTALL_TOKEN was used) Removed or changed the environment variable

## Functionality Testing

### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] User logout works
- [ ] Session management working
- [ ] Password requirements enforced

### Link Shortener
- [ ] Can create short links
- [ ] Short links redirect correctly
- [ ] Click counter increments
- [ ] Can delete owned links
- [ ] Expired links return 410 error

### File Uploads
- [ ] Can upload files
- [ ] Files are downloadable
- [ ] Files expire after 15 minutes
- [ ] File size limits enforced
- [ ] Dangerous files blocked (PHP, executables)

### Mind Map
- [ ] Can create nodes
- [ ] Can move nodes
- [ ] Can create edges
- [ ] Can delete nodes and edges
- [ ] Data persists across sessions

### Admin Features
- [ ] Settings page accessible (admin only)
- [ ] Can manage personas
- [ ] Can update app configuration
- [ ] Regular users cannot access admin features

## Optional Configuration

### OpenAI Integration
- [ ] Obtained API key from OpenAI
- [ ] Edited `php/config.php`
- [ ] Added API key to `OPENAI_API_KEY` constant
- [ ] Tested AI chat functionality

### Automatic Cleanup
- [ ] Set up cron job for cleanup script
- [ ] Schedule: `*/15 * * * *` (every 15 minutes)
- [ ] Command: `php /full/path/to/php/cleanup.php`
- [ ] Tested cron job execution

### Custom Domain
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS

## Browser Compatibility Testing

- [ ] Chrome/Edge - All features work
- [ ] Firefox - All features work
- [ ] Safari - All features work
- [ ] Mobile (iOS) - Responsive layout works
- [ ] Mobile (Android) - Responsive layout works

## Security Verification

### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] File upload validation working
- [ ] Rate limiting prevents brute force

### Session Security
- [ ] Sessions expire correctly
- [ ] Cookies are httpOnly
- [ ] Cookies are Secure (if HTTPS)
- [ ] Session hijacking prevented

### Access Control
- [ ] Unauthenticated users cannot access protected endpoints
- [ ] Regular users cannot access admin endpoints
- [ ] Users can only delete their own content
- [ ] Database credentials not exposed

## Performance Testing

- [ ] Page load time < 2 seconds
- [ ] File upload works for large files (up to limit)
- [ ] Database queries are fast
- [ ] No PHP errors in logs
- [ ] No JavaScript errors in console

## Documentation

- [ ] Read README.md thoroughly
- [ ] Read WEBHOTEL_QUICK_START.md
- [ ] Bookmarked admin login URL
- [ ] Saved database credentials securely
- [ ] Documented any custom configurations

## Backup and Maintenance

- [ ] Set up regular database backups
- [ ] Set up regular file backups
- [ ] Documented restore procedure
- [ ] Scheduled periodic security updates
- [ ] Monitoring for disk space usage

## Common Issues Resolved

- [ ] `.htaccess` file is present and correct
- [ ] PHP version is 7.4 or higher
- [ ] All required PHP extensions enabled
- [ ] Folder permissions are correct
- [ ] Database connection works
- [ ] mod_rewrite enabled (Apache)

## Final Sign-Off

- [ ] All checklist items completed
- [ ] No errors in PHP error log
- [ ] No errors in browser console
- [ ] All stakeholders notified
- [ ] Support documentation shared with team

**Deployment Date:** _______________

**Deployed By:** _______________

**Website URL:** _______________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## Emergency Rollback Procedure

If something goes wrong:

1. **Restore from backup** (if available)
2. **Delete all uploaded files** from server
3. **Drop database** (if created)
4. **Contact hosting support** for assistance
5. **Review error logs** in hosting control panel
6. **Check GitHub issues** for similar problems

## Support Resources

- **README.md** - Comprehensive documentation
- **WEBHOTEL_QUICK_START.md** - Beginner guide
- **GitHub Issues** - https://github.com/AnomFIN/Overmind/issues
- **Hosting Support** - Contact your web hosting provider
