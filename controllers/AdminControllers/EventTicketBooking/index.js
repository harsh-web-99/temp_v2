import {
  EventBookings,
  EventTickets,
  Organizer,
  SuperAdmin,
  Employee,
  Promoter,
  CheckIn,
} from "../../../models/AllModels.js";
import {
  validateEventTicketsBookingByPromoter,
  validateEventBookingsbyPromoterId,
  validatePromoterLatestBookingsbyPromoterId,
  validateEventBookingsForSuperAdminOrganizer,
  validatePromoterLatestBookingsForSuperAdminOrganizer,
  validateOnlineLatestBookingsForSuperAdminOrganizer,
  validateAllLatestBookingsForSuperAdminOrganizer,
} from "../../../validations/index.js";
import {
  TicketVisiblity,
  TicketType,
  AdminRoles,
  IsVenueAvailable,
  EventVenueTobeAnnounced,
  EventStatus,
  DownloadExcelReport,
  BookingStatus,
  TicketBookingSource,
  ImagesPath,
} from "../../../helpers/Enum.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import ExcelJS from "exceljs";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  generateRandomAlphaNumeric,
  saveQRCodeToServer,
} from "../../../helpers/commonFunctions.js";
import {
  findOneEventTicketDataService,
  getEventTicketDataService,
  generateQRCode,
} from "../../../services/EventTicketServices.js";
import {
  findOneEventDataService,
  getEventDataService,
} from "../../../services/EventServices.js";
import {
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import { findOnePromoterDataService } from "../../../services/PromoterServices.js";
import {
  findOneEventBookingsDataService,
  getEventBookingsDataService,
  sendBookingSmsMailtoUser,
  getPaginatedEventBookingsData,
  countEventBookings,
  fetchAndFormatEventTransactionData,
  validateUserAndEvent,
  processTicketsData,
  fetchAndFormatPromoterTransactionBookingData,
} from "../../../services/EventBookingServices.js";
import { isProduction } from "../../../config/index.js";
import { findOneEventBulkTicketsDataService } from "../../../services/EventBulkTicketServices.js";
import {
  FormatEventDateTimeForWebsite,
  getAsiaCalcuttaCurrentDateTimeinIsoFormat,
} from "../../../helpers/DateTime.js";
import {
  findOneVenueDataService,
  getVenueDataService,
} from "../../../services/VenueServices.js";
import { sendCancelEventBookingSms } from "../../../helpers/SmsFunctions.js";
import { getCheckInDataService } from "../../../services/CheckInServices.js";
import { findOnePromocodeDataService } from "../../../services/PromocodeServices.js";
import { findOneScannerUserDataService } from "../../../services/ScannerUserServices.js";

const BookEventTicketsByPromoter = async (req, res) => {
  let session;
  try {
    console.log("Get Book Event Tickets by Promoter API Called");

    const validationResponse = await validateEventTicketsBookingByPromoter(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      promoter_id,
      event_id,
      EventTicketType,
      EventDateTime_id,
      EventTicket_id,
      CustomerName,
      PhoneNumber,
      isWhatsAppNumberisSame,
      WhatsAppNumber,
      Email,
      CustomerAge,
      TicketQuantity,
      PromoterNote,
    } = req.body;

    const [isPromoterExists, isEventExists] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id }),
      findOneEventDataService({ _id: event_id }),
    ]);

    let isEventTicketExists;

    if (
      EventTicketType == TicketType.SingleDay ||
      EventTicketType == TicketType.MultipleDay
    ) {
      const eventTicketFilterQuery = {
        _id: EventTicket_id,
        EventDateTime_id,
        Event_id: event_id,
      };

      isEventTicketExists = await findOneEventTicketDataService(
        eventTicketFilterQuery
      );
    }

    if (EventTicketType == TicketType.SeasonPass) {
      const eventTicketFilterQuery = {
        _id: EventTicket_id,
        Event_id: event_id,
      };

      isEventTicketExists = await findOneEventTicketDataService(
        eventTicketFilterQuery
      );
    }

    if (!isPromoterExists)
      return sendResponse(res, 404, true, "Promoter Not Found");
    if (!isEventExists) return sendResponse(res, 404, true, "Event Not Found");
    if (!isEventTicketExists)
      return sendResponse(res, 404, true, "Event Ticket Not Found");

    const trimmedCustomerName = CustomerName.trim();
    const normalizedEmail = Email.trim().toLowerCase();
    const trimmedPhoneNumber = PhoneNumber.trim();
    const TicketPrice = isEventTicketExists._doc.Price;
    const TotalBookingAmount = TicketPrice * TicketQuantity;

    // Check if customer exists, if not create a new customer
    let existingCustomer = await findOneCustomerDataService({
      MobileNumber: trimmedPhoneNumber,
    });

    let customer_id;
    if (!existingCustomer) {
      // Create new customer if doesn't exist
      const newCustomerData = {
        _id: uuidv4(),
        MobileNumber: trimmedPhoneNumber,
        CustomerName: trimmedCustomerName,
        Email: normalizedEmail,
        CustomerAge: CustomerAge ? CustomerAge : null,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        RegistrationType: CustomerType.WebsiteRegistration,
      };
      await registerCustomerService(newCustomerData);
      customer_id = newCustomerData._id;
    } else {
      // Update existing customer if needed
      let customerUpdated = false;
      if (!existingCustomer.CustomerName && trimmedCustomerName) {
        existingCustomer.CustomerName = trimmedCustomerName;
        customerUpdated = true;
      }
      if (!existingCustomer.Email && normalizedEmail) {
        existingCustomer.Email = normalizedEmail;
        customerUpdated = true;
      }
      if (!existingCustomer.CustomerAge && CustomerAge) {
        existingCustomer.CustomerAge = CustomerAge;
        customerUpdated = true;
      }
      if (customerUpdated) {
        await existingCustomer.save();
      }
      customer_id = existingCustomer._id;
    }

    let TicketBooking_id;
    let eventBookingExists;
    let bulkTicketExists;
    do {
      TicketBooking_id = generateRandomAlphaNumeric(6);

      [eventBookingExists, bulkTicketExists] = await Promise.all([
        findOneEventBookingsDataService({ Booking_id: TicketBooking_id }),
        findOneEventBulkTicketsDataService({ Booking_id: TicketBooking_id }),
      ]);
    } while (eventBookingExists || bulkTicketExists);

    const TotalEventTicketsQuantity = isEventTicketExists._doc.Quantity;
    const BookedTicketQuantity = isEventTicketExists._doc.BookedQuantity;
    const TicketsAvailableQuantity =
      TotalEventTicketsQuantity - BookedTicketQuantity;
    const TicketMaximumBookingQuantity =
      isEventTicketExists._doc.BookingMaxLimit;

    if (TicketQuantity > TicketMaximumBookingQuantity) {
      return sendResponse(
        res,
        409,
        true,
        `Maximum ${TicketMaximumBookingQuantity} Tickets Can be Booked Once`
      );
    }

    if (TicketQuantity > TicketsAvailableQuantity) {
      return sendResponse(res, 409, true, "Insufficient Tickets Available");
    }

    const qrObj = {
      Booking_id: TicketBooking_id,
      TicketType: isEventTicketExists._doc.TicketType,
    };

    const qrCodeUrl = await generateQRCode(qrObj);

    const QrCodeimagePath = await saveQRCodeToServer(
      qrCodeUrl,
      TicketBooking_id
    );

    const BookingObj = {
      _id: uuidv4(),
      customer_id: customer_id,
      CustomerName: trimmedCustomerName,
      PhoneNumber,
      WhatsAppNumber:
        isWhatsAppNumberisSame == 1 ? PhoneNumber : WhatsAppNumber,
      Email: normalizedEmail,
      CustomerAge: CustomerAge ? CustomerAge : null,
      event_id,
      EventDateTime_id: EventDateTime_id ? EventDateTime_id : null,
      EventTicketType: EventTicketType,
      EventTicket_id,
      TicketQuantity,
      TicketPrice,
      PromoterNote,
      Booking_id: TicketBooking_id,
      TotalAmount: TotalBookingAmount,
      BookingDateTime: getCurrentDateTime(),
      FilterationBookingDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      BookingSource: TicketBookingSource.Promoter,
      promoter_id,
      Qr_image_path: QrCodeimagePath,
    };

    session = await EventBookings.startSession();
    session.startTransaction();

    await EventBookings.create([BookingObj], { session });

    const updatedTicket = await EventTickets.findOneAndUpdate(
      {
        _id: EventTicket_id,
        EventDateTime_id,
        Event_id: event_id,
        $expr: {
          $gte: [
            { $subtract: ["$Quantity", "$BookedQuantity"] },
            TicketQuantity,
          ],
        },
      },
      { $inc: { BookedQuantity: TicketQuantity } },
      { new: true, session }
    );

    if (!updatedTicket) {
      await session.abortTransaction();
      return sendResponse(res, 409, true, "Insufficient Tickets Available");
    }

    await session.commitTransaction();
    session.endSession();

    // if (isProduction == "true") {
      await sendBookingSmsMailtoUser(TicketBooking_id);
    // }

    return sendResponse(
      res,
      200,
      false,
      "Event Ticket Booked successfully",
      BookingObj
    );
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    if (session) {
      session.endSession();
    }
    console.error("Error in booking Event Tickets by Promoter Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const cancelEventTicket = async (req, res) => {
  try {
    console.log("Cancel Event Ticket Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let { booking_id } = req.body;

    if (!booking_id) {
      return sendResponse(res, 400, true, "Booking ID is required");
    }

    const EventBookingFilterQuery = {
      Booking_id: booking_id,
    };

    const EventBookingData = await EventBookings.findOne(
      EventBookingFilterQuery
    );

    if (!EventBookingData) {
      return sendResponse(res, 404, true, "No Booking Data found");
    }

    const currentBookingStatus = EventBookingData._doc.status;

    if (currentBookingStatus == BookingStatus.Cancelled) {
      return sendResponse(res, 409, true, "Already cancelled");
    }

    const { PhoneNumber, event_id } = EventBookingData;

    const EventData = await findOneEventDataService({ _id: event_id });

    const { EventName } = EventData;

    EventBookingData.TotalAmount = 0;
    EventBookingData.TicketQuantity = 0;
    EventBookingData.status = BookingStatus.Cancelled;
    await EventBookingData.save();

    const TicketId = EventBookingData._doc.EventTicket_id;
    const TicketQuantity = EventBookingData._doc.TicketQuantity;

    const existingTicket = await EventTickets.findOne({
      _id: TicketId,
    });

    if (!existingTicket) {
      console.log("Ticket Not Found");
    }

    const updatedBookedQuantity =
      existingTicket.BookedQuantity - TicketQuantity;

    existingTicket.BookedQuantity = updatedBookedQuantity;
    await existingTicket.save();

    await CheckIn.deleteMany({ Booking_id: booking_id });

    sendCancelEventBookingSms(`91${PhoneNumber}`, EventName, booking_id);

    return sendResponse(res, 200, false, "Booking Cancelled successfully");
  } catch (error) {
    console.error("Update Category Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const resendEventTicket = async (req, res) => {
  try {
    console.log("Resend Event Ticket Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let { booking_id } = req.body;

    if (!booking_id) {
      return sendResponse(res, 400, true, "Booking ID is required");
    }

    const EventBookingFilterQuery = {
      Booking_id: booking_id,
    };

    const EventBookingData = await EventBookings.findOne(
      EventBookingFilterQuery
    );

    if (!EventBookingData) {
      return sendResponse(res, 404, true, "No Booking Data found");
    }

    const currentBookingStatus = EventBookingData._doc.status;

    if (currentBookingStatus == BookingStatus.Cancelled) {
      return sendResponse(res, 409, true, "Booking is cancelled");
    }

    // if (isProduction == "true") {
      await sendBookingSmsMailtoUser(booking_id);
    // }

    return sendResponse(res, 200, false, "Tickets resend successfully");
  } catch (error) {
    console.error("Update Category Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

//Promoter Dashboard Bookings Controller Functions

const getPromoterLatestBookings = async (req, res) => {
  try {
    console.log("Get Promoter Latest Bookings by PromoterId API Called");
    console.log("Req Body Parameters:-----> ", req.body);

    const { promoter_id, searchkeyword } = req.body;

    // Validate request body
    const validationResponse = await validatePromoterLatestBookingsbyPromoterId(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const bookingfilter = {
      promoter_id,
      status: BookingStatus.Booked,
    };

    // Add search filter for booking, customer name, and phone number
    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    // Fetch promoter, event, and booking data concurrently
    const [promoter, bookingData] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id }),
      getEventBookingsDataService(bookingfilter),
    ]);

    // Handle missing promoter, event, or booking data
    if (!promoter) {
      console.error(`Promoter with ID ${promoter_id} not found.`);
      return sendResponse(res, 404, true, "Promoter Not Found");
    }

    if (!bookingData || bookingData.length == 0) {
      console.error(`No bookings found.`);
    }

    let EventNamesArray = [];
    let EventCities = [];
    let EventVenue = [];

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventTicket_id, event_id } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        EventNamesArray.push(eventData._doc.EventName);

        let EventCity;
        let VenueName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;

          EventCities.push(EventCity);
          EventVenue.push(VenueName);
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          const EventVenueTobeAnnouncedCity =
            eventData._doc.VenueToBeAnnouncedCity;

          EventCity = eventData._doc.VenueToBeAnnouncedCity;
          EventCities.push(EventVenueTobeAnnouncedCity);
        }

        return {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          WhatsAppNumber: booking.WhatsAppNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketDate: dateTimeData._doc.EventStartDateTime,
          TicketQuantity: booking.TicketQuantity,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          TicketPrice: booking.TicketPrice,
          TotalAmount: booking.TotalAmount,
          FilterationBookingDateTime: booking.FilterationBookingDateTime,
          status: booking.status,
          Remark: booking.PromoterNote,
        };
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    const EventNamesSet = new Set();
    EventNamesArray.forEach((EventNamesData) => {
      EventNamesSet.add(EventNamesData);
    });
    const UniqueEventNamesArray = Array.from(EventNamesSet);

    const EventVenueSet = new Set();
    EventVenue.forEach((EventVenueData) => {
      EventVenueSet.add(EventVenueData);
    });
    const UniqueEventVenuesArray = Array.from(EventVenueSet);

    const EventCitiesSet = new Set();
    EventCities.forEach((EventCitiesData) => {
      EventCitiesSet.add(EventCitiesData);
    });
    const UniqueEventVenueArray = Array.from(EventCitiesSet);

    const responseObj = {
      EventNamesArray: UniqueEventNamesArray,
      BookingData: latestBookingData,
      EventVenue: UniqueEventVenuesArray,
      EventCities: UniqueEventVenueArray,
    };

    return sendResponse(
      res,
      200,
      false,
      "Promoter Latest Bookings fetched successfully",
      responseObj
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventSummaryBookingsDataByPromoterId = async (req, res) => {
  try {
    console.log("Get Event Bookings Summary Data by PromoterId API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventBookingsbyPromoterId(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { promoter_id, event_id } = req.body;

    const [
      isPromoterExists,
      isEventExists,
      EventDateTimeData,
      EventTicketsData,
    ] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id }),
      findOneEventDataService({ _id: event_id }),
      getEventDateTimeDataService({ Event_id: event_id }),
      getEventTicketDataService({ Event_id: event_id }),
    ]);

    if (!isPromoterExists) {
      console.error(`Promoter with ID ${promoter_id} not found.`);
      return sendResponse(res, 404, true, "Promoter Not Found");
    }

    if (!isEventExists) {
      console.error(`Event with ID ${event_id} not found.`);
      return sendResponse(res, 404, true, "Event Not Found");
    }

    const promoterEventTickets = await getEventTicketDataService({
      Event_id: event_id,
    });

    if (!promoterEventTickets.length) {
      console.warn(`No tickets found for event ID ${event_id}.`);
      return sendResponse(res, 409, true, "Event Tickets Not Found");
    }

    const promoterEventTicketsData = await Promise.all(
      promoterEventTickets
        .filter((ticket) => {
          const { Visibility, Promoters } = ticket;
          if (Visibility == TicketVisiblity.All) {
            return true;
          } else if (Visibility == TicketVisiblity.Promoters) {
            return Promoters.some(
              (promoter) => promoter.promoter_id == promoter_id
            );
          }
          return false;
        })
        .map(async (ticket) => {
          const { Name, Price, _id } = ticket;
          const eventTicketType = ticket._doc.TicketType;

          let eventDateTimeData;
          if (
            eventTicketType == TicketType.SingleDay ||
            eventTicketType == TicketType.MultipleDay
          ) {
            const EventDateTime_id = ticket._doc.EventDateTime_id;
            eventDateTimeData = await findOneEventDateTimeDataService({
              _id: EventDateTime_id,
              Event_id: event_id,
            });
          }

          if (eventTicketType == TicketType.SeasonPass) {
            const EventDateTimeData = await getEventDateTimeDataService({
              Event_id: event_id,
            });

            eventDateTimeData = EventDateTimeData[0];
          }

          if (!eventDateTimeData) {
            console.error(
              `Event DateTime with ID ${EventDateTime_id} not found.`
            );
            return null;
          }

          const TotalPromoterBookingForTicket =
            await getEventBookingsDataService({
              promoter_id: promoter_id,
              EventTicket_id: _id,
              status: { $in: [BookingStatus.Booked, BookingStatus.Cancelled] },
            });

          let TotalTicketQuantitySoldbyPromoter = 0;

          if (TotalPromoterBookingForTicket.length > 0) {
            TotalTicketQuantitySoldbyPromoter =
              TotalPromoterBookingForTicket.reduce(
                (total, item) => total + item.TicketQuantity,
                0
              );
          }

          return {
            TicketName: Name,
            Quantity: TotalTicketQuantitySoldbyPromoter,
            TicketPrice: Price,
            TicketDate: eventDateTimeData.EventStartDateTime,
            TotalAmount: TotalTicketQuantitySoldbyPromoter * Price,
          };
        })
    );

    const filteredTicketsData = promoterEventTicketsData.filter(
      (data) => data != null
    );

    const ticketNamesSet = new Set();
    EventTicketsData.forEach((ticket) => {
      ticketNamesSet.add(ticket.Name);
    });
    const TicketNamesArray = Array.from(ticketNamesSet);

    const resObj = {
      TicketsData: filteredTicketsData,
      EventDateTimeData: EventDateTimeData,
      TicketNamesArray: TicketNamesArray,
    };

    return sendResponse(
      res,
      200,
      false,
      "Promoter Summary Bookings fetched successfully",
      resObj
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventSummaryBookingsDatabyFilter = async (req, res) => {
  try {
    console.log(
      "Get Filtered Event Bookings Summary Data by PromoterId API Called"
    );
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventBookingsbyPromoterId(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { promoter_id, event_id, eventDateTime_id, ticketName } = req.body;

    const [isPromoterExists, isEventExists] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id }),
      findOneEventDataService({ _id: event_id }),
    ]);

    if (!isPromoterExists) {
      console.error(`Promoter with ID ${promoter_id} not found.`);
      return sendResponse(res, 404, true, "Promoter Not Found");
    }

    if (!isEventExists) {
      console.error(`Event with ID ${event_id} not found.`);
      return sendResponse(res, 404, true, "Event Not Found");
    }

    const eventTicketsFilterQuery = { Event_id: event_id };

    if (eventDateTime_id) {
      eventTicketsFilterQuery.EventDateTime_id = eventDateTime_id;
    }

    if (ticketName) {
      eventTicketsFilterQuery.Name = ticketName;
    }

    const promoterEventTickets = await getEventTicketDataService(
      eventTicketsFilterQuery
    );

    if (!promoterEventTickets.length) {
      console.warn(`No tickets found for event ID ${event_id}.`);
      return sendResponse(res, 409, true, "Event Tickets Not Found");
    }

    const promoterEventTicketsData = await Promise.all(
      promoterEventTickets
        .filter((ticket) => {
          const { Visibility, Promoters } = ticket;
          if (Visibility == TicketVisiblity.All) {
            return true;
          } else if (Visibility == TicketVisiblity.Promoters) {
            return Promoters.some(
              (promoter) => promoter.promoter_id == promoter_id
            );
          }
          return false;
        })
        .map(async (ticket) => {
          const { Name, Price, _id } = ticket;

          const eventTicketType = ticket._doc.TicketType;

          let eventDateTimeData;
          if (
            eventTicketType == TicketType.SingleDay ||
            eventTicketType == TicketType.MultipleDay
          ) {
            const EventDateTime_id = ticket._doc.EventDateTime_id;
            eventDateTimeData = await findOneEventDateTimeDataService({
              _id: EventDateTime_id,
              Event_id: event_id,
            });
          }

          if (eventTicketType == TicketType.SeasonPass) {
            const EventDateTimeData = await getEventDateTimeDataService({
              Event_id: event_id,
            });

            eventDateTimeData = EventDateTimeData[0];
          }

          if (!eventDateTimeData) {
            console.error(
              `Event DateTime with ID ${EventDateTime_id} not found.`
            );
            return null;
          }

          const TotalPromoterBookingForTicket =
            await getEventBookingsDataService({
              promoter_id: promoter_id,
              EventTicket_id: _id,
              status: { $in: [BookingStatus.Booked, BookingStatus.Cancelled] },
            });

          let TotalTicketQuantitySoldbyPromoter = 0;

          if (TotalPromoterBookingForTicket.length > 0) {
            TotalTicketQuantitySoldbyPromoter =
              TotalPromoterBookingForTicket.reduce(
                (total, item) => total + item.TicketQuantity,
                0
              );
          }

          return {
            TicketName: Name,
            Quantity: TotalTicketQuantitySoldbyPromoter,
            TicketPrice: Price,
            TicketDate: eventDateTimeData.EventStartDateTime,
            TotalAmount: TotalTicketQuantitySoldbyPromoter * Price,
          };
        })
    );

    const filteredTicketsData = promoterEventTicketsData.filter(
      (data) => data !== null
    );

    return sendResponse(
      res,
      200,
      false,
      "Promoter Summary Bookings fetched successfully",
      filteredTicketsData
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventSummaryExcelReportbyFilter = async (req, res) => {
  try {
    console.log(
      "Get Filtered Event Bookings Summary Data by PromoterId API Called"
    );
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventBookingsbyPromoterId(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { promoter_id, event_id, eventDateTime_id, ticketName } = req.body;

    const [isPromoterExists, isEventExists] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id }),
      findOneEventDataService({ _id: event_id }),
    ]);

    if (!isPromoterExists) {
      console.error(`Promoter with ID ${promoter_id} not found.`);
      return sendResponse(res, 404, true, "Promoter Not Found");
    }

    if (!isEventExists) {
      console.error(`Event with ID ${event_id} not found.`);
      return sendResponse(res, 404, true, "Event Not Found");
    }

    const eventTicketsFilterQuery = { Event_id: event_id };

    if (eventDateTime_id) {
      eventTicketsFilterQuery.EventDateTime_id = eventDateTime_id;
    }

    if (ticketName) {
      eventTicketsFilterQuery.Name = ticketName;
    }

    const promoterEventTickets = await getEventTicketDataService(
      eventTicketsFilterQuery
    );

    if (!promoterEventTickets.length) {
      console.warn(`No tickets found for event ID ${event_id}.`);
      return sendResponse(res, 409, true, "Event Tickets Not Found");
    }

    const promoterEventTicketsData = await Promise.all(
      promoterEventTickets
        .filter((ticket) => {
          const { Visibility, Promoters } = ticket;
          if (Visibility == TicketVisiblity.All) {
            return true;
          } else if (Visibility == TicketVisiblity.Promoters) {
            return Promoters.some(
              (promoter) => promoter.promoter_id == promoter_id
            );
          }
          return false;
        })
        .map(async (ticket) => {
          const { Name, Price, _id } = ticket;

          const eventTicketType = ticket._doc.TicketType;

          let eventDateTimeData;
          if (
            eventTicketType == TicketType.SingleDay ||
            eventTicketType == TicketType.MultipleDay
          ) {
            const EventDateTime_id = ticket._doc.EventDateTime_id;
            eventDateTimeData = await findOneEventDateTimeDataService({
              _id: EventDateTime_id,
              Event_id: event_id,
            });
          }

          if (eventTicketType == TicketType.SeasonPass) {
            const EventDateTimeData = await getEventDateTimeDataService({
              Event_id: event_id,
            });

            eventDateTimeData = EventDateTimeData[0];
          }

          if (!eventDateTimeData) {
            console.error(
              `Event DateTime with ID ${EventDateTime_id} not found.`
            );
            return null;
          }

          const TotalPromoterBookingForTicket =
            await getEventBookingsDataService({
              promoter_id: promoter_id,
              EventTicket_id: _id,
              status: { $in: [BookingStatus.Booked, BookingStatus.Cancelled] },
            });

          let TotalTicketQuantitySoldbyPromoter = 0;

          if (TotalPromoterBookingForTicket.length > 0) {
            TotalTicketQuantitySoldbyPromoter =
              TotalPromoterBookingForTicket.reduce(
                (total, item) => total + item.TicketQuantity,
                0
              );
          }

          return {
            TicketName: Name,
            Quantity: TotalTicketQuantitySoldbyPromoter,
            TicketPrice: Price,
            TicketDate: eventDateTimeData.EventStartDateTime,
            TotalAmount: TotalTicketQuantitySoldbyPromoter * Price,
          };
        })
    );

    const filteredTicketsData = promoterEventTicketsData.filter(
      (data) => data !== null
    );

    // Create an Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Filtered Bookings Report");

    // Add headers to the worksheet
    worksheet.columns = [
      { header: "Ticket Name", key: "TicketName", width: 25 },
      { header: "Quantity Sold", key: "Quantity", width: 15 },
      { header: "Ticket Price", key: "TicketPrice", width: 15 },
      { header: "Ticket Date", key: "TicketDate", width: 25 },
      { header: "Total Amount", key: "TotalAmount", width: 20 },
    ];

    // Add filtered tickets data to the worksheet
    filteredTicketsData.forEach((ticket) => {
      worksheet.addRow(ticket);
    });

    // Set the response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=filtered_bookings_report.xlsx"
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventTransactionBookingsDataByPromoterId = async (req, res) => {
  try {
    console.log("Get Event Bookings Transaction Data by PromoterId API Called");
    console.log("Req Body Parameters:-----> ", req.body);

    // Use the helper function to fetch and format booking data
    const { error, message, formattedBookingData } =
      await fetchAndFormatPromoterTransactionBookingData(req);

    if (error) {
      return sendResponse(res, 404, true, message);
    }

    // Send the formatted booking data as JSON response
    return sendResponse(
      res,
      200,
      false,
      "Promoter Transactional Bookings fetched successfully",
      formattedBookingData
    );
  } catch (error) {
    // Handle errors
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventTransactionExcelReportByPromoterId = async (req, res) => {
  try {
    console.log(
      "Download Event Bookings Transaction Data by PromoterId API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    // Use the helper function to fetch and format booking data
    const { error, message, formattedBookingData } =
      await fetchAndFormatPromoterTransactionBookingData(req);

    if (error) {
      return sendResponse(res, 404, true, message);
    }

    // Create an Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bookings Report");

    // Add headers to the worksheet
    worksheet.columns = [
      { header: "Customer Name", key: "CustomerName", width: 20 },
      { header: "Booking ID", key: "Booking_id", width: 20 },
      { header: "Phone Number", key: "PhoneNumber", width: 15 },
      { header: "WhatsApp Number", key: "WhatsAppNumber", width: 20 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Booking DateTime", key: "BookingDateTime", width: 25 },
      { header: "Event Name", key: "EventName", width: 30 },
      { header: "Ticket Date", key: "TicketDate", width: 20 },
      { header: "Ticket Quantity", key: "TicketQuantity", width: 20 },
      { header: "Ticket Name", key: "TicketName", width: 25 },
      { header: "Ticket Type", key: "EventTicketType", width: 20 },
      { header: "Ticket Price", key: "TicketPrice", width: 15 },
      { header: "Total Amount", key: "TotalAmount", width: 15 },
      { header: "Remark", key: "Remark", width: 15 },
    ];

    // Add formatted booking data to the worksheet
    formattedBookingData.forEach((booking) => {
      worksheet.addRow(booking);
    });

    // Set response headers to indicate file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=PromoterTransactionBookings.xlsx"
    );

    // Send the workbook as a downloadable file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    // Handle errors
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

//SuperAdmin & Organizer Dashboard Bookings Controller Functions

const getPromoterLatestBookingsForSuperAdminOrganizer = async (req, res) => {
  try {
    console.log(
      "Get Promoter Latest Bookings for Organizer SuperAdmin API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      promoter_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate request body
    const validationResponse =
      await validatePromoterLatestBookingsForSuperAdminOrganizer(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      (bookingfilter.BookingSource = TicketBookingSource.Promoter),
        (bookingfilter.status = {
          $in: [BookingStatus.Booked, BookingStatus.Cancelled],
        });
    } else {
      (bookingfilter.BookingSource = TicketBookingSource.Promoter),
        (bookingfilter.status = BookingStatus.Booked);
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (promoter_id) {
      bookingfilter.promoter_id = promoter_id;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const bookingData = await getPaginatedEventBookingsData(
      bookingfilter,
      limit,
      skip
    );

    if (!bookingData || bookingData.length == 0) {
      return sendResponse(res, 404, true, "No Bookings found");
    }

    const totalBookings = await countEventBookings(bookingfilter);

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventDateTime_id, EventTicket_id, event_id } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;
        let PromoterName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        if (booking.BookingSource == TicketBookingSource.Promoter) {
          const PromoterData = await findOnePromoterDataService({
            _id: booking.promoter_id,
          });
          PromoterName = PromoterData._doc.Username;
        }
        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        return {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          WhatsAppNumber: booking.WhatsAppNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketDate: dateTimeData._doc.EventStartDateTime,
          TicketQuantity: booking.TicketQuantity,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          TicketPrice: booking.TicketPrice,
          TotalAmount: booking.TotalAmount,
          PromoterName: PromoterName,
          FilterationBookingDateTime: booking.FilterationBookingDateTime,
          status: booking.status,
          Remark: booking?._doc.PromoterNote,
        };
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    if (event_id) {
      const filterQuery = {
        BookingSource: TicketBookingSource.Promoter,
        status: BookingStatus.Booked,
        event_id: event_id,
      };

      const TotalOnlineBookingsforEvent = await getEventBookingsDataService(
        bookingfilter
      );

      let totalCheckInCount = 0;
      let totalQuantity = 0;
      let totalPrice = 0;

      // Use for...of to sequentially process each booking
      for (const booking of TotalOnlineBookingsforEvent) {
        // Calculate CheckInCount
        const TotalCheckInsForTickets = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });
        totalCheckInCount += TotalCheckInsForTickets.length;

        // Calculate total quantity and price
        totalQuantity += booking.TicketQuantity;
        totalPrice += booking.TicketQuantity * booking.TicketPrice;
      }

      return sendResponse(
        res,
        200,
        false,
        "Promoters Bookings fetched successfully",
        {
          totalPages: Math.ceil(totalBookings / limit),
          currentPage: page,
          totalBookings: totalBookings,
          latestBookingData: latestBookingData,
          totalCheckInCount,
          totalQuantity,
          totalPrice,
        }
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Promoters Bookings fetched successfully",
      {
        totalPages: Math.ceil(totalBookings / limit),
        currentPage: page,
        totalBookings: totalBookings,
        latestBookingData: latestBookingData,
      }
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const downloadPromoterLatestBookingsForSuperAdminOrganizer = async (
  req,
  res
) => {
  try {
    console.log(
      "Download Promoter Latest Bookings for Organizer SuperAdmin API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      promoter_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      (bookingfilter.BookingSource = TicketBookingSource.Promoter),
        (bookingfilter.status = {
          $in: [BookingStatus.Booked, BookingStatus.Cancelled],
        });
    } else {
      (bookingfilter.BookingSource = TicketBookingSource.Promoter),
        (bookingfilter.status = BookingStatus.Booked);
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (promoter_id) {
      bookingfilter.promoter_id = promoter_id;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch superadmin, event, and booking data concurrently
    const [bookingData] = await Promise.all([
      getEventBookingsDataService(bookingfilter),
    ]);

    if (!bookingData || bookingData.length == 0) {
      console.error(`No bookings found.`);
    }

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventDateTime_id, EventTicket_id, event_id } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;
        let PromoterName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        if (booking.BookingSource == TicketBookingSource.Promoter) {
          const PromoterData = await findOnePromoterDataService({
            _id: booking.promoter_id,
          });
          PromoterName = PromoterData._doc.Username;
        }

        return {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          WhatsAppNumber: booking.WhatsAppNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketDate: dateTimeData._doc.EventStartDateTime,
          TicketQuantity: booking.TicketQuantity,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          TicketPrice: booking.TicketPrice,
          TotalAmount: booking.TotalAmount,
          PromoterName: PromoterName,
          FilterationBookingDateTime: booking.FilterationBookingDateTime,
          status: booking.status,
          Remark: booking?._doc.PromoterNote,
        };
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    // Generate and send Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Promoter Latest Bookings");

    worksheet.columns = [
      { header: "Customer Name", key: "CustomerName" },
      { header: "Booking ID", key: "Booking_id" },
      { header: "Phone Number", key: "PhoneNumber" },
      { header: "WhatsApp Number", key: "WhatsAppNumber" },
      { header: "Email", key: "Email" },
      { header: "Booking Date Time", key: "BookingDateTime" },
      { header: "CheckIn", key: "CheckIn" },
      { header: "Scanned By", key: "ScannerUserName" },
      { header: "Event Name", key: "EventName" },
      { header: "Event City Name", key: "EventCityName" },
      { header: "Event Venue Name", key: "EventVenueName" },
      { header: "Ticket Date", key: "TicketDate" },
      { header: "Ticket Quantity", key: "TicketQuantity" },
      { header: "Ticket Name", key: "TicketName" },
      { header: "Event Ticket Type", key: "EventTicketType" },
      { header: "Ticket Price", key: "TicketPrice" },
      { header: "Total Amount", key: "TotalAmount" },
      { header: "Promoter Name", key: "PromoterName" },
      { header: "Remark", key: "Remark" },
    ];

    // Add rows to the worksheet
    latestBookingData.forEach((data) => {
      worksheet.addRow(data);
    });

    // Generate Excel file and send as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=PromoterBookings.xlsx"
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getOnlineLatestBookingsForSuperAdminOrganizer = async (req, res) => {
  try {
    console.log(
      "Get Online Latest Bookings for Organizer SuperAdmin API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate request body
    const validationResponse =
      await validateOnlineLatestBookingsForSuperAdminOrganizer(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      (bookingfilter.BookingSource = TicketBookingSource.Website),
        (bookingfilter.status = {
          $in: [BookingStatus.Booked, BookingStatus.Cancelled],
        });
    } else {
      (bookingfilter.BookingSource = TicketBookingSource.Website),
        (bookingfilter.status = BookingStatus.Booked);
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const bookingData = await getPaginatedEventBookingsData(
      bookingfilter,
      limit,
      skip
    );

    if (!bookingData || bookingData.length == 0) {
      return sendResponse(res, 404, true, "No Bookings found");
    }

    const totalBookings = await countEventBookings(bookingfilter);

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventTicket_id, event_id } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        const Promocode_id = booking._doc.Promocode_id;

        let PromocodeName;
        let PromocodeValue;

        if (Promocode_id) {
          const PromocodeData = await findOnePromocodeDataService({
            _id: Promocode_id,
          });

          PromocodeName = PromocodeData._doc.PromoCodeName;

          PromocodeValue = booking._doc.PromocodeDiscountAmount;
        }

        return {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          TicketDate: dateTimeData._doc.EventStartDateTime,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketQuantity: booking.TicketQuantity,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          Transaction_id: booking?.Transaction_id,
          TicketPrice: booking.TicketPrice,
          PromocodeName: PromocodeName,
          PromocodeValue: PromocodeValue,
          convenienceFee: booking._doc.ConvenienceFee,
          GST: booking._doc.GST,
          TotalAmount: booking.TotalAmount,
          status: booking.status,
        };
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    if (event_id) {
      const filterQuery = {
        BookingSource: TicketBookingSource.Website,
        status: BookingStatus.Booked,
        event_id: event_id,
      };

      const TotalOnlineBookingsforEvent = await getEventBookingsDataService(
        bookingfilter
      );

      // let CheckInCount = 0;
      // let totalQuantity = 0;
      // let totalPrice = 0;

      let totalCheckInCount = 0;
      let totalQuantity = 0;
      let totalPrice = 0;

      // Use for...of to sequentially process each booking
      for (const booking of TotalOnlineBookingsforEvent) {
        // Calculate CheckInCount
        const TotalCheckInsForTickets = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });
        totalCheckInCount += TotalCheckInsForTickets.length;

        // Calculate total quantity and price
        totalQuantity += booking.TicketQuantity;
        totalPrice += booking.TicketQuantity * booking.TicketPrice;
      }

      return sendResponse(
        res,
        200,
        false,
        "Online Bookings fetched successfully",
        {
          totalPages: Math.ceil(totalBookings / limit),
          currentPage: page,
          totalBookings: totalBookings,
          latestBookingData: latestBookingData,
          totalCheckInCount,
          totalQuantity,
          totalPrice,
        }
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Online Bookings fetched successfully",
      {
        totalPages: Math.ceil(totalBookings / limit),
        currentPage: page,
        totalBookings: totalBookings,
        latestBookingData: latestBookingData,
      }
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const downloadExcelOnlineLatestBookingsForSuperAdminOrganizer = async (
  req,
  res
) => {
  try {
    console.log(
      "Dowload Online Latest Bookings for Organizer SuperAdmin API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      (bookingfilter.BookingSource = TicketBookingSource.Website),
        (bookingfilter.status = {
          $in: [BookingStatus.Booked, BookingStatus.Cancelled],
        });
    } else {
      (bookingfilter.BookingSource = TicketBookingSource.Website),
        (bookingfilter.status = BookingStatus.Booked);
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch  event, and booking data concurrently
    const [bookingData] = await Promise.all([
      getEventBookingsDataService(bookingfilter),
    ]);

    if (!bookingData || bookingData.length == 0) {
      return sendResponse(res, 404, true, "No Bookings found");
    }

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventTicket_id, event_id } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        const Promocode_id = booking._doc.Promocode_id;

        let PromocodeName;
        let PromocodeValue;

        if (Promocode_id) {
          const PromocodeData = await findOnePromocodeDataService({
            _id: Promocode_id,
          });

          PromocodeName = PromocodeData._doc.PromoCodeName;

          PromocodeValue = booking._doc.PromocodeDiscountAmount;
        }

        const eventDate = new Date(dateTimeData._doc.EventStartDateTime);
        const EventDate = eventDate.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          TicketDate: EventDate,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketQuantity: booking.TicketQuantity,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          Transaction_id: booking?.Transaction_id,
          TicketPrice: booking.TicketPrice,
          PromocodeName: PromocodeName,
          PromocodeValue: PromocodeValue,
          convenienceFee: booking._doc.ConvenienceFee,
          GST: booking._doc.GST,
          TotalAmount: booking.TotalAmount,
          status: booking.status,
        };
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    // Generate and send Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Latest Online Bookings");

    worksheet.columns = [
      { header: "Customer Name", key: "CustomerName" },
      { header: "Booking ID", key: "Booking_id" },
      { header: "Phone Number", key: "PhoneNumber" },
      { header: "Email", key: "Email" },
      { header: "Booking Date Time", key: "BookingDateTime" },
      { header: "Event Name", key: "EventName" },
      { header: "Ticket Date", key: "TicketDate" },
      { header: "Event City Name", key: "EventCityName" },
      { header: "Event Venue Name", key: "EventVenueName" },
      { header: "Ticket Quantity", key: "TicketQuantity" },
      { header: "Check In", key: "CheckIn" },
      { header: "Scanned By", key: "ScannerUserName" },
      { header: "Ticket Name", key: "TicketName" },
      { header: "Event Ticket Type", key: "EventTicketType" },
      { header: "Transaction Id", key: "Transaction_id" },
      { header: "Ticket Price", key: "TicketPrice" },
      { header: "Promocode Name", key: "PromocodeName" },
      { header: "Promocode Value", key: "PromocodeValue" },
      { header: "Convenience Fee", key: "convenienceFee" },
      { header: "GST", key: "GST" },
      { header: "Total Amount", key: "TotalAmount" },
    ];

    // Add rows to the worksheet
    latestBookingData.forEach((data) => {
      worksheet.addRow(data);
    });

    // Generate Excel file and send as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=PromoterBookings.xlsx"
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllLatestBookingsForSuperAdminOrganizer = async (req, res) => {
  try {
    console.log("Get All Latest Bookings for Organizer SuperAdmin API Called");
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      promoter_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate request body
    const validationResponse =
      await validateAllLatestBookingsForSuperAdminOrganizer(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      bookingfilter.status = {
        $in: [BookingStatus.Booked, BookingStatus.Cancelled],
      };
    } else {
      bookingfilter.status = BookingStatus.Booked;
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (promoter_id) {
      bookingfilter.promoter_id = promoter_id;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const bookingData = await getPaginatedEventBookingsData(
      bookingfilter,
      limit,
      skip
    );

    if (!bookingData || bookingData.length == 0) {
      return sendResponse(res, 404, true, "No Bookings found");
    }

    const totalBookings = await countEventBookings(bookingfilter);

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventTicket_id, event_id, BookingSource } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        const Promocode_id = booking._doc.Promocode_id;

        let PromocodeName;
        let PromocodeValue;

        if (Promocode_id) {
          const PromocodeData = await findOnePromocodeDataService({
            _id: Promocode_id,
          });

          PromocodeName = PromocodeData._doc.PromoCodeName;

          PromocodeValue = booking._doc.PromocodeDiscountAmount;
        }

        const EventTicketDate = FormatEventDateTimeForWebsite(
          dateTimeData._doc.EventStartDateTime
        );

        const BookingDetailsObj = {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          TicketDate: EventTicketDate.date,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketQuantity: booking.TicketQuantity,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          Transaction_id: booking?.Transaction_id,
          TicketPrice: booking.TicketPrice,
          PromocodeName: PromocodeName,
          PromocodeValue: PromocodeValue,
          convenienceFee: booking._doc.ConvenienceFee,
          GST: booking._doc.GST,
          TotalAmount: booking.TotalAmount,
          status: booking.status,
          Remark: booking?._doc.PromoterNote,
        };

        if (BookingSource == TicketBookingSource.Promoter) {
          BookingDetailsObj.BookingSource = "Promoter";
          const PromoterData = await findOnePromoterDataService({
            _id: booking.promoter_id,
          });
          BookingDetailsObj.PromoterName = PromoterData._doc.Username;
        } else {
          BookingDetailsObj.BookingSource = "Online";
          BookingDetailsObj.PromoterName = "-";
        }

        return BookingDetailsObj;
      })
    );

    return sendResponse(res, 200, false, "All Bookings fetched successfully", {
      totalPages: Math.ceil(totalBookings / limit),
      currentPage: page,
      totalBookings: totalBookings,
      latestBookingData: formattedBookingData,
    });
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const downloadExcelAllLatestBookingsForSuperAdminOrganizer = async (
  req,
  res
) => {
  try {
    console.log(
      "Dowload All Latest Bookings for Organizer SuperAdmin API Called"
    );
    console.log("Req Body Parameters:-----> ", req.body);

    const {
      searchkeyword,
      cityname,
      venue_id,
      organizer_id,
      promoter_id,
      event_id,
      startDate,
      endDate,
      AdminRole,
      user_id,
    } = req.body;

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const bookingfilter = {};

    if (AdminRole == AdminRoles.SuperAdmin) {
      bookingfilter.status = {
        $in: [BookingStatus.Booked, BookingStatus.Cancelled],
      };
    } else {
      bookingfilter.status = BookingStatus.Booked;
    }

    if (searchkeyword) {
      const searchRegex = new RegExp(`^${searchkeyword}`, "i");
      const orConditions = [
        { Booking_id: searchRegex },
        { CustomerName: searchRegex },
      ];
      
      // Check if searchkeyword is a valid number for PhoneNumber search
      const searchNumber = parseInt(searchkeyword);
      if (!isNaN(searchNumber)) {
        orConditions.push({ PhoneNumber: searchNumber });
      }
      
      bookingfilter.$or = orConditions;
    }

    if (promoter_id) {
      bookingfilter.promoter_id = promoter_id;
    }

    if (event_id) {
      bookingfilter.event_id = event_id;
    }

    if (organizer_id) {
      const eventFilterQuery = {
        $or: [
          { "EventOrganizers.organizer_id": organizer_id },
          { createduser_id: organizer_id },
        ],
        EventStatus: { $in: [EventStatus.Completed, EventStatus.Published] },
      };

      const OrganizerEvents = await getEventDataService(eventFilterQuery);

      const OrganizerEventIds = [];

      if (OrganizerEvents.length > 0) {
        OrganizerEvents.map((eventsData) => {
          OrganizerEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: OrganizerEventIds };
    }

    if (venue_id) {
      const venueEventsFilterQuery = {
        venue_id: venue_id,
      };

      const VenueEvents = await getEventDataService(venueEventsFilterQuery);

      const VenueEventIds = [];

      if (VenueEvents.length > 0) {
        VenueEvents.map((eventsData) => {
          VenueEventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: VenueEventIds };
    }

    if (cityname) {
      const cityvenueFilterQuery = {
        City: cityname,
      };

      const CityVenues = await getVenueDataService(cityvenueFilterQuery);

      const VenueIds = [];

      if (CityVenues.length > 0) {
        CityVenues.map((venueData) => {
          VenueIds.push(venueData._doc._id);
        });
      }

      const eventFilterQuery = {
        $or: [
          { venue_id: { $in: VenueIds } },
          { VenueToBeAnnouncedState: cityname },
        ],
      };

      const EventsWithVenueIdsCityName = await getEventDataService(
        eventFilterQuery
      );

      const EventIds = [];

      if (EventsWithVenueIdsCityName.length > 0) {
        EventsWithVenueIdsCityName.map((eventsData) => {
          EventIds.push(eventsData._doc._id);
        });
      }

      bookingfilter.event_id = { $in: EventIds };
    }

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 409, true, "End date required");
      }

      bookingfilter.FilterationBookingDateTime = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch  event, and booking data concurrently
    const [bookingData] = await Promise.all([
      getEventBookingsDataService(bookingfilter),
    ]);

    if (!bookingData || bookingData.length == 0) {
      return sendResponse(res, 404, true, "No Bookings found");
    }

    // Format booking data
    const formattedBookingData = await Promise.all(
      bookingData.map(async (booking) => {
        const { EventTicket_id, event_id, BookingSource } = booking;

        const EventTicketType = booking._doc.EventTicketType;

        let dateTimeData;
        let BookingTicketType;

        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          const EventDateTime_id = booking._doc.EventDateTime_id;

          dateTimeData = await findOneEventDateTimeDataService({
            _id: EventDateTime_id,
          });

          BookingTicketType = "Single Day";
        } else {
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: event_id,
          });

          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);

          dateTimeData = FirstDateTime[0];
          BookingTicketType = "Season Pass";
        }

        // Fetch related date-time and ticket data concurrently
        const [ticketData, eventData] = await Promise.all([
          findOneEventTicketDataService({
            _id: EventTicket_id,
            Event_id: event_id,
          }),
          findOneEventDataService({
            _id: event_id,
          }),
        ]);

        const EventVenueFlag = eventData._doc.VenueEventFlag;
        const EventVenueTobeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;

        let EventCity;
        let VenueName;

        if (EventVenueFlag == IsVenueAvailable.Yes) {
          const eventvenue_id = eventData._doc.venue_id;

          const VenueData = await findOneVenueDataService({
            _id: eventvenue_id,
          });

          EventCity = VenueData._doc.City;
          VenueName = VenueData._doc.Name;
        }

        if (EventVenueTobeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        const CheckInData = await getCheckInDataService({
          Booking_id: booking._doc.Booking_id,
        });

        let scannerUserName;

        if (CheckInData.length > 0) {
          const scanneruser_id = CheckInData[0]._doc.Scanneruser_id;

          const ScannerUserDetails = await findOneScannerUserDataService({
            _id: scanneruser_id,
          });
          scannerUserName = ScannerUserDetails._doc.Username;
        }

        const Promocode_id = booking._doc.Promocode_id;

        let PromocodeName;
        let PromocodeValue;

        if (Promocode_id) {
          const PromocodeData = await findOnePromocodeDataService({
            _id: Promocode_id,
          });

          PromocodeName = PromocodeData._doc.PromoCodeName;

          PromocodeValue = booking._doc.PromocodeDiscountAmount;
        }

        const eventDate = new Date(dateTimeData._doc.EventStartDateTime);
        const EventDate = eventDate.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const BookingDetailsObj = {
          CustomerName: booking.CustomerName,
          Booking_id: booking.Booking_id,
          PhoneNumber: booking.PhoneNumber,
          Email: booking.Email,
          BookingDateTime: booking.BookingDateTime,
          EventName: eventData._doc.EventName,
          TicketDate: EventDate,
          EventCityName: EventCity,
          EventVenueName: VenueName,
          TicketQuantity: booking.TicketQuantity,
          CheckIn: CheckInData.length,
          ScannerUserName: scannerUserName,
          TicketName: ticketData._doc.Name,
          EventTicketType: BookingTicketType,
          Transaction_id: booking?.Transaction_id,
          TicketPrice: booking.TicketPrice,
          PromocodeName: PromocodeName,
          PromocodeValue: PromocodeValue,
          convenienceFee: booking._doc.ConvenienceFee,
          GST: booking._doc.GST,
          TotalAmount: booking.TotalAmount,
          status: booking.status,
          Remark: booking?._doc.PromoterNote,
        };

        if (BookingSource == TicketBookingSource.Promoter) {
          BookingDetailsObj.BookingSource = "Promoter";
          const PromoterData = await findOnePromoterDataService({
            _id: booking.promoter_id,
          });
          BookingDetailsObj.PromoterName = PromoterData._doc.Username;
        } else {
          BookingDetailsObj.BookingSource = "Online";
          BookingDetailsObj.PromoterName = "-";
        }

        return BookingDetailsObj;
      })
    );

    const latestBookingData = formattedBookingData.reverse();

    // Generate and send Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Latest All Bookings");

    worksheet.columns = [
      { header: "Customer Name", key: "CustomerName" },
      { header: "Booking ID", key: "Booking_id" },
      { header: "Phone Number", key: "PhoneNumber" },
      { header: "Email", key: "Email" },
      { header: "Booking Date Time", key: "BookingDateTime" },
      { header: "Booking Source", key: "BookingSource" },
      { header: "Promoter Name", key: "PromoterName" },
      { header: "Event Name", key: "EventName" },
      { header: "Ticket Date", key: "TicketDate" },
      { header: "Event City Name", key: "EventCityName" },
      { header: "Event Venue Name", key: "EventVenueName" },
      { header: "Ticket Quantity", key: "TicketQuantity" },
      { header: "Check In", key: "CheckIn" },
      { header: "Scanned By", key: "ScannerUserName" },
      { header: "Ticket Name", key: "TicketName" },
      { header: "Event Ticket Type", key: "EventTicketType" },
      { header: "Transaction Id", key: "Transaction_id" },
      { header: "Ticket Price", key: "TicketPrice" },
      { header: "Promocode Name", key: "PromocodeName" },
      { header: "Promocode Value", key: "PromocodeValue" },
      { header: "Convenience Fee", key: "convenienceFee" },
      { header: "GST", key: "GST" },
      { header: "Total Amount", key: "TotalAmount" },
      { header: "Remark", key: "Remark" },
    ];

    // Add rows to the worksheet
    latestBookingData.forEach((data) => {
      worksheet.addRow(data);
    });

    // Generate Excel file and send as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=PromoterBookings.xlsx"
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", {
      errorMessage: error.message,
      stack: error.stack,
      requestData: req.body,
    });
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

//SuperAdmin & Organizer Dashboard Events Bookings Controller Functions

const getEventSummaryBookingsDataforSuperAdminOrganizer = async (req, res) => {
  try {
    console.log("Get Event Bookings Summary Data API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { AdminRole, user_id, event_id } = req.body;

    await validateUserAndEvent(AdminRole, user_id, event_id);

    const eventTicketsData = await getEventTicketDataService({
      Event_id: event_id,
    });

    const processedTicketsData = await processTicketsData(
      eventTicketsData,
      event_id
    );

    let totalCheckInCount = 0;
    let totalQuantity = 0;
    let totalPrice = 0;

    for (const data of processedTicketsData) {
      totalCheckInCount += data.CheckIn;
      totalQuantity += data.Quantity;
      totalPrice += data.TotalAmount;
    }

    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: event_id,
    });

    const ticketNamesSet = new Set(
      eventTicketsData.map((ticket) => ticket.Name)
    );
    const TicketNamesArray = Array.from(ticketNamesSet);

    return sendResponse(
      res,
      200,
      false,
      "Summary Bookings fetched successfully",
      {
        TicketsData: processedTicketsData,
        EventDateTimeData: eventDateTimeData,
        TicketNamesArray,
        totalCheckInCount,
        totalQuantity,
        totalPrice,
      }
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", error.message);
    return sendResponse(
      res,
      500,
      true,
      error.message || "Internal Server Error"
    );
  }
};

const getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer = async (
  req,
  res
) => {
  try {
    console.log("Get Filtered Event Bookings Summary API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { AdminRole, user_id, event_id, eventDateTime_id, ticketName } =
      req.body;

    await validateUserAndEvent(AdminRole, user_id, event_id);

    const filterQuery = { Event_id: event_id };
    if (eventDateTime_id) filterQuery.EventDateTime_id = eventDateTime_id;
    if (ticketName) filterQuery.Name = ticketName;

    const eventTicketsData = await getEventTicketDataService(filterQuery);
    if (!eventTicketsData.length) {
      return sendResponse(res, 409, true, "Event Tickets Not Found");
    }

    const processedTicketsData = await processTicketsData(
      eventTicketsData,
      event_id
    );

    let totalCheckInCount = 0;
    let totalQuantity = 0;
    let totalPrice = 0;

    for (const data of processedTicketsData) {
      totalCheckInCount += data.CheckIn;
      totalQuantity += data.Quantity;
      totalPrice += data.TotalAmount;
    }

    return sendResponse(
      res,
      200,
      false,
      "Filtered Bookings fetched successfully",
      {
        totalCheckInCount,
        totalQuantity,
        totalPrice,
        processedTicketsData,
      }
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", error.message);
    return sendResponse(
      res,
      500,
      true,
      error.message || "Internal Server Error"
    );
  }
};

const getEventSummaryExcelReportbyFilterforSuperAdminOrganizer = async (
  req,
  res
) => {
  try {
    console.log("Get Filtered Event Bookings Summary Excel Report API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { AdminRole, user_id, event_id, eventDateTime_id, ticketName } =
      req.body;

    await validateUserAndEvent(AdminRole, user_id, event_id);

    const filterQuery = { Event_id: event_id };
    if (eventDateTime_id) filterQuery.EventDateTime_id = eventDateTime_id;
    if (ticketName) filterQuery.Name = ticketName;

    const eventTicketsData = await getEventTicketDataService(filterQuery);
    if (!eventTicketsData.length) {
      return sendResponse(res, 409, true, "Event Tickets Not Found");
    }

    const processedTicketsData = await processTicketsData(
      eventTicketsData,
      event_id
    );

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Summary Bookings Report");

    worksheet.columns = [
      { header: "Ticket Name", key: "TicketName", width: 25 },
      { header: "Quantity Sold", key: "Quantity", width: 15 },
      { header: "Ticket Price", key: "TicketPrice", width: 15 },
      { header: "Ticket Date", key: "TicketDate", width: 25 },
      { header: "Total Amount", key: "TotalAmount", width: 20 },
    ];

    processedTicketsData.forEach((ticket) => {
      worksheet.addRow(ticket);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=filtered_bookings_report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", error.message);
    return sendResponse(
      res,
      500,
      true,
      error.message || "Internal Server Error"
    );
  }
};

export {
  BookEventTicketsByPromoter,
  cancelEventTicket,
  resendEventTicket,

  //Promoter Dashboard Bookings Controller Functions
  getPromoterLatestBookings,
  getEventSummaryBookingsDataByPromoterId,
  getEventSummaryBookingsDatabyFilter,
  getEventSummaryExcelReportbyFilter,
  getEventTransactionBookingsDataByPromoterId,
  getEventTransactionExcelReportByPromoterId,

  //SuperAdmin & Organizer Dashboard Bookings Controller Functions
  getPromoterLatestBookingsForSuperAdminOrganizer,
  downloadPromoterLatestBookingsForSuperAdminOrganizer,
  getOnlineLatestBookingsForSuperAdminOrganizer,
  downloadExcelOnlineLatestBookingsForSuperAdminOrganizer,
  getAllLatestBookingsForSuperAdminOrganizer,
  downloadExcelAllLatestBookingsForSuperAdminOrganizer,

  //SuperAdmin & Organizer Dashboard Events Bookings Controller Functions
  getEventSummaryBookingsDataforSuperAdminOrganizer,
  getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer,
  getEventSummaryExcelReportbyFilterforSuperAdminOrganizer,
};
