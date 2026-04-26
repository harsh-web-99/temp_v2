import { ServerBase_Url } from "../config/index.js";

const Status = {
  Active: 1,
  Inactive: 2,
};

const defaultAccessLevels = {
  Events: "Events",
  Artist: "Artist",
  Categories: "Categories",
  Cities: "Cities",
  Booking: "Booking",
  Registration: "Registration",
  Tickets: "Tickets",
  Users: "Users",
  Venue: "Venue",
  Genre: "Genre",
  Reports: "Reports",
  "Tags&Rules": "Tags&Rules",
  "FAQ's": "FAQ's",
};

const AdminRoles = {
  SuperAdmin: 1,
  Employee: 2,
  Organizer: 3,
  Promoter: 4,
};

const SendDefaultPasswordMail = {
  Yes: 1,
  No: 2,
};

const ImagesPath = {
  ArtistImageFolderPath: "uploads/Artist/",
  CategoryImageFolderPath: "uploads/Category/",
  EventTourImageFolderPath: "uploads/EventTour/",
  VenueImageFolderPath: "uploads/Venue/",
  GenreImageFolderPath: "uploads/Genre/",
  SuperAdminProfileFolderPath: "uploads/SuperAdminProfile/",
  OrganizerProfileFolderPath: "uploads/OrganizerProfile/",
  PromoterProfileFolderPath: "uploads/PromoterProfile/",
  CustomerProfileFolderPath: "uploads/CustomerProfile/",
  EventCarouselImagePath: "uploads/EventCarousel/",
  EventGalleryImagePath: "uploads/EventGallery/",
  EventVenueLayoutImagePath: "uploads/EventVenueLayout/",
  DesktopHomeBannerSliderImagePath: "uploads/DesktopHomeBanner/",
  MobileHomeBannerSliderImagePath: "uploads/MobileHomeBanner/",
  QrCodeImagePath: "uploads/QrCode/",
};

const ImagesUrls = {
  EventingClubLogo: `${ServerBase_Url}/Assets/TicketEventingClubLogo.png`,
  dateIconUrl: `${ServerBase_Url}/Assets/DateIcon.png`,
  timeIconUrl: `${ServerBase_Url}/Assets/TimeIcon.png`,
};

const EventVisibility = {
  Public: 1,
  Private: 2,
};

const EventType = {
  Booking: 1,
  Registration: 2,
  WhatsApp: 3,
};

const isEventFeatured = {
  Yes: 1,
  No: 0,
};

const isTourEvent = {
  Yes: 1,
  No: 0,
};

const EventVenueTobeAnnounced = {
  Yes: 1,
  No: 0,
};

const IsVenueAvailable = {
  Yes: 1,
  No: 0,
};

const IsOnlineEvent = {
  Yes: 1,
  No: 0,
};

const EventStatus = {
  Draft: 1,
  InReview: 2,
  Published: 3,
  ReviewRejected: 4,
  Completed: 5,
};

const DownloadExcelReport = {
  Yes: 1,
  No: 0,
};

const ConvinienceFeeUnit = {
  Amount: 1,
  Percentage: 2,
};

const TicketType = {
  SingleDay: 1,
  MultipleDay: 2,
  SeasonPass: 3,
  BulkTicket: 4,
};

const TicketVisiblity = {
  All: 1,
  AllCustomers: 2,
  Promoters: 3,
  Self: 4,
};

const EventEnableDisableStatus = {
  Enable: 1,
  Disable: 2,
};

const TicketStatus = {
  Enable: 1,
  Disable: 0,
};

const TicketAvailability = {
  Available: 1,
  SoldOut: 0,
};

const CustomerType = {
  WebsiteRegistration: 1,
  AdminPanelRegistration: 2,
};

const BulkTicketStatus = {
  Booked: 1,
  Cancelled: 2,
};

const OrganizerOwnerType = {
  Club: 1,
  EventCompany: 2,
};

const CheckInStatus = {
  False: 0,
  True: 1,
};

const TicketBookingSource = {
  Promoter: 0,
  Website: 1,
};

const ReportType = {
  SummaryBooking: 1,
  TransactionBooking: 2,
};

const BookingStatus = {
  Booked: 1,
  Cancelled: 2,
  InProcess: 3,
  Failed: 4,
};

const EventDateTimeIsExpired = {
  Yes: 1,
  No: 0,
};

const ScannerUserType = {
  Event: 1,
  Organizer: 2,
};

const PromocodeCanbeUsedIn = {
  AllEvents: 1,
  SpecificEvents: 2,
};

const PromocodeUnit = {
  Amount: 1,
  Percentage: 2,
};

const PromocodeOneTimePerCustomerFlag = {
  Yes: 1,
  No: 0,
};

const PromocodeValid = {
  Public: 1,
  Private: 2,
};

const PromocodeStatus = {
  InActive: 0,
  Active: 1,
  Expired: 2,
};

export {
  Status,
  SendDefaultPasswordMail,
  EventVenueTobeAnnounced,
  isTourEvent,
  defaultAccessLevels,
  ImagesPath,
  EventVisibility,
  EventType,
  isEventFeatured,
  AdminRoles,
  EventStatus,
  DownloadExcelReport,
  ConvinienceFeeUnit,
  TicketType,
  TicketVisiblity,
  TicketStatus,
  TicketAvailability,
  IsVenueAvailable,
  IsOnlineEvent,
  CustomerType,
  EventEnableDisableStatus,
  BulkTicketStatus,
  OrganizerOwnerType,
  CheckInStatus,
  ImagesUrls,
  TicketBookingSource,
  ReportType,
  BookingStatus,
  EventDateTimeIsExpired,
  ScannerUserType,
  PromocodeCanbeUsedIn,
  PromocodeUnit,
  PromocodeOneTimePerCustomerFlag,
  PromocodeValid,
  PromocodeStatus,
};
