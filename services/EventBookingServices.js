import {
  EventBookings,
  Organizer,
  SuperAdmin,
  Employee,
  Promoter,
} from "../models/AllModels.js";
import {
  IsVenueAvailable,
  IsOnlineEvent,
  EventVenueTobeAnnounced,
  ImagesUrls,
  TicketType,
  AdminRoles,
  BookingStatus,
} from "../helpers/Enum.js";
import { findOneEventDataService } from "./EventServices.js";
import { findOneEventTicketDataService } from "./EventTicketServices.js";
import {
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
  SortEventDateTime,
} from "./EventDateTimeServices.js";
import { findOneVenueDataService } from "./VenueServices.js";
import { sendBookingSms } from "../helpers/SmsFunctions.js";
import sendResponse from "../helpers/sendResponse.js";
import { sendEventTicketToCustomerEmail } from "../helpers/mailer.js";
import { ServerBase_Url } from "../config/index.js";
import Razorpay from "razorpay";
import { getCheckInDataService } from "./CheckInServices.js";
import { validateEventBookingsbyPromoterId } from "../validations/index.js";
import { findOnePromoterDataService } from "./PromoterServices.js";

const createEventBookingService = async (BookingData) => {
  try {
    const newBooking = new EventBookings(BookingData);
    await newBooking.save();
    return newBooking;
  } catch (error) {
    console.error("Error creating Event Booking:", error);
    throw new Error("Failed to create Booking");
  }
};

const findOneEventBookingsDataService = async (filterquery) => {
  try {
    const BookingsData = await EventBookings.findOne(filterquery);
    return BookingsData;
  } catch (error) {
    console.error("Error finding One bookingData:", error);
    throw new Error("Failed to Finding One bookingData");
  }
};

const getEventBookingsDataService = async (filterquery) => {
  try {
    const eventBookingData = await EventBookings.find(filterquery);
    return eventBookingData;
  } catch (error) {
    console.error("Error finding fetching eventBooking Data:", error);
    throw new Error("Failed to Finding fetching eventBooking Data");
  }
};

const updateBookingDataService = async (filterquery, updateQuery) => {
  try {
    const BookingData = await EventBookings.findOneAndUpdate(
      filterquery,
      updateQuery
    );
    return BookingData;
  } catch (error) {
    console.error("Error updating the Booking Data:", error);
    throw new Error("Error updating the Booking Data");
  }
};

const sendBookingSmsMailtoUser = async (TicketBooking_id) => {
  try {
    const BookingData = await findOneEventBookingsDataService({
      Booking_id: TicketBooking_id,
      status: BookingStatus.Booked,
    });
    if (!BookingData) {
      return sendResponse(res, 404, true, `Booking Details Not Found`);
    }

    const {
      event_id,
      EventTicket_id,
      PhoneNumber,
      Email,
      TicketQuantity,
      Qr_image_path,
      EventTicketType,
    } = BookingData;

    const [EventData, TicketData] = await Promise.all([
      findOneEventDataService({ _id: event_id }),
      findOneEventTicketDataService({ _id: EventTicket_id }),
    ]);

    let EventDateTimeData;
    let BookedEventTicketType;

    if (
      EventTicketType == TicketType.SingleDay ||
      EventTicketType == TicketType.MultipleDay
    ) {
      const EventDateTime_id = BookingData._doc.EventDateTime_id;

      EventDateTimeData = await findOneEventDateTimeDataService({
        _id: EventDateTime_id,
      });
      BookedEventTicketType = "Single Day";
    } else {
      const EventAllDateTimeData = await getEventDateTimeDataService({
        Event_id: event_id,
      });

      const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

      EventDateTimeData = FirstDateTime[0];

      BookedEventTicketType = "Season Pass";
    }

    let EventVenue;
    let VenueCity;

    const VenueToBeAnnouncedFlag = EventData._doc.VenueToBeAnnounced;
    const OnlineEventFlag = EventData._doc.OnlineEventFlag;
    const VenueEventFlag = EventData._doc.VenueEventFlag;

    const TicketDescription = TicketData._doc.Description;

    if (VenueEventFlag == IsVenueAvailable.Yes) {
      const venue_id = EventData._doc.venue_id;

      const VenueFilterQuery = { _id: venue_id };

      const VeneDetails = await findOneVenueDataService(VenueFilterQuery);
      EventVenue = VeneDetails._doc.Name;
      VenueCity = VeneDetails._doc.City;
    }

    if (OnlineEventFlag == IsOnlineEvent.Yes) {
      EventVenue = "Online Event";
      VenueCity = "Online";
    }

    if (VenueToBeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
      EventVenue = "Venue to be Announced";
      VenueCity = EventData._doc.VenueToBeAnnouncedCity;
    }

    const eventDate = new Date(EventDateTimeData._doc.EventStartDateTime);
    const EventDate = eventDate.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    const EventTime = eventDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    const logoUrl = ImagesUrls.EventingClubLogo;
    const dateIconUrl = ImagesUrls.dateIconUrl;
    const timeIconUrl = ImagesUrls.timeIconUrl;
    const EventName = EventData.EventName;
    const TicketUrl = `${ServerBase_Url}/rndtckt/${BookingData.Booking_id}`;
    const QrCodeUrl = `${ServerBase_Url}/${Qr_image_path}`;
    const termsAndConditions = `
  1. Please ensure you carry a valid ID proof for entry.
  2. Tickets once purchased are non-refundable, even in the event of rescheduling.
  3. The management reserves the right to conduct security checks, including frisking.
  4. Venue rules apply.
`;

    const response = await sendEventTicketToCustomerEmail(
      Email,
      EventName,
      TicketBooking_id,
      logoUrl,
      dateIconUrl,
      timeIconUrl,
      EventDate,
      EventTime,
      BookedEventTicketType,
      TicketData._doc.Name,
      TicketQuantity,
      EventVenue,
      VenueCity,
      QrCodeUrl,
      TicketUrl,
      termsAndConditions,
      TicketDescription
    );

    if (response == "SmtpDetails Not Found in Database") {
      return res.status(403).send("SmtpDetails Not Found in Database");
    }

    sendBookingSms(`91${PhoneNumber}`, EventName, TicketBooking_id);
  } catch (error) {
    console.log(error);
  }
};

const getPaginatedEventBookingsData = async (filterQuery, limit, skip) => {
  try {
    return await EventBookings.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated EventBookings Data:", error);
    throw error;
  }
};

const countEventBookings = async (filterQuery) => {
  try {
    return await EventBookings.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting EventBookings Data:", error);
    throw error;
  }
};

const fetchAndFormatEventTransactionData = async ({
  AdminRole,
  user_id,
  event_id,
  searchKeyword,
}) => {
  // Validate AdminRole and user_id
  const userModels = {
    [AdminRoles.SuperAdmin]: SuperAdmin,
    [AdminRoles.Organizer]: Organizer,
    [AdminRoles.Promoter]: Promoter,
    [AdminRoles.Employee]: Employee,
  };
  const UserModel = userModels[AdminRole];

  if (!UserModel) {
    return { error: true, message: "Invalid AdminRole" };
  }

  const userExists = await UserModel.findOne({ _id: user_id });
  if (!userExists) {
    return { error: true, message: `${AdminRole} Not Found` };
  }

  // Prepare booking filter
  const bookingfilter = { event_id };
  if (searchKeyword) {
    const searchRegex = new RegExp(`^${searchKeyword}`, "i");
    bookingfilter.$or = [
      { Booking_id: searchRegex },
      { CustomerName: searchRegex },
    ];
  }

  // Fetch event and booking data in parallel
  const [event, bookingData] = await Promise.all([
    findOneEventDataService({ _id: event_id }),
    getEventBookingsDataService(bookingfilter),
  ]);

  if (!event) {
    return { error: true, message: "Event Not Found" };
  }

  if (!bookingData || bookingData.length == 0) {
    return { error: true, message: "No Event Bookings Found" };
  }

  const eventName = event._doc.EventName;

  // Format the booking data
  const formattedBookingData = await Promise.all(
    bookingData.map(async (booking) => {
      const { EventTicket_id, EventTicketType } = booking;

      // Fetch ticket data
      const ticketData = await findOneEventTicketDataService({
        _id: EventTicket_id,
        Event_id: event_id,
      });

      let dateTimeData;

      if (
        EventTicketType == TicketType.SingleDay ||
        EventTicketType == TicketType.MultipleDay
      ) {
        const EventDateTime_id = booking._doc.EventDateTime_id;

        // Fetch date-time for specific event date-time ID
        dateTimeData = await findOneEventDateTimeDataService({
          _id: EventDateTime_id,
        });
      } else {
        const eventTicketFilterQuery = { Event_id: event_id };

        // Fetch and sort all date-time data for the event
        const EventDateAllTimeData = await getEventDateTimeDataService(
          eventTicketFilterQuery
        );
        const arrangedEventDateTime = SortEventDateTime(EventDateAllTimeData);

        // Select the first event date-time after sorting
        dateTimeData = arrangedEventDateTime[0];
      }

      // Reverse map for TicketType
      const TicketTypeReverseMap = Object.fromEntries(
        Object.entries(TicketType).map(([key, value]) => [value, key])
      );

      return {
        CustomerName: booking.CustomerName,
        Booking_id: booking.Booking_id,
        PhoneNumber: booking.PhoneNumber,
        WhatsAppNumber: booking.WhatsAppNumber,
        Email: booking.Email,
        BookingDateTime: booking.BookingDateTime,
        EventName: eventName,
        TicketDate: dateTimeData?._doc?.EventStartDateTime,
        TicketQuantity: booking.TicketQuantity,
        TicketName: ticketData?._doc?.Name,
        EventTicketType: TicketTypeReverseMap[ticketData?._doc?.TicketType],
        TicketPrice: booking.TicketPrice,
        TotalAmount: booking.TotalAmount,
        Status: booking.status,
      };
    })
  );

  return { error: false, event, formattedBookingData };
};

const getUserModel = (AdminRole) => {
  const userModels = {
    [AdminRoles.SuperAdmin]: SuperAdmin,
    [AdminRoles.Organizer]: Organizer,
    [AdminRoles.Promoter]: Promoter,
    [AdminRoles.Employee]: Employee,
  };
  return userModels[AdminRole];
};

const validateUserAndEvent = async (AdminRole, user_id, event_id) => {
  const UserModel = getUserModel(AdminRole);
  if (!UserModel) {
    throw new Error("Invalid AdminRole");
  }

  const userExists = await UserModel.findOne({ _id: user_id });
  if (!userExists) {
    throw new Error(`${AdminRole} Not Found`);
  }

  const eventExists = await findOneEventDataService({ _id: event_id });
  if (!eventExists) {
    throw new Error("Event Not Found");
  }

  return eventExists;
};

const processTicketsData = async (eventTicketsData, event_id) => {
  const processedData = await Promise.all(
    eventTicketsData.map(async (ticket) => {
      const { EventDateTime_id, Name, Price, _id } = ticket;
      const EventTicketType = ticket._doc.TicketType;

      let eventDateTimeData;

      if (
        EventTicketType == TicketType.SingleDay ||
        EventTicketType == TicketType.MultipleDay
      ) {
        eventDateTimeData = await findOneEventDateTimeDataService({
          _id: EventDateTime_id,
          Event_id: event_id,
        });
      }

      if (EventTicketType == TicketType.SeasonPass) {
        const EventDateTimeData = await getEventDateTimeDataService({
          Event_id: event_id,
        });

        eventDateTimeData = EventDateTimeData[0];
      }

      if (!eventDateTimeData) {
        console.error(`Event DateTime with ID ${EventDateTime_id} not found.`);
        return null;
      }

      const totalBookings = await getEventBookingsDataService({
        EventTicket_id: _id,
        status: { $in: [BookingStatus.Booked, BookingStatus.Cancelled] },
      });

      const totalTicketsSold = totalBookings.reduce(
        (total, item) => total + item.TicketQuantity,
        0
      );

      const TotalCheckInsForTickets = await getCheckInDataService({
        EventTicketId: _id,
      });

      return {
        Ticket_id: _id,
        TicketName: Name,
        Quantity: totalTicketsSold,
        CheckIn: TotalCheckInsForTickets.length,
        TicketPrice: Price,
        TicketDate: eventDateTimeData.EventStartDateTime,
        TotalAmount: totalTicketsSold * Price,
      };
    })
  );

  return processedData.filter((data) => data != null);
};

const fetchAndFormatPromoterTransactionBookingData = async (req) => {
  const { promoter_id, event_id, searchKeyword } = req.body;

  // Validate request body
  const validationResponse = await validateEventBookingsbyPromoterId(req.body);
  if (validationResponse.error) {
    return { error: true, message: validationResponse.errorMessage };
  }

  // Build booking filter based on event_id and promoter_id
  const bookingfilter = {
    event_id,
    promoter_id,
    status: BookingStatus.Booked,
  };

  // If searchKeyword is provided, add search conditions for Booking ID, Customer Name, and Phone Number
  if (searchKeyword) {
    const searchRegex = new RegExp(`^${searchKeyword}`, "i");
    const orConditions = [
      { Booking_id: searchRegex },
      { CustomerName: searchRegex },
    ];
    
    // Check if searchKeyword is a valid number for PhoneNumber search
    const searchNumber = parseInt(searchKeyword);
    if (!isNaN(searchNumber)) {
      orConditions.push({ PhoneNumber: searchNumber });
    }
    
    bookingfilter.$or = orConditions;
  }

  // Fetch promoter, event, and booking data concurrently using Promise.all
  const [promoter, event, bookingData] = await Promise.all([
    findOnePromoterDataService({ _id: promoter_id }),
    findOneEventDataService({ _id: event_id }),
    getEventBookingsDataService(bookingfilter),
  ]);

  // Check for missing data and handle errors
  if (!promoter) return { error: true, message: "Promoter Not Found" };
  if (!event) return { error: true, message: "Event Not Found" };
  if (!bookingData || bookingData.length == 0) {
    return { error: true, message: "No Event Bookings Found" };
  }

  const eventName = event._doc.EventName;

  // Format the booking data
  const formattedBookingData = await Promise.all(
    bookingData.map(async (booking) => {
      const { EventDateTime_id, EventTicket_id, EventTicketType } = booking;

      let dateTimeData;

      if (
        EventTicketType == TicketType.SingleDay ||
        EventTicketType == TicketType.MultipleDay
      ) {
        dateTimeData = await findOneEventDateTimeDataService({
          _id: EventDateTime_id,
          Event_id: event_id,
        });
      }

      if (EventTicketType == TicketType.SeasonPass) {
        const EventDateTimeData = await getEventDateTimeDataService({
          Event_id: event_id,
        });

        dateTimeData = EventDateTimeData[0];
      }

      // Fetch event date-time and ticket data concurrently
      const [ticketData] = await Promise.all([
        findOneEventTicketDataService({
          _id: EventTicket_id,
          Event_id: event_id,
        }),
      ]);

      // Reverse map the ticket type from its enum value
      const TicketTypeReverseMap = Object.fromEntries(
        Object.entries(TicketType).map(([key, value]) => [value, key])
      );

      // Return the formatted booking details
      return {
        CustomerName: booking.CustomerName,
        Booking_id: booking.Booking_id,
        PhoneNumber: booking.PhoneNumber,
        WhatsAppNumber: booking.WhatsAppNumber,
        Email: booking.Email,
        BookingDateTime: booking.BookingDateTime,
        EventName: eventName,
        TicketDate: dateTimeData._doc.EventStartDateTime,
        TicketQuantity: booking.TicketQuantity,
        TicketName: ticketData._doc.Name,
        EventTicketType: TicketTypeReverseMap[ticketData._doc.TicketType],
        TicketPrice: booking.TicketPrice,
        TotalAmount: booking.TotalAmount,
        status: booking.status,
        Remark: booking?.PromoterNote,
      };
    })
  );

  // Return the formatted booking data
  return { error: false, formattedBookingData };
};

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export {
  createEventBookingService,
  findOneEventBookingsDataService,
  getEventBookingsDataService,
  updateBookingDataService,
  sendBookingSmsMailtoUser,
  getPaginatedEventBookingsData,
  countEventBookings,
  fetchAndFormatEventTransactionData,
  validateUserAndEvent,
  processTicketsData,
  fetchAndFormatPromoterTransactionBookingData,
  razorpayInstance,
};
