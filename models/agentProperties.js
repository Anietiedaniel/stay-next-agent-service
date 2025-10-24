import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    transactionType: {
      type: String,
      enum: ["rent", "sale", "book"],
      required: true,
    },
    duration:{type: String},
    price: { type: String, required: true },
    type: { type: String, required: true },
    bedrooms: { type: Number, default: 0 },
    toilets: { type: Number, default: 0 },
    area: { type: String },
    features: { type: [String], default: [] },
    images: { type: [String], required: true },
    videos: { type: [String], default: [] },
    youtubeVideos: { type: [String], default: [] },
    dateListed: { type: Date, default: Date.now },

    // 📊 Reaction tracking
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    loves: { type: Number, default: 0 },

    // 👥 Store user actions
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lovedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);
