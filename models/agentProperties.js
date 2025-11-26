import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    agent: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number },
    transactionType: { type: String },
    type: { type: String },
    duration: { type: String },
    bedrooms: { type: Number, default: 0 },
    toilets: { type: Number, default: 0 },
    area: { type: String },
    features: { type: [String], default: [] },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    youtubeVideos: { type: [String], default: [] },
    fileHashes: { type: [String], default: [] }, // optional for duplicate prevention
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);
