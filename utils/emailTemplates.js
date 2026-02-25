// Forgot Password OTP Email Template
const forgotPasswordTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { color: #e74c3c; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset your password. Use the OTP below to proceed:</p>
          
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          
          <p><strong>⏰ Valid for 10 minutes</strong></p>
          <p>Please do not share this OTP with anyone for security reasons.</p>
          
          <div class="warning">
            ⚠️ If you didn't request this, please ignore this email or contact support.
          </div>
        </div>
        <div class="footer">
          <p>© 2024 TechFinit. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email Verification OTP Template
const emailVerificationTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp { font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Email Verification</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for registering! Please verify your email using the OTP below:</p>
          
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          
          <p><strong>⏰ Valid for 10 minutes</strong></p>
          <p>Enter this OTP to complete your registration.</p>
        </div>
        <div class="footer">
          <p>© 2024 TechFinit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome Email Template (After Registration)
const welcomeTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #4CAF50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to TechFinit!</h1>
        </div>
        <div class="content">
          <div class="success">
            <h2 style="margin: 0;">✅ Registration Successful!</h2>
          </div>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Congratulations! Your account has been created successfully.</p>
          <p>You can now access all the features of our platform.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2024 TechFinit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password Reset Success Template
const passwordResetSuccessTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #4CAF50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { color: #e74c3c; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Reset Successful</h1>
        </div>
        <div class="content">
          <div class="success">
            <h2 style="margin: 0;">🔒 Your Password Has Been Reset</h2>
          </div>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your password has been successfully reset. You can now login with your new password.</p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact support immediately.
          </div>
        </div>
        <div class="footer">
          <p>© 2024 TechFinit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  forgotPasswordTemplate,
  emailVerificationTemplate,
  welcomeTemplate,
  passwordResetSuccessTemplate,
};
