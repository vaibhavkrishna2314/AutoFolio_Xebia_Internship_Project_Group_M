# Gmail App Password Setup Guide

## Current Issue
Your `.env` file shows:
```env
EMAIL_USER=vkrishna2314@gmail.com
EMAIL_PASS=8002434067
```

**This won't work** because Gmail requires App Passwords for SMTP authentication.

## Solution: Generate Gmail App Password

### Step 1: Enable 2-Factor Authentication
1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the steps to enable 2FA (if not already enabled)

### Step 2: Generate App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. Select app: **Mail**
4. Select device: **Other (custom name)**
5. Enter name: **AutoFolio Password Reset**
6. Click **Generate**
7. **Copy the 16-character password** (like: `abcd efgh ijkl mnop`)

### Step 3: Update Your .env File
Replace your current email configuration with:

```env
MONGO_URI=mongodb+srv://db3289:dbconnect9832@cluster0.riwci3q.mongodb.net/Autofolio-Project
JWT_SECRET=your_jwt_secret
PORT=5001

# Payment Configuration
RAZORPAY_KEY_ID=rzp_test_p18grnmQpZzvPc
RAZORPAY_KEY_SECRET=qWNyTakqOBHq6WKoEpkE2yuA
RZP_WEBHOOK_SECRET=mytestsecret123

# API Keys
RESUME_PARSER=aff_a0e21b41334919716f38f2bb4a6ebb6c0bba42a7
cohere_API_KEY=5N1Z3izQhdVN9MKrhNmIgnOXqPqpYLdh5BGSEiVo

# Email Service Configuration (for password reset)
EMAIL_USER=vkrishna2314@gmail.com
EMAIL_PASS=your-16-character-app-password-here
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

## Alternative Email Services

If you have trouble with Gmail, consider these alternatives:

### Option 1: SendGrid (Recommended for Production)
```env
# Using SendGrid
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

### Option 2: Outlook/Hotmail
```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-outlook-password
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
FRONTEND_URL=http://localhost:5173
```

### Option 3: Custom SMTP
```env
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-email-password
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
FRONTEND_URL=http://localhost:5173
```

## Testing Your Email Configuration

### 1. Install Dependencies
```bash
cd backend
npm install nodemailer
```

### 2. Test Email Service
Create a test file `backend/test-email.js`:

```javascript
require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/emailService');

async function testEmail() {
  try {
    await sendPasswordResetEmail('your-test-email@gmail.com', 'test-token-123');
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
}

testEmail();
```

Run the test:
```bash
node test-email.js
```

## Troubleshooting

### Error: "Invalid login"
- ✅ Make sure you're using App Password, not regular password
- ✅ Verify 2FA is enabled on your Google account
- ✅ Check the App Password is copied correctly (16 characters)

### Error: "Connection timeout"
- ✅ Check your internet connection
- ✅ Verify firewall isn't blocking SMTP (port 587/465)
- ✅ Try different email service

### Error: "Authentication failed"
- ✅ Double-check your email address
- ✅ Regenerate App Password
- ✅ Make sure there are no extra spaces in .env file

## Security Best Practices

1. **Never share .env files** publicly
2. **Use environment-specific .env files** (.env.development, .env.production)
3. **Add .env to .gitignore**
4. **Rotate API keys** regularly
5. **Use App Passwords** instead of regular passwords
6. **Consider professional email services** for production

## Next Steps

1. **Generate Gmail App Password** following steps above
2. **Update your .env file** with the App Password
3. **Test the email functionality** using the test script
4. **Restart your backend server**
5. **Test password reset flow** in your application

## Support

If you continue having issues:
1. Check the server console for error messages
2. Verify all environment variables are loaded correctly
3. Test with a simple nodemailer script first
4. Consider using a different email service temporarily