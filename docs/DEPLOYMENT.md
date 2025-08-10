# Deployment Guide for Houdini Clock Application

## Overview
This guide covers deploying the Houdini escape room clock application in production environments, including setup, configuration, and operational considerations.

## Environment Requirements

### Hardware Requirements
- **Display**: Large monitor or projector (recommended: portrait orientation)
- **Computer**: Any system capable of running a modern web browser
- **Network**: Stable connection to MQTT broker
- **MQTT Broker**: Mosquitto or similar MQTT broker

### Software Requirements
- **Node.js**: Version 16 or higher
- **Web Browser**: Chrome, Firefox, Safari, or Edge (recent versions)
- **MQTT Broker**: Mosquitto, AWS IoT, or similar

## Pre-Deployment Setup

### 1. MQTT Broker Configuration

#### Install Mosquitto (Linux/macOS)
```bash
# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# macOS with Homebrew
brew install mosquitto

# Start the broker
sudo systemctl start mosquitto
# or
mosquitto -p 1884
```

#### Configure WebSocket Support
Edit `/etc/mosquitto/mosquitto.conf`:
```
# Standard MQTT port
port 1883

# WebSocket port for browser clients
listener 1884
protocol websockets
```

### 2. Application Configuration

#### Environment Variables
Configure MQTT connection in `package.json`:
```json
{
  "scripts": {
    "start": "cross-env REACT_APP_MQTT_HOST=your-broker-host REACT_APP_MQTT_PORT=1884 react-scripts start",
    "build": "cross-env REACT_APP_MQTT_HOST=your-broker-host REACT_APP_MQTT_PORT=1884 react-scripts build"
  }
}
```

#### Production Environment Variables
```bash
export REACT_APP_MQTT_HOST=production-broker.example.com
export REACT_APP_MQTT_PORT=1884
```

## Deployment Methods

### Method 1: Static Hosting (Recommended)

#### Build for Production
```bash
# Install dependencies
npm install

# Create production build
npm run build
```

#### Deploy to Web Server
```bash
# Copy build files to web server
scp -r build/* user@server:/var/www/houdini-clock/

# Or use rsync
rsync -av build/ user@server:/var/www/houdini-clock/
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name houdini-clock.example.com;
    root /var/www/houdini-clock;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Method 2: Development Server (Testing Only)

#### Local Development
```bash
npm start
```
**Note**: Only for testing - not recommended for production use.

### Method 3: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Commands
```bash
# Build image
docker build -t houdini-clock .

# Run container
docker run -d -p 80:80 --name houdini-clock houdini-clock
```

## Network Configuration

### Firewall Settings
```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp

# Allow MQTT WebSocket port
sudo ufw allow 1884/tcp

# Allow standard MQTT port (if needed)
sudo ufw allow 1883/tcp
```

### Security Considerations

#### MQTT Security
```bash
# Create MQTT user accounts
sudo mosquitto_passwd -c /etc/mosquitto/passwd gamemaster
sudo mosquitto_passwd /etc/mosquitto/passwd clockcontrol
```

#### SSL/HTTPS Setup
```bash
# Get SSL certificate (Let's Encrypt)
sudo certbot --nginx -d houdini-clock.example.com
```

## Production Checklist

### Pre-Deployment
- [ ] MQTT broker is running and accessible
- [ ] Environment variables are correctly configured
- [ ] Production build completes without errors
- [ ] All static assets are included in build
- [ ] Network connectivity is verified

### Deployment
- [ ] Application files deployed to web server
- [ ] Web server configuration is correct
- [ ] DNS records point to correct server
- [ ] SSL certificate is installed and valid
- [ ] Firewall rules allow necessary traffic

### Post-Deployment
- [ ] Application loads in web browser
- [ ] MQTT connection establishes successfully
- [ ] All commands work from control system
- [ ] Display orientation and scaling are correct
- [ ] Performance is acceptable on target hardware

## Operational Procedures

### Starting the System

1. **Start MQTT Broker**
   ```bash
   sudo systemctl start mosquitto
   ```

2. **Verify Web Server**
   ```bash
   sudo systemctl status nginx
   ```

3. **Open Application**
   - Navigate to application URL in web browser
   - Verify MQTT connection in browser console
   - Test with a simple command

### Monitoring

#### Log Locations
- **MQTT Broker**: `/var/log/mosquitto/mosquitto.log`
- **Web Server**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **Browser Console**: Developer tools in browser

#### Health Checks
```bash
# Check MQTT broker
mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "test message"

# Check web server
curl -I http://houdini-clock.example.com

# Check WebSocket MQTT
wscat -c ws://localhost:1884
```

### Troubleshooting

#### Common Issues

**MQTT Connection Failed**
- Verify broker is running: `sudo systemctl status mosquitto`
- Check firewall: `sudo ufw status`
- Test connection: `mosquitto_pub -h HOST -p PORT -t "test" -m "test"`

**Application Won't Load**
- Check web server status: `sudo systemctl status nginx`
- Verify file permissions: `ls -la /var/www/houdini-clock/`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Commands Not Working**
- Open browser developer console
- Check for JavaScript errors
- Verify MQTT topic name exactly matches
- Test JSON format validity

### Backup and Recovery

#### Backup Procedures
```bash
# Backup application files
tar -czf houdini-clock-backup-$(date +%Y%m%d).tar.gz /var/www/houdini-clock/

# Backup MQTT configuration
cp /etc/mosquitto/mosquitto.conf /backup/mosquitto-config-$(date +%Y%m%d).conf
```

#### Recovery Procedures
```bash
# Restore application files
tar -xzf houdini-clock-backup-YYYYMMDD.tar.gz -C /

# Restart services
sudo systemctl restart nginx
sudo systemctl restart mosquitto
```

## Performance Optimization

### Web Server Optimization
- Enable gzip compression
- Set appropriate cache headers
- Use CDN for static assets if needed
- Optimize image assets

### Network Optimization
- Use local MQTT broker when possible
- Configure appropriate MQTT keep-alive settings
- Monitor network latency and reliability

### Browser Optimization
- Use fullscreen mode for kiosk deployment
- Disable browser auto-updates in production
- Set up automatic browser restart if needed
