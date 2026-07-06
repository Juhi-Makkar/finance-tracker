# Email Verification & User Authentication - Implementation Guide

## Overview

This implementation adds **email verification** and **secure user authentication** to your FinTrack application. Users must verify their email address before they can access the dashboard.

---

## Key Features Implemented

✅ **Email Verification on Signup**
- New users receive a verification email with a unique link
- Email verification tokens expire after 24 hours
- Users can resend verification emails if not received
- Cannot login until email is verified

✅ **Secure Authentication**
- JWT token-based authentication (30-day expiry)
- Password hashing with bcryptjs
- Protected routes require email verification
- Last login tracking

✅ **Password Reset via OTP**
- Users can reset forgotten passwords
- OTP sent via email (10-minute expiry)
- Two-step verification process

✅ **Email Notifications**
- Welcome email with verification link
- Password reset OTP email
- HTML formatted emails for better readability

---

## Architecture

### Backend Components

#### 1. **User Model** (`backend/models/User.js`)
New fields added:
- `isEmailVerified` (Boolean) - Tracks if email is verified
- `emailVerificationToken` (String) - Unique verification token
- `emailVerificationExpiry` (Date) - Token expiration time

#### 2. **Auth Controller** (`backend/controllers/authController.js`)
New functions:
- `verifyEmail()` - Verifies email with token
- `resendVerificationEmail()` - Resends verification email
- `sendVerificationEmail()` - Sends verification email (helper)
- Updated `register()` - Now sends verification email instead of immediate login
- Updated `login()` - Checks email verification status

#### 3. **Auth Middleware** (`backend/middleware/authMiddleware.js`)
- Updated `protect()` middleware to check `isEmailVerified` before accessing protected routes

#### 4. **Auth Routes** (`backend/routes/authRoutes.js`)
New endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

### Frontend Components

#### 1. **Auth Handler** (`frontend/js/auth.js`)
JavaScript utilities for:
- `handleSignup()` - User registration
- `handleLogin()` - User login with email verification check
- `handleVerifyEmail()` - Email verification
- `handleResendVerification()` - Resend verification email
- `handleForgotPassword()` - Password reset request
- `handleVerifyOTP()` - OTP verification
- `handleResetPassword()` - Password reset
- Helper functions for UI (showError, showSuccess, setLoading, etc.)

#### 2. **Signup Page** (`frontend/pages/signup.html`)
- Account creation form
- Password strength indicator
- Currency selection
- Redirects to email verification page after signup

#### 3. **Login Page** (`frontend/pages/login.html`)
- Email & password login
- Email verification check
- Redirects to verify-email page if needed
- Admin user redirect to admin.html

#### 4. **Email Verification Page** (`frontend/pages/verify-email.html`)
- Displays verification status
- Shows user's email address
- Option to resend verification email
- Auto-verifies if token is present in URL
- Redirects to login after successful verification

---

## API Flow Diagrams

### User Registration & Email Verification Flow

```
1. User fills signup form
   ↓
2. POST /api/auth/register
   ↓
3. Backend creates user with:
   - Password hashed
   - isEmailVerified = false
   - emailVerificationToken = random
   - emailVerificationExpiry = now + 24h
   ↓
4. Sends verification email with link:
   https://localhost:3000/verify-email?token=XXX
   ↓
5. Frontend redirects to verify-email.html?email=user@email.com
   ↓
6. User clicks verification link in email
   ↓
7. POST /api/auth/verify-email { token }
   ↓
8. Backend validates token & marks isEmailVerified = true
   ↓
9. User redirected to login page
   ↓
10. User can now login
```

### Login Flow (with Email Verification Check)

```
1. User enters email & password
   ↓
2. POST /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Checks if isEmailVerified = true
   ├─ If false: Return 403 { requiresVerification: true }
   │  → Frontend redirects to verify-email.html
   │
   └─ If true: Return 200 with JWT token
      → Frontend stores token & user data
      → Redirects to dashboard (or admin.html for admins)
```

### Password Reset Flow

```
1. User clicks "Forgot password?" → forgot-password.html
   ↓
2. POST /api/auth/forgot-password { email }
   ↓
3. Backend generates OTP & sends via email
   ↓
4. User receives OTP in email
   ↓
5. User enters OTP
   ↓
6. POST /api/auth/verify-otp { email, otp }
   ↓
7. Backend verifies OTP (valid for 10 minutes)
   ↓
8. User enters new password
   ↓
9. POST /api/auth/reset-password { email, otp, newPassword }
   ↓
10. Backend validates OTP & resets password
    ↓
11. User redirected to login
```

---

## Environment Variables

Add to `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_secret_key_2026

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Gmail App Password Setup

1. Enable 2-Factor Authentication in Gmail
2. Generate App Password at: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the generated password as `EMAIL_PASS`

---

## Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Update `.env` with your email credentials and frontend URL.

Start the server:
```bash
npm run dev  # or npm start
```

### 2. Frontend Setup

No additional installation needed. Just ensure:
- `frontend/js/auth.js` is properly linked in HTML files
- `API_BASE_URL` in `auth.js` points to your backend URL (default: `http://localhost:5000/api/auth`)
- Frontend is served (can be opened directly or via a local server)

---

## Testing the Implementation

### Test Email Verification

1. **Signup:**
   - Go to `signup.html`
   - Fill in the form and submit
   - Should be redirected to `verify-email.html?email=your@email.com`

2. **Check Email:**
   - Open your email inbox
   - Find the verification email from FinTrack
   - Click the verification link

3. **Verification:**
   - Link should auto-verify and show success
   - Redirected to login page

4. **Login:**
   - Use your email & password to login
   - Should successfully login and redirect to dashboard

### Test Email Resend

1. On `verify-email.html`, click "Resend verification email"
2. Check inbox for new verification email
3. Should have a different token but same link format

### Test Password Reset

1. Go to `login.html` → "Forgot password?"
2. Enter your email
3. Check inbox for OTP
4. Enter OTP on the form
5. Set new password
6. Login with new password

---

## Frontend Integration Checklist

- [x] `signup.html` - Uses auth.js handleSignup()
- [x] `login.html` - Uses auth.js handleLogin()
- [x] `verify-email.html` - New page for email verification
- [x] `forgot-password.html` - For password reset (update if exists)
- [x] All pages should link `auth.js` before local scripts
- [x] Protected pages should check `getToken()` and redirect if missing

### Making Pages Protected

Add this to any page that requires authentication:

```html
<script>
  // Check if user is logged in
  if (!getToken()) {
    window.location.href = 'login.html';
  }
  
  // Get user info
  const user = getStoredUser();
  console.log('Logged in as:', user.firstName, user.lastName);
</script>
```

---

## Security Features

✅ **Password Security**
- Passwords hashed with bcryptjs (12 salt rounds)
- Passwords never stored or logged

✅ **Token Security**
- JWT tokens expire after 30 days
- Email verification tokens expire after 24 hours
- OTP tokens expire after 10 minutes

✅ **Email Verification**
- Prevents fake/disposable email registrations
- Ensures user owns the email address
- Can resend if not received

✅ **Protected Routes**
- Middleware checks JWT token validity
- Middleware verifies email before granting access
- Tokens required in Authorization header

---

## Troubleshooting

### Issue: "Email service is not configured"

**Solution:** 
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Ensure Gmail credentials are correct
- If using Gmail, use App Password (not regular password)

### Issue: Verification email not received

**Solutions:**
- Check spam/junk folder
- Verify email address is correct
- Try resending from verify-email.html
- Check backend logs for errors

### Issue: "Invalid or expired verification token"

**Solution:**
- Verification tokens expire after 24 hours
- User needs to resend verification email
- Create new account if token too old

### Issue: Can't login even after email verification

**Solutions:**
- Clear browser cache/localStorage
- Check if user record has `isEmailVerified: true` in MongoDB
- Check JWT_SECRET is same in backend and code
- Verify MongoDB connection in console

### Issue: Frontend can't connect to backend

**Solution:**
- Ensure backend is running on port 5000
- Update `API_BASE_URL` in `auth.js` if port differs
- Check CORS is enabled in backend
- Check browser console for network errors

---

## Best Practices

1. **Never commit `.env` to version control** - Add to `.gitignore`
2. **Use HTTPS in production** - Email links should use https://
3. **Implement rate limiting** - Prevent brute force attacks
4. **Store sensitive data in session, not localStorage** - For production
5. **Log authentication events** - Track login attempts for security
6. **Periodically rotate JWT secret** - Invalidates all existing tokens
7. **Use strong passwords** - Enforce password complexity rules
8. **Monitor email logs** - Track failed/bounced verification emails

---

## Future Enhancements

- 🔐 Social login (Google, GitHub)
- 📱 Two-factor authentication (2FA)
- 🔔 Email notifications for suspicious activity
- 🛡️ CAPTCHA on signup/login
- 📧 Email templates with branding
- 🔄 Refresh token rotation
- 📊 Authentication audit logs
- 🌍 Multi-language email templates

---

## Summary

Your FinTrack application now has:

✅ Secure user registration with email verification
✅ Email verification via link (24-hour tokens)
✅ Protected dashboard access (email verification required)
✅ Secure password reset via OTP (10-minute tokens)
✅ JWT-based authentication (30-day tokens)
✅ User session management
✅ Admin user support with separate redirects

**Start the backend:**
```bash
cd backend && npm run dev
```

**Open frontend:**
- Signup: `frontend/pages/signup.html`
- Login: `frontend/pages/login.html`
- Dashboard: `frontend/pages/dashboard.html` (after login)

---

**Questions?** Check the API responses in browser console for detailed error messages.
