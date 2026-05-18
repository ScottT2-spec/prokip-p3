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

const BRAND = {
  charcoal: '#1E293B',
  gold: '#B8860B',
  goldLight: '#FDF6E3',
  green: '#28a745',
  red: '#dc3545',
  gray: '#64748B',
  bg: '#F8FAFC',
};

function emailWrapper(content) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: ${BRAND.bg}; padding: 32px 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: ${BRAND.charcoal}; padding: 24px 32px; text-align: center;">
          <h1 style="margin: 0; color: ${BRAND.gold}; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
            ⚡ Prokip P3
          </h1>
          <p style="margin: 4px 0 0; color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            Performance Pulse
          </p>
        </div>
        <!-- Body -->
        <div style="padding: 32px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="background: ${BRAND.bg}; padding: 16px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; color: ${BRAND.gray}; font-size: 12px;">
            This is an automated notification from Prokip Performance Pulse.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Send point change notification email (standard alert)
 */
async function sendPointChangeEmail(user, pointChange, newTotal, reason, givenBy, category = 'PERFORMANCE') {
  const isPositive = pointChange > 0;
  const changeColor = isPositive ? BRAND.green : BRAND.red;
  const categoryLabel = category === 'REWARD' ? '🌟 Reward' : '⚙️ Performance';

  const subject = isPositive
    ? `✅ +${pointChange} Points Awarded – ${category === 'REWARD' ? 'Reward' : 'Performance'}`
    : `⚠️ ${pointChange} Points Deducted – ${category === 'REWARD' ? 'Reward' : 'Performance'}`;

  const content = `
    <h2 style="color: ${BRAND.charcoal}; margin: 0 0 8px;">Your Points Have Been Updated!</h2>
    <p style="color: ${BRAND.gray}; margin: 0 0 24px;">Hi <strong>${user.firstName}</strong>, here's your latest point update.</p>

    <!-- Point Change Banner -->
    <div style="background: ${isPositive ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${changeColor}; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="font-size: 36px; font-weight: 700; color: ${changeColor}; margin: 0;">
        ${isPositive ? '+' : ''}${pointChange}
      </p>
      <p style="color: ${BRAND.gray}; margin: 4px 0 0; font-size: 14px;">points</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: ${BRAND.charcoal}; width: 140px;">Type</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: ${BRAND.charcoal};">${categoryLabel}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: ${BRAND.charcoal};">New Total</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: ${BRAND.charcoal}; font-weight: 700;">${newTotal} points</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: ${BRAND.charcoal};">Reason</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: ${BRAND.charcoal};">${reason}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-weight: 600; color: ${BRAND.charcoal};">Updated By</td>
        <td style="padding: 12px 16px; color: ${BRAND.charcoal};">${givenBy.firstName} ${givenBy.lastName}</td>
      </tr>
    </table>

    <p style="color: ${BRAND.gray}; font-size: 14px;">
      Log in to your dashboard to view your full point history and performance details.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'notifications@prokip.com',
      to: user.email,
      subject,
      html: emailWrapper(content),
    });
  } catch (error) {
    console.error('Failed to send point change email:', error.message);
  }
}

/**
 * Send Platinum High-Five email when user crosses into A+ (105+ points)
 */
async function sendPlatinumHighFive(user, points) {
  const content = `
    <div style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 8px;">🖐</div>
      <h1 style="color: ${BRAND.gold}; margin: 0 0 4px; font-size: 28px;">LEVEL UP!</h1>
      <h2 style="color: ${BRAND.charcoal}; margin: 0 0 24px; font-weight: 400;">You've received a Platinum High-Five!</h2>
    </div>

    <p style="color: ${BRAND.charcoal}; line-height: 1.6;">
      Dear <strong>${user.firstName}</strong>,
    </p>
    <p style="color: ${BRAND.charcoal}; line-height: 1.6;">
      You've officially hit the <strong style="color: ${BRAND.gold};">A+ Tier</strong> with
      <strong>${points} points!</strong>
    </p>
    <p style="color: ${BRAND.charcoal}; line-height: 1.6;">
      You didn't just meet the bar; you raised it. This high-five recognizes your exceptional
      reliability and your commitment to the Prokip standard.
    </p>

    <div style="background: ${BRAND.goldLight}; border: 2px solid ${BRAND.gold}; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="font-weight: 700; color: ${BRAND.charcoal}; margin: 0; font-size: 18px;">
        Current Status: Elite Performance
      </p>
      <p style="color: ${BRAND.gold}; margin: 8px 0 0; font-weight: 600;">
        Priority Project Selection Active 🚀
      </p>
    </div>

    <p style="color: ${BRAND.gray}; text-align: center; font-size: 14px;">
      Keep leading the way. Your team is watching and inspired.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'notifications@prokip.com',
      to: user.email,
      subject: '🖐 LEVEL UP: You\'ve received a Platinum High-Five!',
      html: emailWrapper(content),
    });
  } catch (error) {
    console.error('Failed to send Platinum High-Five email:', error.message);
  }
}

module.exports = { sendPointChangeEmail, sendPlatinumHighFive };
