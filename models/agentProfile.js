import mongoose from "mongoose";

const agentProfileSchema = new mongoose.Schema(
  {
    // 🔗 Linked Auth User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // 🧾 Basic Information
    agencyName: { type: String, trim: true },
    agencyEmail: { type: String, trim: true, lowercase: true },
    agencyPhone: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    language: [{ type: String, trim: true }],
    about: { type: String, trim: true },
    otherInfo: { type: String, trim: true },

    // 🖼️ Media
    profileImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    agencyLogo: { type: String, default: "" },

    // 🪪 Verification Documents
    nationalId: { type: String, default: "" },

    // ⚙️ Verification & Review
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    reviewMessage: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },

    // 📊 Performance / Stats
    sales: {
      total: { type: Number, default: 0 },
      recentSales: [
        {
          propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
          amount: Number,
          date: { type: Date, default: Date.now },
        },
      ],
    },

    rented: {
      total: { type: Number, default: 0 },
      recentRented: [
        {
          propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
          amount: Number,
          date: { type: Date, default: Date.now },
        },
      ],
    },

    booked: {
      total: { type: Number, default: 0 },
      recentBooked: [
        {
          propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
          clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          date: { type: Date, default: Date.now },
        },
      ],
    },

    // 🔔 Notifications
    notifications: {
      enabled: { type: Boolean, default: true },
      unreadCount: { type: Number, default: 0 },
      lastChecked: { type: Date, default: Date.now },
    },

    // 🎁 Referral System
    referral: {
      code: { type: String, unique: true, sparse: true},
      link: { type: String },
      totalEarnings: { type: Number, default: 0 },
      referredUsers: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          reward: { type: Number, default: 0 },
          date: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model("AgentProfile", agentProfileSchema);

