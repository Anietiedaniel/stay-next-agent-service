import axios from "axios";

export const updateAuthUserVerification = async (userId, status) => {
  try {
    await axios.patch(`${process.env.AUTH_SERVICE_URL}/api/auth/agent-status`, {
      userId,
      status,
    });
  } catch (err) {
    console.error("⚠️ Failed to update auth-service verification:", err.message);
  }
};
