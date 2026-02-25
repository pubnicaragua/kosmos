# Production Deployment Checklist - Kosmos CRM

## ✅ Completed Features & Fixes

### Critical Bug Fixes
- [x] **Global Search TypeError** - Fixed API payload normalization to handle arrays correctly
- [x] **Upload API** - Now accepts all file formats with increased size limit and directory creation
- [x] **Notification Center** - Added fallback audio tone and global event listener
- [x] **Client Import** - Fixed timeout handling with abort controller and progress cleanup
- [x] **Module-level RBAC** - Added `getModuleAccess` helper for granular permissions
- [x] **Tickets API** - Hardened validation with safe parse and null handling
- [x] **Payroll API** - Resilient model handling with warnings and error transparency

### New Features Implemented
- [x] **User Autocomplete Dropdown** - Added to assignedTo fields in:
  - Pipeline Ventas (opportunities)
  - Actividades (activities)
- [x] **Marketing Charts** - Chart.js integration with:
  - Bar, Pie, and Line chart support
  - Interactive visualization in marketing campaign pages
  - Metrics parsing from textarea format
- [x] **Error Logging Button** - Added to sistema/monitor page for production diagnostics
- [x] **Notification Sound** - Placeholder file added (see requirements below)

### Type Safety
- [x] All TypeScript type-checks passing
- [x] Chart.js dependency installed and configured
- [x] No compilation errors

## ⚠️ Pre-Deployment Requirements

### 1. Notification Sound File
**Status**: Empty placeholder exists at `/public/notification-sound.mp3`

**Action Required**: Replace with actual audio file
- Format: MP3
- Recommended: Short notification tone (0.5-2 seconds)
- Fallback: System uses synthesized beep tone if file is missing/invalid

**Options**:
```bash
# Option 1: Use a free notification sound from a service
# Download from: https://notificationsounds.com/ or similar

# Option 2: Generate a simple tone (requires ffmpeg)
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.5" -af "volume=0.3" public/notification-sound.mp3
```

### 2. Environment Variables
Verify all required environment variables are set on production server:
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
```

### 3. Database
```bash
# Run migrations on production
npx prisma migrate deploy

# Verify database connection
npx prisma db pull
```

### 4. Dependencies
```bash
# Install production dependencies
npm ci --production

# Verify chart.js is installed
npm list chart.js
```

### 5. Build
```bash
# Build for production
npm run build

# Verify build output
ls -la .next/
```

## 🚀 Deployment Steps

### On Production Server (Extel - 186.1.56.251:1510)

1. **Pull latest changes**
```bash
cd /path/to/kosmos
git pull origin main
```

2. **Install dependencies**
```bash
npm ci
```

3. **Run database migrations**
```bash
npx prisma migrate deploy
```

4. **Build application**
```bash
npm run build
```

5. **Restart PM2**
```bash
pm2 restart kosmos-crm
# or
pm2 restart all
```

6. **Verify deployment**
```bash
pm2 status
pm2 logs kosmos-crm --lines 50
```

7. **Check application health**
```bash
curl http://localhost:3000/api/health
# or visit https://your-domain.com
```

## 🧪 Post-Deployment Testing

### Critical Flows to Test

1. **Authentication**
   - [ ] Login with valid credentials
   - [ ] Session persistence
   - [ ] Logout

2. **Global Search**
   - [ ] Search for clients
   - [ ] Search for opportunities
   - [ ] Search for products
   - [ ] Verify no TypeError in console

3. **File Upload**
   - [ ] Upload document in Documentos
   - [ ] Upload contract in Contratos
   - [ ] Verify various file formats work

4. **Notifications**
   - [ ] Create a reminder
   - [ ] Verify notification appears
   - [ ] Verify sound plays (or fallback tone)

5. **User Autocomplete**
   - [ ] Create opportunity with assignedTo
   - [ ] Create activity with assignedTo
   - [ ] Verify dropdown shows users
   - [ ] Verify selection works

6. **Marketing Charts**
   - [ ] Open marketing campaign
   - [ ] Verify chart renders
   - [ ] Test different chart types (bar, pie, line)

7. **Error Logging**
   - [ ] Navigate to Sistema > Monitor
   - [ ] Click "Capturar Logs de Errores"
   - [ ] Verify logs are captured

8. **RBAC Permissions**
   - [ ] Test inventory access with custom role
   - [ ] Verify module-level permissions work
   - [ ] Test with USER, MANAGER, ADMIN roles

9. **Client Import**
   - [ ] Import clients from file
   - [ ] Verify timeout handling
   - [ ] Click client name to view details

10. **API Error Handling**
    - [ ] Test tickets creation with invalid data
    - [ ] Test payroll endpoints
    - [ ] Verify proper error messages (no 500s)

## 📊 Monitoring

### Key Metrics to Watch

1. **Performance**
   - Page load times
   - API response times
   - Database query performance

2. **Errors**
   - Check PM2 logs: `pm2 logs kosmos-crm`
   - Monitor error logging in Sistema > Monitor
   - Check browser console for client-side errors

3. **User Activity**
   - Login success rate
   - Feature usage patterns
   - Failed operations

## 🔧 Rollback Plan

If critical issues are found:

```bash
# 1. Stop the application
pm2 stop kosmos-crm

# 2. Revert to previous commit
git log --oneline -10  # Find previous stable commit
git reset --hard <previous-commit-hash>

# 3. Rebuild
npm ci
npm run build

# 4. Restart
pm2 restart kosmos-crm
```

## 📝 Known Limitations

1. **Notification Sound**: Currently empty file - fallback tone will be used until replaced
2. **Chart.js**: First render may be slightly slower due to library initialization
3. **User Autocomplete**: Fetches all users - may need pagination for large teams (>100 users)

## 🎯 Future Enhancements (Post-Production)

- Add real notification sound file
- Implement user autocomplete pagination
- Add more chart types for marketing analytics
- Enhance error logging with stack traces
- Add automated E2E tests with Playwright

## ✅ Sign-Off

- [ ] All type-checks passing
- [ ] All critical features tested locally
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] PM2 configuration verified
- [ ] Rollback plan documented
- [ ] Team notified of deployment

**Deployment Date**: _________________
**Deployed By**: _________________
**Production URL**: _________________
**Status**: _________________
