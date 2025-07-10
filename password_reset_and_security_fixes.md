# Password Reset and Security Settings Issues - Fix Documentation

## Issues Identified

### 1. Password Reset Email Not Sent
**Problem**: The forgot password functionality is only simulated on the frontend and has no backend implementation.

**Current State**:
- Frontend (`ForgotPasswordPage.jsx`) has a simulated API call (line 23)
- No backend endpoint for password reset exists in `backend/routes/auth.js`
- No email service configuration or dependencies installed
- User model lacks password reset token fields

### 2. Security Settings Password Update Not Working
**Problem**: The password update form in settings has no backend implementation.

**Current State**:
- Frontend (`SettingsPage.jsx`) has password form fields but no API integration
- No backend endpoint for password updates
- No password validation or update logic

---

## Required Changes

### Backend Changes

#### 1. Install Email Service Dependencies
**File**: `backend/package.json`
**Action**: Add email service dependency
```json
{
  "dependencies": {
    // ... existing dependencies
    "nodemailer": "^6.9.0"
  }
}
```

#### 2. Update User Model
**File**: `backend/models/User.js`
**Action**: Add password reset fields
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Add password reset fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  subscription: subscriptionSchema
});
```

#### 3. Create Email Service
**File**: `backend/services/emailService.js` (NEW FILE)
**Action**: Create email service utility
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your preferred service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h3>Password Reset Request</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
```

#### 4. Add Password Reset Routes
**File**: `backend/routes/auth.js`
**Action**: Add new routes for password reset functionality
```javascript
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// Add these routes to the existing auth.js file:

// 🔄 FORGOT PASSWORD ROUTE
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return res.status(200).json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // Send email
    await sendPasswordResetEmail(email, resetToken);
    
    res.status(200).json({ 
      message: 'If an account with that email exists, we have sent a password reset link.' 
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔄 RESET PASSWORD ROUTE
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

#### 5. Add Password Update Route
**File**: `backend/routes/user.js`
**Action**: Add password update endpoint
```javascript
const bcrypt = require('bcryptjs');

// Add this route to the existing user.js file:

// 🔐 UPDATE PASSWORD ROUTE
router.put('/update-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update to new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

### Frontend Changes

#### 6. Update Forgot Password Page
**File**: `frontend/src/pages/auth/ForgotPasswordPage.jsx`
**Action**: Replace simulated API call with real API call
```javascript
// Replace the handleSubmit function (lines 18-30):
const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      setSent(true)
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions.",
      })
    } else {
      toast({
        title: "Error",
        description: data.error || "Failed to send reset link",
        variant: "destructive",
      })
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Network error. Please try again.",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}
```

#### 7. Create Reset Password Page
**File**: `frontend/src/pages/auth/ResetPasswordPage.jsx` (NEW FILE)
**Action**: Create new page for password reset with token
```javascript
"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { useToast } from "../../hooks/use-toast"
import { Zap } from "lucide-react"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      navigate('/auth/forgot-password')
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        })
        navigate('/auth/login')
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">AutoFolio</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

#### 8. Update Settings Page Security Tab
**File**: `frontend/src/pages/SettingsPage.jsx`
**Action**: Add state management and API call for password update
```javascript
// Add these state variables (around line 23):
const [passwordData, setPasswordData] = useState({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
})
const [passwordLoading, setPasswordLoading] = useState(false)

// Add this function for password update:
const handlePasswordUpdate = async () => {
  if (passwordData.newPassword !== passwordData.confirmPassword) {
    toast({
      title: "Error",
      description: "New passwords do not match",
      variant: "destructive",
    })
    return
  }

  if (passwordData.newPassword.length < 6) {
    toast({
      title: "Error",
      description: "Password must be at least 6 characters long",
      variant: "destructive",
    })
    return
  }

  setPasswordLoading(true)

  try {
    const token = localStorage.getItem('token') // or however you store the auth token
    const response = await fetch('/api/user/update-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }),
    })

    const data = await response.json()

    if (response.ok) {
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
    } else {
      toast({
        title: "Error",
        description: data.error || "Failed to update password",
        variant: "destructive",
      })
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Network error. Please try again.",
      variant: "destructive",
    })
  } finally {
    setPasswordLoading(false)
  }
}

// Update the security tab content (lines 145-155):
<div className="space-y-2">
  <Label htmlFor="current-password">Current Password</Label>
  <Input 
    id="current-password" 
    type="password" 
    value={passwordData.currentPassword}
    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
  />
</div>
<div className="space-y-2">
  <Label htmlFor="new-password">New Password</Label>
  <Input 
    id="new-password" 
    type="password" 
    value={passwordData.newPassword}
    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
  />
</div>
<div className="space-y-2">
  <Label htmlFor="confirm-password">Confirm New Password</Label>
  <Input 
    id="confirm-password" 
    type="password" 
    value={passwordData.confirmPassword}
    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
  />
</div>
<Button onClick={handlePasswordUpdate} disabled={passwordLoading}>
  {passwordLoading ? "Updating..." : "Update Password"}
</Button>
```

#### 9. Update App.jsx Router
**File**: `frontend/src/App.jsx`
**Action**: Add route for reset password page
```javascript
// Add this import:
import ResetPasswordPage from "./pages/auth/ResetPasswordPage"

// Add this route (around line 22):
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

### Environment Variables

#### 10. Update Environment Variables
**Files**: 
- `backend/.env`
- `frontend/.env` (if needed)

**Action**: Add email service configuration
```env
# Email Service Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173

# Existing variables...
MONGO_URI=your-mongo-uri
JWT_SECRET=your-jwt-secret
```

---

## Installation Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install nodemailer
   ```

2. **Update Environment Variables**: Add email configuration to `.env` file

3. **Apply Backend Changes**: Update the specified files with the new code

4. **Apply Frontend Changes**: Update the specified files with the new code

5. **Test the Implementation**:
   - Test forgot password flow
   - Test password reset with token
   - Test password update in settings

---

## Security Considerations

1. **Password Reset Tokens**: Expire after 1 hour for security
2. **Rate Limiting**: Consider adding rate limiting to password reset endpoints
3. **Email Validation**: Only send reset emails to registered users
4. **HTTPS**: Ensure production environment uses HTTPS for password reset links
5. **Token Cleanup**: Clean up expired tokens periodically

---

## Error Handling

The implementation includes comprehensive error handling for:
- Invalid email addresses
- Expired reset tokens
- Invalid current passwords
- Network errors
- Server errors

All errors are properly displayed to users with appropriate feedback messages.