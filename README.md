# TRIOLL Portal - Production Ready

## 🚀 Production Deployment

This is the production-ready version of the TRIOLL Portal experience.

### Core Files (DO NOT DELETE)
- `index.html` - Main HTML file with all content
- `main.js` - Three.js portal experience and interactions
- `styles.css` - All styling and animations
- `package.json` & `package-lock.json` - NPM dependencies
- `PORTAL_WIREFRAME_DOCUMENTATION.md` - Technical documentation

### External Resources
All images are loaded from GitHub URLs:
- Logo: https://raw.githubusercontent.com/trioll/Trioll/78458b29ad3b63aae3eff39aae462c0ad4cc4d8b/Logo/Trioll_Logo_White.png
- Team images hosted on GitHub

### Features
✅ 3D tunnel experience with GSAP ScrollTrigger
✅ White ripple transition effect
✅ JOIN US form with Google Sheets integration
✅ Password-protected PLATFORM section
✅ Contact email integration
✅ Responsive design
✅ Team section with bios

### Deployment Steps
1. Upload all files (except `archive/` and `node_modules/`)
2. Ensure server has HTTPS enabled
3. Test Google Sheets webhook URL
4. Verify all external CDN links are accessible
5. Set appropriate cache headers for static assets

### Environment Requirements
- Modern browser with WebGL support
- JavaScript enabled
- Internet connection for CDN resources

### Performance Optimizations
- Scroll height reduced to 400vh for faster experience
- Logo glow reduced for better visibility
- Constrained snitch movement for smoother animation
- All images loaded from CDN/GitHub

### Security Notes
- Platform section requires password (set in main.js)
- Form submissions use Google Sheets webhook
- No sensitive data stored locally

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Support
Contact: info@trioll.com

---
Last Updated: August 28, 2025