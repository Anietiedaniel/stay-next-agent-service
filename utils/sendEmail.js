import axios from "axios";

export const sendEmail = async (to, subject, html) => {
  try {
    console.log("📧 Preparing to send email via Brevo API...");

    const data = {
      sender: { name: "Auth System", email: "anietienteabasi12345@gmail.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    const res = await axios.post("https://api.brevo.com/v3/smtp/email", data, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log("📨 Brevo response:", res.data);

    return res.data;
  } catch (error) {
    console.error("❌ Email sending error:", error.response?.data || error.message);
    throw new Error("Email failed to send via Brevo API");
  }
};
