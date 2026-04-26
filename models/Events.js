import mongoose from "mongoose";

const ImagesSchema = new mongoose.Schema({
  image_path: {
    type: String,
    required: true,
    index: true,
  },
});

const FAQSchema = new mongoose.Schema({
  Question: {
    type: String,
    required: true,
  },
  Answer: {
    type: String,
    required: true,
  },
});

const OrganizersSchema = new mongoose.Schema({
  organizer_id: {
    type: String,
    required: true,
    index: true,
  },
});

const PromoterSchema = new mongoose.Schema({
  promoter_id: {
    type: String,
    required: true,
    index: true,
  },
});

const CategoriesSchema = new mongoose.Schema({
  category_id: {
    type: String,
    required: true,
    index: true,
  },
});

const ArtistSchema = new mongoose.Schema({
  artist_id: {
    type: String,
    required: true,
    index: true,
  },
});

const GenreSchema = new mongoose.Schema({
  genre_id: {
    type: String,
    required: true,
    index: true,
  },
});

const EventLanguageSchema = new mongoose.Schema({
  language_name: {
    type: String,
    required: true,
    index: true,
  },
});

const EventSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  TourEvent: { type: Number, required: true, default: 0 },
  EventTour_id: { type: String, index: true },
  EventCarouselImages: [ImagesSchema],
  EventVisibility: { type: Number, required: true },
  EventType: { type: Number, required: true },
  BookingPhoneNumber: { type: Number },
  WhatsAppPhoneNumber: { type: Number },
  VenueEventFlag: { type: Number, required: true, default: 0 },
  venue_id: { type: String, index: true },
  Venue_layout_ImagePath: { type: String },
  OnlineEventFlag: { type: Number, required: true, default: 0 },
  Online_Event_Link: { type: String },
  VenueToBeAnnounced: { type: Number, required: true, default: 0 },
  VenueToBeAnnouncedState: { type: String },
  VenueToBeAnnouncedStateIsoCode: { type: String },
  VenueToBeAnnouncedCity: { type: String },
  VenueToBeAnnouncedCityIsoCode: { type: String },
  EventOrganizers: [OrganizersSchema],
  EventPromoter: [PromoterSchema],
  EventCategories: [CategoriesSchema],
  EventArtist: [ArtistSchema],
  EventGenre: [GenreSchema],
  EventLanguages: [{ type: String }],
  BestSuitedFor: { type: String },
  EventName: { type: String, index: true, required: true },
  EventDescription: { type: String, required: true },
  FeaturedEventFlag: { type: Number, required: true, default: 0 },
  EventTermsCondition: { type: String, required: true },
  EventGalleryImages: [ImagesSchema],
  EventVedioUrl: { type: String },
  EventRejectRemark: { type: String },
  EventFAQs: [FAQSchema],
  ConvinienceFeeUnit: { type: Number },
  ConvinienceFeeValue: { type: Number },
  CreatedBy: { type: String, required: true, index: true },
  createduser_id: { type: String, index: true, required: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  EventStatus: { type: Number, required: true, default: 1 },
  EventIsEnableOrDisable: { type: Number, required: true, default: 1 },
});

const Event = mongoose.model("Event", EventSchema);

export default Event;
