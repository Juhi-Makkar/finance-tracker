# Email Verification & Authentication - Quick Start Guide

## What Was Implemented

✅ **Email Verification** - Users must verify their email before accessing the app
✅ **Secure Authentication** - JWT tokens + password hashing
✅ **Password Reset** - OTP-based password recovery
✅ **Protected Routes** - Middleware checks email verification status

---

## Setup (5 minutes)

### 1. Backend Configuration

```bash
cd backend
```

Verify `.env` file has:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_app_password (16-char from Gmail)
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_key
MONGO_URI=your_mongodb_uri
PORT=5000
```

**⚠️ Gmail App Password Setup:**
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password
4. Paste it as `EMAIL_PASS` in `.env`

### 2. Start Backend

```bash
npm run dev
```

Should output: `🚀 Server running on port 5000`

### 3. Frontend Access

Open in browser:
- **Signup**: `frontend/pages/signup.html`
- **Login**: `frontend/pages/login.html`
- **Forgot Password**: `frontend/pages/forgot-password.html`

---

## Testing Workflow

### Test Email Verification Flow

**Step 1: Signup**
1. Open `frontend/pages/signup.html`
2. Fill form with:
   - First Name: John
   - Last Name: Doe
   - Email: your-real-email@gmail.com
   - Password: Test123!
   - Currency: INR
   - Check Terms
3. Click "Create Account"

**Expected Result:**
- ✅ Page redirects to `verify-email.html?email=your@email.com`
- ✅ Shows "Verification link sent to your-email@gmail.com"
- ✅ Email received in inbox with verification link

**Step 2: Verify Email**
1. Check your email inbox
2. Look for "FinTrack Email Verification" email
3. Click the verification link in the email

**Expected Result:**
- ✅ Verification succeeds
- ✅ Redirected to `login.html`

**Step 3: Login**
1. Open `frontend/pages/login.html`
2. Enter:
   - Email: your-email@gmail.com
   - Password: Test123!
3. Click "Login"

**Expected Result:**
- ✅ Successfully logged in
- ✅ Redirected to dashboard (or admin.html if admin)
- ✅ Token stored in localStorage

---

### Test Resend Verification Email

1. Go to `verify-email.html?email=your@email.com`
2. Click "Resend verification email"
3. Enter your email
4. Click "Send Verification Link"

**Expected Result:**
- ✅ New email received
- ✅ Can verify with new link

---

### Test Password Reset

1. Open `frontend/pages/forgot-password.html`
2. Enter your email
3. Click "Send OTP"

**Expected Result:**
- ✅ Email received with 6-digit OTP
- ✅ Page shows OTP input screen

4. Copy OTP from email
5. Enter OTP (6 digits)
6. Click "Verify OTP"

**Expected Result:**
- ✅ OTP verified
- ✅ Page shows "New Password" form

7. Enter new password
8. Confirm password
9. Click "Reset Password"

**Expected Result:**
- ✅ Password changed
- ✅ Shows success message
- ✅ Click "Go to Login" to login with new password

---

## File Structure

```
finance-tracker/
├── backend/
│   ├── .env (configured)
│   ├── .env.example
│   ├── models/User.js (updated with verification fields)
│   ├── controllers/authController.js (email verification functions)
│   ├── middleware/authMiddleware.js (checks email verification)
│   ├── routes/authRoutes.js (new endpoints)
│   └── server.js
│
└── frontend/
    ├── js/
    │   └── auth.js (NEW - all auth functions)
    │
    └── pages/
        ├── signup.html (updated to use auth.js)
        ├── login.html (updated to handle verification check)
        ├── verify-email.html (NEW - email verification page)
        └── forgot-password.html (updated to pass OTP)
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account (requires email verification)
- `POST /api/auth/login` - Login (checks email verification)
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email

### Account Management
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/me` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

### Password Recovery
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password with OTP

---

## Common Issues & Solutions

### ❌ "Email service is not configured"
**Solution:** Check `EMAIL_USER` and `EMAIL_PASS` in `.env`

### ❌ Didn't receive verification email
**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Resend from `verify-email.html`
4. Check backend console for errors

### ❌ "Invalid or expired verification token"
**Solution:** Token expires after 24 hours. Resend verification email.

### ❌ Can't login even after verification
**Solutions:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh page (Ctrl+Shift+R)
3. Check MongoDB: user should have `isEmailVerified: true`

### ❌ Backend not running
**Solution:** 
```bash
cd backend
npm run dev
```
Should show: `🚀 Server running on port 5000`

### ❌ "Cannot connect to server"
**Solution:** 
- Check backend is running
- Update `API_BASE_URL` in `auth.js` if port differs
- Check CORS is enabled in `server.js`

---

## Protecting Pages

To protect any page (require login + email verification):

```html
<script src="../js/auth.js"></script>
<script>
  // Redirect if not logged in
  if (!getToken()) {
    window.location.href = 'login.html';
  }
  
  // Get current user
  const user = getStoredUser();
  console.log('User:', user);
</script>
```

---

## Production Deployment

### Before Deploying:

1. **Update Frontend URL:**
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Use Environment Variables:**
   - Store all secrets in environment variables
   - Never commit `.env` to git

3. **Update API URLs:**
   - Change `http://localhost:5000` to your backend URL in `auth.js`

4. **Enable HTTPS:**
   - Verification email links must use `https://`
   - Update `FRONTEND_URL` accordingly

5. **Database:**
   - Use MongoDB Atlas or production database
   - Verify connection string

6. **Email:**
   - Use production email service (SendGrid, AWS SES, etc.)
   - Don't use personal Gmail credentials

### Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Update API base URL in `auth.js`
- [ ] Test email verification flow on production
- [ ] Monitor email delivery and bounces
- [ ] Set up error logging
- [ ] Enable rate limiting on auth endpoints
- [ ] Setup SSL/HTTPS

---

## Monitoring

### Check Backend Logs
```bash
# Terminal with backend running
# Look for:
# - Email sent confirmations
# - Authentication errors
# - Failed email delivery
```

### Check Browser Console
```javascript
// Open browser DevTools (F12)
// Console tab shows:
// - API errors
// - Token issues
// - Network errors
```

### Database Verification
```javascript
// Check user in MongoDB
db.users.findOne({ email: "test@email.com" })

// Should show:
// {
//   email: "test@email.com",
//   isEmailVerified: true,
//   emailVerificationToken: null,
//   emailVerificationExpiry: null,
//   ...
// }
```

---

## Support

For issues:
1. Check browser console (F12 → Console)
2. Check backend console
3. Verify `.env` configuration
4. Check email inbox (spam folder)
5. Refer to `EMAIL_VERIFICATION_GUIDE.md` for detailed docs

---

## Next Steps

- ✅ Test email verification
- ✅ Test password reset
- ✅ Protect all pages that need login
- ✅ Configure production environment
- ✅ Deploy to production

**Questions?** Check the detailed documentation in `EMAIL_VERIFICATION_GUIDE.md`
