# Kiosk Mode

Running Houdini Clock in kiosk mode ensures the browser is borderless, full-screen, and tamper-resistant—ideal for escape room displays.

## Launching Chromium in Kiosk Mode

To start Chromium or Google Chrome in kiosk mode, use:

```bash
chromium-browser --kiosk http://your-clock-url
# or
google-chrome --kiosk http://your-clock-url
```

This will:
- Remove all window borders, tabs, and address bar
- Prevent users from closing or minimizing the window with the mouse
- Start the browser directly on your clock interface

### Additional Useful Flags

- `--incognito` — Launches in private mode
- `--noerrdialogs` — Suppresses error dialogs
- `--disable-translate` — Disables translation prompts
- `--disable-infobars` — Hides “Chrome is being controlled” bar
- `--start-fullscreen` — Starts in fullscreen (not true kiosk; borders remain)

Example with multiple flags:

```bash
chromium-browser --kiosk --incognito --noerrdialogs --disable-translate --disable-infobars http://your-clock-url
```

### Exiting Kiosk Mode

- Press `Alt+F4` or `Ctrl+W` to close the window (keyboard required)
- On some systems, you may need to switch to a different virtual terminal or use a remote admin tool

### App Mode (Minimal Chrome)

Alternatively, you can use app mode for a minimal window:

```bash
chromium-browser --app=http://your-clock-url
```

This removes most chrome but leaves a window border and close button.

### Detection Caveats

There is no standard way for a web page to reliably detect true kiosk mode. The app uses best-effort heuristics, but for critical use, set a custom flag (e.g., `navigator.kiosk = true`) via your launch script if possible.

For more, see: [Chromium Kiosk Mode Documentation](https://www.chromium.org/developers/how-tos/kiosk-mode/)
# Deployment Guide

This guide covers deployment strategies and configurations for the Houdini Clock application.

## 🚀 Deployment Options

### 1. Static Hosting (Recommended)

The Houdini Clock is a React SPA that builds to static files, making it ideal for static hosting platforms.

#### Netlify Deployment

```bash
# Build the application
npm run build

# Deploy to Netlify (one-time setup)
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod --dir=build
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  publish = "build"
  command = "npm run build"

[build.environment]
  REACT_APP_MQTT_HOST = "your-mqtt-broker.com"
  REACT_APP_MQTT_PORT = "8883"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "env": {
    "REACT_APP_MQTT_HOST": "your-mqtt-broker.com",
    "REACT_APP_MQTT_PORT": "8883"
  }
}
```

#### GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts
{
  "homepage": "https://yourusername.github.io/houdiniclock",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}

# Deploy
npm run deploy
```

<!-- Docker deployment section removed: Docker support was removed on 2025-08-14. -->

### 3. Node.js Server Deployment

For environments requiring a Node.js server:

#### Express Server Setup

```javascript
// server.js
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

#### PM2 Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [{
    name: 'houdini-clock',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      REACT_APP_MQTT_HOST: 'localhost',
      REACT_APP_MQTT_PORT: '1883'
    }
  }]
};
```

## ⚙️ Environment Configuration

### Production Environment Variables

Create a `.env.production` file:

```bash
# MQTT Configuration
REACT_APP_MQTT_HOST=production-mqtt-broker.com
REACT_APP_MQTT_PORT=8883
REACT_APP_MQTT_TOPIC=Paradox/Houdini/Mirror/Clock/Commands

# Application Settings
REACT_APP_VERSION=1.0.1
REACT_APP_ENVIRONMENT=production

# Build Optimization
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| MQTT Host | localhost | production-broker.com |
| MQTT Port | 1884 | 8883 (SSL) |
| Source Maps | true | false |
| Debug Mode | true | false |
| Hot Reload | true | false |

## 🔒 Security Considerations

### MQTT Security

1. **Use TLS/SSL**:
   ```bash
   # Production MQTT with SSL
   REACT_APP_MQTT_PORT=8883
   REACT_APP_MQTT_SSL=true
   ```

2. **Authentication**:
   ```javascript
   // Add to MQTT.js if needed
   const connectOptions = {
     userName: process.env.REACT_APP_MQTT_USER,
     password: process.env.REACT_APP_MQTT_PASS,
     useSSL: process.env.REACT_APP_MQTT_SSL === 'true'
   };
   ```

3. **Network Security**:
   - Restrict MQTT broker access to known IPs
   - Use VPN for escape room network
   - Enable firewall rules

### Web Application Security

1. **Content Security Policy** (add to `public/index.html`):
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; 
                  connect-src 'self' ws://localhost:* wss://*.yourdomain.com;
                  style-src 'self' 'unsafe-inline';">
   ```

2. **HTTPS Configuration**:
   ```nginx
   server {
       listen 443 ssl http2;
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   }
   ```

## 📊 Monitoring & Analytics

### Health Checks

Create `public/health.json`:
```json
{
  "status": "healthy",
  "version": "1.0.1",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Performance Monitoring

```javascript
// Add to index.js for performance tracking
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

### Error Tracking

```javascript
// Add error boundary for production
window.addEventListener('error', (event) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    console.error('Global error:', event.error);
  }
});
```

## 🔧 Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
   ```bash
   # Clear caches and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **MQTT Connection Issues**:
   ```bash
   # Test MQTT connectivity
   curl -v ws://your-mqtt-broker.com:9001
   
   # Check browser console for WebSocket errors
   ```

3. **Static File 404s**:
   - Verify `homepage` in `package.json`
   - Check web server configuration for SPA routing
   - Ensure build files are in correct directory

4. **Environment Variables Not Loading**:
   ```bash
   # Verify environment variables are set
   echo $REACT_APP_MQTT_HOST
   
   # Check build output includes variables
   grep -r "REACT_APP" build/
   ```

### Performance Issues

1. **Slow Loading**:
   - Enable gzip compression
   - Optimize image assets
   - Use CDN for static files

2. **Memory Leaks**:
   - Check for proper cleanup in `useEffect`
   - Monitor MQTT connection management
   - Use browser memory profiler

### Network Diagnostics

```bash
# Test MQTT broker connectivity
telnet mqtt-broker.com 1883

# WebSocket test
wscat -c ws://mqtt-broker.com:9001

# SSL certificate check
openssl s_client -connect mqtt-broker.com:8883
```

## 📈 Scaling Considerations

### Load Balancing

For multiple escape rooms:

```nginx
upstream houdini_backend {
    server room1.yourdomain.com;
    server room2.yourdomain.com;
    server room3.yourdomain.com;
}

server {
    location / {
        proxy_pass http://houdini_backend;
    }
}
```

### CDN Configuration

```javascript
// webpack.config.js (if ejected)
module.exports = {
  output: {
    publicPath: process.env.NODE_ENV === 'production' 
      ? 'https://cdn.yourdomain.com/' 
      : '/'
  }
};
```

## 🚦 Deployment Checklist

### Pre-deployment

- [ ] All tests pass (`npm test`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Environment variables configured
- [ ] MQTT broker accessible
- [ ] SSL certificates valid (if using HTTPS)
- [ ] Performance testing completed

### Post-deployment

- [ ] Health check endpoint responding
- [ ] MQTT connection working
- [ ] Clock countdown functioning
- [ ] Hint system operational
- [ ] Fade effects working
- [ ] No console errors
- [ ] Mobile responsiveness verified

### Monitoring Setup

- [ ] Error tracking configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring setup
- [ ] Log aggregation configured
- [ ] Backup procedures tested

## 📞 Support

### Deployment Issues

1. Check the [troubleshooting section](#🔧-troubleshooting)
2. Review server logs and browser console
3. Verify environment configuration
4. Test MQTT connectivity separately

### Performance Problems

1. Run build analysis: `npm run build:analyze`
2. Check network tab in browser dev tools
3. Monitor MQTT message frequency
4. Review component re-render patterns

---

**Last Updated**: 2025  
**Version Compatibility**: 1.0.1+  
**Node.js Requirements**: 16+
