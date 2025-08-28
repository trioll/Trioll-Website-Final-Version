# TRIOLL Portal - File Structure

## Production Files (Deploy These)

### Core Application
- `index.html` - Main application entry point
- `main.js` - Three.js portal experience and all interactions
- `styles.css` - Complete styling and animations

### Dependencies
- `package.json` - NPM package configuration
- `package-lock.json` - Locked dependency versions

### Documentation
- `README.md` - Production deployment guide
- `PORTAL_WIREFRAME_DOCUMENTATION.md` - Technical specification
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `FILE_STRUCTURE.md` - This file

### Configuration
- `.gitignore` - Git ignore rules

### Assets
- `Trioll_Logo_White.svg` - SVG version of logo (kept for reference)
- All other images loaded from GitHub URLs

## Archived Files (DO NOT DEPLOY)

### `/archive/unused-assets/`
- Various SVG text experiments
- Unused background images
- Old texture files

### `/archive/old-logos/`
- Local copies of logos (now using GitHub URLs)
- Team member images (now using GitHub URLs)
- AI and PSD source files

### `/archive/old-scripts/`
- `snitch.js` - Old snitch implementation
- Poppins font files (now using CDN)

### `/archive/documentation/`
- Development screenshots
- Old documentation

## External Dependencies (CDN)
- Three.js r128
- GSAP 3.12.2
- jQuery 3.6.0
- All loaded from CDN links in index.html

## Important Notes
1. All images now load from GitHub URLs - no local image dependencies
2. Google Sheets webhook URL is hardcoded in main.js
3. Platform password is set in main.js (line 1298)
4. No server-side code required - pure static files

---
Total Production Files: 11 files (excluding node_modules)
Total Size: ~250KB (excluding node_modules)