const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send point change notification email
 */
async function sendPointChangeEmail(user, pointChange, newTotal, reason, givenBy) {
  const subject = pointChange > 0
    ? `✅ +${pointChange} Points Awarded!`
    : `⚠️ ${pointChange} Points Deducted`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Point Update Notification</h2>
      <p>Hi <strong>${user.firstName}</strong>,</p>
      <p>Your performance points have been updated:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Change</td>
          <td style="padding: 8px; border: 1px solid #ddd; color: ${pointChange > 0 ? '#28a745' : '#dc3545'};">
            ${pointChange > 0 ? '+' : ''}${pointChange} points
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">New Total</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${newTotal} points</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Reason</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${reason}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Updated By</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${givenBy.firstName} ${givenBy.lastName}</td>
        </tr>
      </table>
      <p>Log in to your dashboard to view your full point history.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send point change email:', error.message);
  }
}

/**
 * Send Platinum High-Five email when user hits 105+
 */
async function sendPlatinumHighFive(user, points) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
      <h1 style="color: #B8860B;">🖐 LEVEL UP!</h1>
      <h2>You've received a Platinum High-Five!</h2>
      <p>Dear <strong>${user.firstName}</strong>,</p>
      <p>You've officially hit the <strong>A+ Tier</strong> with <strong>${points} points!</strong></p>
      <p>You didn't just meet the bar; you raised it. This high-five recognizes your exceptional reliability and your commitment to the Prokip standard.</p>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="font-weight: bold; margin: 0;">Current Status: Elite Performance</p>
        <p style="margin: 4px 0;">(Priority Project Selection Active)</p>
      </div>
      <p>Keep leading the way. 🚀</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: '🖐 LEVEL UP: You\'ve received a Platinum High-Five!',
      html,
    });
  } catch (error) {
    console.error('Failed to send Platinum High-Five email:', error.message);
  }
}

module.exports = { sendPointChangeEmail, sendPlatinumHighFive };
