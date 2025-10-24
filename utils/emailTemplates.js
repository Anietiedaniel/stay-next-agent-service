export const emailTemplate = (action, user, raw, extra = {}) => {
  let title = "";
  let body = "";

  switch (action) {
    case "created":
      title = "🎉 Welcome, New Admin!";
      body = `
        <p style="color: #555; font-size: 15px;">Your <strong>Admin account</strong> has been created by the Super Admin.</p>
        <div style="margin: 20px auto; max-width: 420px; background: #f9fafb; padding: 18px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: left;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 8px 0;"><strong>This is your admin password:</strong> ${raw} <br> Do not share with anyone.</p>
        </div>
        <a href="${extra.loginLink || "#"}" 
           style="display: inline-block; margin-top: 25px; background: linear-gradient(135deg,#16a34a,#22c55e); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; transition: background 0.3s;">
          🚀 Login Now
        </a>
      `;
      break;

    case "verifyEmail":
      title = "📧 Verify Your Email";
      body = `
        <p style="color: #555; font-size: 15px;">Thank you for registering! Please verify your email to activate your account.</p>
        <div style="margin: 20px auto; max-width: 420px; background: #f9fafb; padding: 18px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
        </div>
        <a href="${extra.verificationLink || "#"}" 
           style="display: inline-block; margin-top: 25px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; transition: background 0.3s;">
          ✅ Verify Email
        </a>
        <p style="margin-top: 25px; font-size: 13px; color: #6b7280;">If you did not create an account, you can safely ignore this email.</p>
      `;
      break;

    case "updated":
      title = "🔄 Your Account Has Been Updated!";
      body = `
        <p style="color: #555; font-size: 15px;">Your account details were <strong>updated</strong> by Super Admin.</p>
        <div style="margin: 20px auto; max-width: 420px; background: #f9fafb; padding: 18px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: left;">
          <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
        </div>
      `;
      break;

    case "deleted":
      title = "⚠️ Your Account Has Been Deleted!";
      body = `
        <p style="color: #555; font-size: 15px;">Your <strong>Admin account</strong> has been removed by Super Admin.</p>
        <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">If you believe this was a mistake, please contact support immediately.</p>
      `;
      break;

    case "resetPassword":
      title = "🔐 Reset Your Password";
      body = `
        <p style="color: #555; font-size: 15px;">We received a request to reset your password.</p>
        <a href="${extra.resetLink || "#"}" 
           style="display: inline-block; margin-top: 25px; background: linear-gradient(135deg, #16a34a, #4ade80); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; transition: background 0.3s;">
          🔑 Reset Password
        </a>
        <p style="margin-top: 25px; font-size: 13px; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
      `;
      break;

    default:
      title = "📩 Notification";
      body = `<p style="color: #555; font-size: 15px;">You have a new notification from Stay Next.</p>`;
  }

  return `
  <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6; padding: 40px; line-height: 1.6;">
    <div style="max-width: 640px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
      <div style="background: linear-gradient(135deg, #16a34a, #4ade80); padding: 35px; text-align: center;">
        <img src="https://res.cloudinary.com/drt2ymnfm/image/upload/v1754492778/logo_mxvbpu.png" alt="StayNext Logo" width="120" style="margin-bottom: 12px;" />
        <h2 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${title}</h2>
      </div>
      
      <!-- BODY -->
      <div style="padding: 35px; text-align: center; font-size: 15px; color: #374151;">
        <h3 style="color: #111827; margin-bottom: 15px;">Hello ${user.name},</h3>
        ${body}
      </div>
      
      <!-- FOOTER -->
      <div style="background-color: #f9fafb; text-align: center; padding: 18px; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} Stay Next. All rights reserved.<br/>
        <a href="${process.env.CLIENT_URL}" style="color:#16a34a; text-decoration:none;">Visit Website</a>
      </div>
    </div>
  </div>
  `;
};
