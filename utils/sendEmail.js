// utils/sendEmail.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email using Nodemailer
 * @param {Object} options - Mail options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Stay Next Real Estate" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
