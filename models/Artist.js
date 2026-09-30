import mongoose from "mongoose";

const ImagesSchema = new mongoose.Schema({
  image_path: {
    type: String,
    required: true,
  },
});

const ArtistSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Images: [ImagesSchema],
  Name: { type: String, index: true, required: true, unique: true },
  Email: { type: String },
  PhoneNo: { type: Number },
  Description: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
  Priority: { type: Number, required: true, default: 0 },
});

const Artist = mongoose.model("Artist", ArtistSchema);

export default Artist;
