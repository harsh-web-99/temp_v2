import mongoose from "mongoose";

const HomeBannerSliderSchema = new mongoose.Schema({
  _id: { type: String },
  DesktopbannerImage: { type: String },
  MobilebannerImage: { type: String },
  Event_id: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String },
  status: { type: Number, required: true, default: 1 },
});

const HomeBannerSlider = mongoose.model(
  "HomeBannerSlider",
  HomeBannerSliderSchema
);

export default HomeBannerSlider;
