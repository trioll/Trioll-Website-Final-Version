# TRIOLL Portal - Deployment Checklist

## Pre-Deployment Checklist

### Code Review
- [ ] Verify Google Sheets webhook URL is correct
- [ ] Confirm platform password is set (line 1298 in main.js)
- [ ] Check all console.log statements are removed/commented
- [ ] Verify error handling for failed form submissions

### Asset Verification
- [ ] All images load from GitHub URLs (not local)
- [ ] CDN links are using production versions (not development)
- [ ] Font files load correctly from Three.js CDN

### Testing
- [ ] Test full scroll experience in Chrome
- [ ] Test full scroll experience in Safari
- [ ] Test full scroll experience in Firefox
- [ ] Verify mobile responsiveness
- [ ] Test form submission to Google Sheets
- [ ] Test password modal functionality
- [ ] Test email link (mailto:info@trioll.com)

### Performance
- [ ] Check loading time < 3 seconds
- [ ] Verify smooth 60fps animation
- [ ] Test on lower-end devices

### Security
- [ ] HTTPS enabled on server
- [ ] CORS headers configured if needed
- [ ] No sensitive data in source code

## Deployment Steps

1. **Prepare Files**
   ```bash
   # Files to deploy:
   - index.html
   - main.js
   - styles.css
   - package.json
   - package-lock.json
   - README.md
   - PORTAL_WIREFRAME_DOCUMENTATION.md
   - DEPLOYMENT_CHECKLIST.md
   - .gitignore
   ```

2. **Server Configuration**
   - Enable gzip compression
   - Set cache headers for static assets
   - Configure HTTPS certificate

3. **Upload Files**
   - Use FTP/SFTP or Git deployment
   - Exclude `node_modules/` and `archive/`

4. **Post-Deployment Testing**
   - [ ] Website loads correctly
   - [ ] 3D experience works
   - [ ] Form submissions work
   - [ ] All links functional

## Rollback Plan
Keep previous version backed up for quick rollback if issues arise.

## Monitoring
- Set up uptime monitoring
- Monitor form submission success rate
- Track page load times

---
Deployment Date: ___________
Deployed By: ___________
Version: 1.0.0