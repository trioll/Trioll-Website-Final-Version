# File Cleanup Guide - TRIOLL Website

## Current Active Files (Landing Page Version)
- `index.html` - Current landing page with starfield animation
- `mobile-fixes.css` - Mobile responsive fixes
- `css/` directory - Contains various CSS files for different pages
- `js/` directory - Contains JavaScript modules for the platform
- Other HTML files (`games.html`, `profile.html`, etc.) - Platform pages

## Old/Unused Files (Now in old-tunnel-version/)
- `main.js` - Old Three.js tunnel animation code
- `styles.css` - Old tunnel version styles

## Why the Confusion Happened
1. The repository contained files from BOTH versions:
   - The old tunnel animation files (`main.js`, `styles.css`)
   - The new landing page (with inline CSS in `index.html`)

2. When we ran the backup script, it backed up the OLD files thinking they were current

3. The current `index.html` doesn't actually use `main.js` or `styles.css` - it has inline CSS

## Safe to Delete
- `old-tunnel-version/` directory (if you don't need the tunnel code)
- Various `.backup` and `.temp.bak` files
- Old deployment scripts that are no longer needed
- `backups/` directory (now contains incorrect backups)

## Important Files to Keep
- `index.html` - Your current landing page
- `mobile-fixes.css` - Mobile optimizations
- All files in `css/` and `js/` directories
- Platform HTML files (games.html, profile.html, etc.)
- Lambda function files (for backend)

## Recommended Cleanup Commands
```bash
# Remove old backup files
find . -name "*.backup" -o -name "*.temp.bak" | xargs rm -f

# Remove old deployment logs
rm -f deployment_*.log

# Remove old tunnel version (if not needed)
rm -rf old-tunnel-version/

# Remove empty backups directory
rmdir backups/ 2>/dev/null
```