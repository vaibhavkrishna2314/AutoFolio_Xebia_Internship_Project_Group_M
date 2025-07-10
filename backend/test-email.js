require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/emailService');

async function testEmail() {
  console.log('🚀 Testing email configuration...');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔗 Frontend URL:', process.env.FRONTEND_URL);
  
  try {
    // Test with your own email
    const testEmail = process.env.EMAIL_USER; // Send test email to yourself
    const testToken = 'test-token-' + Date.now();
    
    console.log(`📨 Sending test email to: ${testEmail}`);
    
    await sendPasswordResetEmail(testEmail, testToken);
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Check your inbox for the test email');
    console.log('🔗 The reset link should look like:');
    console.log(`   ${process.env.FRONTEND_URL}/auth/reset-password?token=${testToken}`);
    
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    
    // Provide specific troubleshooting based on error
    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   - Make sure you\'re using Gmail App Password, not your regular password');
      console.log('   - Enable 2-Factor Authentication on your Google account');
      console.log('   - Generate an App Password from Google Account Settings');
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   - Check your internet connection');
      console.log('   - Verify firewall isn\'t blocking SMTP ports (587/465)');
      console.log('   - Try using a different email service');
    }
    
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   - Double-check your EMAIL_USER and EMAIL_PASS in .env');
      console.log('   - Make sure there are no extra spaces');
      console.log('   - Regenerate your Gmail App Password');
    }
  }
}

// Run the test
testEmail();