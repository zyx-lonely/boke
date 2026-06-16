const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logger');

let transporter = null;
let cachedConfig = null;

async function getConfig(pool) {
  const [rows] = await pool.query("SELECT `key`, `value` FROM settings WHERE `key` LIKE 'smtp_%'");
  const config = {};
  rows.forEach(r => { config[r.key] = r.value });
  return config;
}

async function getTransporter(pool) {
  const config = await getConfig(pool);
  const configKey = JSON.stringify(config);
  if (cachedConfig === configKey && transporter) return transporter;
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port) || 587,
    secure: config.smtp_secure === 'true',
    auth: { user: config.smtp_user, pass: config.smtp_pass }
  });
  cachedConfig = configKey;
  return transporter;
}

async function sendMail(pool, to, subject, html) {
  try {
    const config = await getConfig(pool);
    const from = config.smtp_from || config.smtp_user;
    const t = await getTransporter(pool);
    if (!t) {
      logger.warn('邮箱未配置，跳过邮件发送');
      return false;
    }
    await t.sendMail({ from: `"${config.site_name || '资源分享博客'}" <${from}>`, to, subject, html });
    logger.info(`邮件发送成功: ${to} - ${subject}`);
    return true;
  } catch (error) {
    logger.error('邮件发送失败:', error);
    return false;
  }
}

async function sendCommentNotification(pool, email, username, resourceTitle, status, commentContent) {
  const statusText = status === 'approved' ? '已通过' : '已拒绝';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#667eea">评论审核通知</h2>
      <p>您好 <strong>${username}</strong>，</p>
      <p>您在资源《${resourceTitle}》中的评论已被 <strong>${statusText}</strong>：</p>
      <blockquote style="border-left:4px solid #667eea;padding:12px 16px;background:#f5f7fa;margin:16px 0;color:#555">${commentContent}</blockquote>
      <p style="color:#999;font-size:13px">此邮件由系统自动发送，请勿回复。</p>
    </div>`;
  return sendMail(pool, email, `评论审核${statusText} - ${resourceTitle}`, html);
}

module.exports = { sendMail, sendCommentNotification };
