# Password Reset and Security Features Setup Guide

This guide explains how to implement the password reset email functionality and security settings password update feature.

## Features Implemented

1. **Password Reset Email**: Users can request password reset links via email
2. **Password Reset with Token**: Secure token-based password reset flow
3. **Security Settings**: Users can update their password from settings page

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install nodemailer
```

### 2. Environment Configuration

Copy the `.env.example` file to `.env` and update the email configuration:

```env
# Email Service Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

**Important**: For Gmail, you need to use an "App Password" instead of your regular password:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use this app password in the `EMAIL_PASS` field

### 3. Database Migration

The User model has been updated with password reset fields. If you have existing data, you might need to restart your application to apply the schema changes.

## Files Modified/Created

### Backend Files

1. **`backend/models/User.js`** - Added password reset token fields
2. **`backend/services/emailService.js`** - NEW: Email service for sending reset emails
3. **`backend/routes/auth.js`** - Added forgot-password and reset-password endpoints
4. **`backend/routes/user.js`** - Added update-password endpoint
5. **`backend/package.json`** - Added nodemailer dependency
6. **`backend/.env.example`** - Added email configuration examples

### Frontend Files

1. **`frontend/src/pages/auth/ForgotPasswordPage.jsx`** - Updated with real API integration
2. **`frontend/src/pages/auth/ResetPasswordPage.jsx`** - NEW: Token-based password reset page
3. **`frontend/src/pages/SettingsPage.jsx`** - Added password update functionality
4. **`frontend/src/App.jsx`** - Added new route for reset password page

## API Endpoints

### New Authentication Endpoints

- **POST** `/api/auth/forgot-password`
  - Body: `{ "email": "user@example.com" }`
  - Sends password reset email

- **POST** `/api/auth/reset-password`
  - Body: `{ "token": "reset-token", "newPassword": "newpass123" }`
  - Resets password using token

### New User Endpoints

- **PUT** `/api/user/update-password`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "currentPassword": "oldpass", "newPassword": "newpass123" }`
  - Updates user password

## Testing the Implementation

### 1. Test Password Reset Flow

1. Go to forgot password page: `http://localhost:5173/auth/forgot-password`
2. Enter your email address
3. Check your email for the reset link
4. Click the link to reset your password
5. Enter new password and confirm

### 2. Test Security Settings

1. Login to your account
2. Go to Settings page: `http://localhost:5173/settings`
3. Click on "Security" tab
4. Enter current password and new password
5. Click "Update Password"

## Security Features

1. **Token Expiration**: Reset tokens expire after 1 hour
2. **Secure Token Generation**: Uses crypto.randomBytes for token generation
3. **Password Hashing**: Passwords are hashed using bcrypt
4. **Rate Limiting Ready**: Structure supports adding rate limiting
5. **Secure Email Templates**: Professional HTML email templates

## Email Configuration Options

### Gmail Configuration
```javascript
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### Custom SMTP Configuration
```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### SendGrid Configuration
```javascript
const transporter = nodemailer.createTransporter({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

## Error Handling

The implementation includes comprehensive error handling for:

- Invalid email addresses
- Expired reset tokens
- Incorrect current passwords
- Network errors
- Server errors
- Password validation errors

## Production Considerations

1. **Use HTTPS**: Ensure password reset links use HTTPS in production
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Email Service**: Consider using a professional email service like SendGrid
4. **Monitoring**: Add logging and monitoring for password reset attempts
5. **Token Cleanup**: Implement periodic cleanup of expired tokens

## Troubleshooting

### Email Not Sending
- Check your email credentials
- Verify app password for Gmail
- Check firewall/network settings
- Review console logs for errors

### Password Update Not Working
- Verify JWT token is being sent correctly
- Check if user is authenticated
- Verify current password is correct
- Check network requests in browser dev tools

### Reset Token Issues
- Tokens expire after 1 hour
- Tokens are single-use only
- Check if token exists in database
- Verify token format in URL

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test API endpoints using tools like Postman
4. Check database connections and user permissions