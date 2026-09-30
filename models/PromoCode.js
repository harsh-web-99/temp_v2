import mongoose from "mongoose";

const PromocodeEventsSchema = new mongoose.Schema({
  event_id: {
    type: String,
  },
});

const PromocodeCustomersSchema = new mongoose.Schema({
  customer_id: {
    type: String,
  },
});

const PromoCodeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  CanBeUsed: { type: String, required: true },
  Events: [PromocodeEventsSchema],
  PromoCodeName: { type: String, index: true },
  TermsCondition: { type: String },
  PromocodeType: { type: Number, required: true },
  Value: { type: Number, required: true },
  MinCheckoutAmount: { type: Number, required: true },
  ExpiryDate: { type: Date, required: true },
  OneTimeUseFlag: { type: Number, required: true },
  PromocodeValidFor: { type: Number, required: true },
  CustomerIds: [PromocodeCustomersSchema],
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String },
  status: { type: Number, required: true, default: 1 },
});

const Promocode = mongoose.model("Promocode", PromoCodeSchema);

export default Promocode;
