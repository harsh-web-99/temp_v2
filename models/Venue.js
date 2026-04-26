import mongoose from "mongoose";

const ImagesSchema = new mongoose.Schema({
  image_path: { type: String, required: true },
});

const VenueSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Images: [ImagesSchema],
  Country: { type: String, required: true },
  CountryIsoCode: { type: String, required: true },
  State: { type: String, required: true },
  StateIsoCode: { type: String, required: true },
  City: { type: String, required: true },
  CityIsoCode: { type: String, required: true },
  Map_Location: { type: String, required: true },
  Name: { type: String, index: true, unique: true, required: true },
  Description: { type: String },
  Address: { type: String, required: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
  Priority: { type: Number, required: true, default: 0 },
});

const Venue = mongoose.model("Venue", VenueSchema);

export default Venue;
