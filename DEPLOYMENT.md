# 🚀 CulinaryHub Deployment Guide

Deploy CulinaryHub with **free SSL certificates** using cloud hosting.

---

## Option 1: Render.com (Easiest - One Click Deploy)

Render provides free hosting with automatic SSL for both frontend and backend.

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/culinaryhub.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and deploy both services automatically

### Step 3: Your URLs

After deployment (~5 minutes):
- **Frontend:** `https://culinaryhub.onrender.com` (with SSL ✅)
- **Backend API:** `https://culinaryhub-api.onrender.com` (with SSL ✅)

### Step 4: Custom Domain (culinaryhub.com)

1. In Render dashboard, go to your service → **Settings** → **Custom Domain**
2. Add `culinaryhub.com`
3. Update your DNS:
   ```
   Type: CNAME
   Name: @
   Value: culinaryhub.onrender.com
   ```
4. Render automatically provisions SSL certificate via Let's Encrypt

---

## Option 2: Vercel (Frontend) + Railway (Backend)

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Follow prompts, then:
vercel --prod
```

Your frontend will be at: `https://culinaryhub.vercel.app` (SSL included)

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your repository and choose the `/backend` directory
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   SESSION_SECRET=<generate-secure-key>
   FRONTEND_URL=https://culinaryhub.vercel.app
   ```
5. Railway will auto-deploy with SSL

---

## Option 3: VPS with Let's Encrypt (Full Control)

For complete control, deploy on a VPS (DigitalOcean, Linode, AWS EC2).

### Step 1: Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx
```

### Step 2: Clone and Build

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/culinaryhub.git
cd culinaryhub

# Install and build backend
cd backend
npm install
npm run build

# Install and build frontend
cd ../frontend
npm install
npm run build
```

### Step 3: Configure Nginx

Create `/etc/nginx/sites-available/culinaryhub`:

```nginx
# Frontend - culinaryhub.com
server {
    listen 80;
    server_name culinaryhub.com www.culinaryhub.com;
    
    root /var/www/culinaryhub/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API - api.culinaryhub.com
server {
    listen 80;
    server_name api.culinaryhub.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/culinaryhub /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 4: SSL with Let's Encrypt

```bash
# Get SSL certificates (free, auto-renews)
certbot --nginx -d culinaryhub.com -d www.culinaryhub.com -d api.culinaryhub.com

# Certbot will:
# 1. Obtain SSL certificates
# 2. Configure Nginx for HTTPS
# 3. Set up auto-renewal
```

### Step 5: Run Backend with PM2

```bash
# Install PM2 (process manager)
npm install -g pm2

# Start backend
cd /var/www/culinaryhub/backend
pm2 start dist/server.js --name culinaryhub-api

# Save and enable on boot
pm2 save
pm2 startup
```

### Step 6: DNS Configuration

In your domain registrar (GoDaddy, Namecheap, etc.):

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_SERVER_IP |
| A | www | YOUR_SERVER_IP |
| A | api | YOUR_SERVER_IP |

---

## Environment Variables Reference

### Backend Production (.env)

```env
NODE_ENV=production
PORT=4000
SESSION_SECRET=your-64-character-random-string
FRONTEND_URL=https://culinaryhub.com
DATABASE_PATH=./data/database.sqlite
```

Generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Production

Set during build or in hosting dashboard:
```env
VITE_API_BASE_URL=https://api.culinaryhub.com
```

---

## SSL Certificate Details

All options above use **Let's Encrypt** certificates:

| Feature | Details |
|---------|---------|
| **Cost** | Free |
| **Validity** | 90 days (auto-renews) |
| **Encryption** | TLS 1.2/1.3 |
| **Certificate Type** | Domain Validated (DV) |

---

## Post-Deployment Checklist

- [ ] Test all authentication flows (register, login, logout)
- [ ] Verify HTTPS is working (check padlock icon)
- [ ] Test file uploads
- [ ] Check admin panel functionality
- [ ] Verify CORS is working (no errors in console)
- [ ] Test OTP verification
- [ ] Check security logs are being written
- [ ] Run `npm run seed` on production to create admin user

---

## Troubleshooting

### CORS Errors
Update `FRONTEND_URL` in backend environment to match your actual frontend URL.

### SSL Not Working
```bash
# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal
```

### Backend Not Starting
```bash
# Check PM2 logs
pm2 logs culinaryhub-api

# Check if port is in use
lsof -i :4000
```

### Database Issues
```bash
# Ensure data directory exists and is writable
mkdir -p data
chmod 755 data
```

---

## Cost Summary

| Option | Frontend | Backend | SSL | Total/Month |
|--------|----------|---------|-----|-------------|
| Render | Free | Free | Free | **$0** |
| Vercel + Railway | Free | $5 credit | Free | **$0** |
| VPS (DigitalOcean) | $4 | Included | Free | **$4** |

---

🎉 **Your CulinaryHub is now live with HTTPS!**

