import {
  validateGenrateOtpForWebsiteUsers,
  validateOtpForWebsiteUsers,
  validateWebsiteUsersProfileUpdate,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import fs from "fs";
import { BookingStatus, ImagesPath } from "../../../helpers/Enum.js";
import generateAuthToken from "../../../helpers/auth.js";
import { encrypt } from "../../../helpers/encryptionUtils.js";
import {
  CustomerType,
  TicketType,
  EventVenueTobeAnnounced,
  IsOnlineEvent,
  IsVenueAvailable,
} from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  registerCustomerService,
  findOneCustomerDataService,
  getCustomerDataService,
  getCustomerByIdService,
  updateCustomerDataService,
} from "../../../services/CustomerServices.js";
import { generateOTP, logRequest } from "../../../helpers/commonFunctions.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sendOtpSms } from "../../../helpers/SmsFunctions.js";
import { getEventBookingsDataService } from "../../../services/EventBookingServices.js";
import {
  getEventByIdService,
  getEventDataService,
} from "../../../services/EventServices.js";
import { getEventTicketByIdService } from "../../../services/EventTicketServices.js";
import {
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import { findOneVenueDataService } from "../../../services/VenueServices.js";
import { checkIfAllEventDateTimeEnded } from "../../../CronJobs/index.js";
import { isProduction } from "../../../config/index.js";

const handleMulterError = (err, res) => {
  console.error("Multer Error:", err.message);
  return sendResponse(res, 500, true, "Multer Error", err.message);
};

const generateOtp = async (req, res) => {
  try {
    logRequest("Generate Otp Web Customer API Called", req.body);

    const validationResponse = await validateGenrateOtpForWebsiteUsers(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { MobileNumber } = req.body;
    const trimmedMobileNumber = MobileNumber.trim();

    const existingCustomer = await findOneCustomerDataService({
      MobileNumber: trimmedMobileNumber,
    });

    const expiryDuration = 5 * 60 * 1000;
    const otpExpiryTime = Date.now() + expiryDuration;
    let OtpValue;

    do {
      OtpValue = generateOTP();
    } while (await findOneCustomerDataService({ Otp: OtpValue }));

    const customerExists = existingCustomer ? 1 : 0;

    const customerData = existingCustomer || {
      _id: uuidv4(),
      MobileNumber: trimmedMobileNumber,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    customerData.Otp = OtpValue;
    customerData.OtpExpiryTime = otpExpiryTime;
    customerData.RegistrationType = CustomerType.WebsiteRegistration;

    await (existingCustomer
      ? existingCustomer.save()
      : registerCustomerService(customerData));

    let responseObj = {};

      sendOtpSms(`91${trimmedMobileNumber}`, OtpValue);
      responseObj.customer_id = customerData._id;
      responseObj.customerExists = customerExists;

      return sendResponse(
        res,
        201,
        false,
        "Otp Sent Successfully",
        responseObj
      );

    responseObj.OtpValue = OtpValue;
    responseObj.customer_id = customerData._id;
    responseObj.customerExists = customerExists;

    console.log("Generated Otp is----->", OtpValue);

    return sendResponse(res, 201, false, "Otp Sent Successfully", responseObj);
  } catch (error) {
    console.error("Generate Otp for Website Users Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const validateOtp = async (req, res) => {
  try {
    logRequest("Validate Otp Web Customer API Called", req.body);

    const validationResponse = await validateOtpForWebsiteUsers(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { customer_id, Otp } = req.body;
    const trimmedOtpValue = Otp.trim();

    const isCustomerExists = await findOneCustomerDataService({
      _id: customer_id,
    });

    if (isCustomerExists) {
      if (isCustomerExists.Otp == trimmedOtpValue) {
        if (Date.now() < isCustomerExists.OtpExpiryTime) {
          isCustomerExists.Otp = undefined;
          isCustomerExists.OtpExpiryTime = undefined;
          await isCustomerExists.save();

          const payload = { CurrentTimeStamp: getCurrentDateTime() };
          const token = generateAuthToken({ payload });
          const encryptedToken = encrypt(token);

          const customerData = {
            token: encryptedToken,
            customer_id: isCustomerExists._id,
          };
          return sendResponse(
            res,
            200,
            false,
            "Otp Verified Successfully",
            customerData
          );
        } else {
          return sendResponse(res, 404, true, "Otp Expired");
        }
      } else {
        return sendResponse(res, 404, true, "Invalid Otp");
      }
    }

    return sendResponse(res, 404, true, "Customer Not Found");
  } catch (error) {
    console.error("Validate Otp for Website Users Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCustomerDataById = async (req, res) => {
  try {
    logRequest("Get Customer Data By Id API Called", req.body);

    const { customer_id } = req.body;
    if (!customer_id) {
      return sendResponse(res, 404, true, "Customer Id not Provided");
    }

    const customerData = await getCustomerByIdService(customer_id);

    if (!customerData) {
      return sendResponse(res, 404, true, "Customer Data not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Customer fetched successfully",
      customerData
    );
  } catch (error) {
    console.error("Get Customer Data By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateCustomerProfile = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "profileImage", maxCount: 1 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      logRequest("Update Web Customer Profile API Called", req.body);

      const validationResponse = await validateWebsiteUsersProfileUpdate(
        req.body
      );
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const {
        customer_id,
        Email,
        CustomerName,
        Identity,
        AddressLine1,
        AddressLine2,
        Landmark,
        City,
        State,
        Pincode,
      } = req.body;

      const isCustomerExists = await findOneCustomerDataService({
        _id: customer_id,
      });

      if (!isCustomerExists) {
        return sendResponse(res, 404, true, "Customer not found");
      }

      if (Email) {
        const normalizedEmail = Email.trim().toLowerCase();
        const emailRegex = new RegExp(`^${normalizedEmail}$`, "i");
        const existingEmailforCustomer = await findOneCustomerDataService({
          _id: { $ne: customer_id },
          Email: emailRegex,
        });

        if (existingEmailforCustomer) {
          return sendResponse(res, 409, true, "Customer Email Already Exists");
        }
        isCustomerExists.Email = normalizedEmail;
      }

      const fieldsToUpdate = {
        CustomerName,
        Identity,
        AddressLine1,
        AddressLine2,
        Landmark,
        City,
        State,
        Pincode,
      };
      for (let field in fieldsToUpdate) {
        if (fieldsToUpdate[field]) {
          isCustomerExists[field] = fieldsToUpdate[field].trim();
        }
      }

      if (req.files && req.files.profileImage) {
        const CustomerProfileFolderPath = ImagesPath.CustomerProfileFolderPath;
        if (!fs.existsSync(CustomerProfileFolderPath)) {
          fs.mkdirSync(CustomerProfileFolderPath, { recursive: true });
        }
        const customerProfileImagePath = `${CustomerProfileFolderPath}${Date.now()}-${
          req.files.profileImage[0].originalname
        }`;
        fs.writeFileSync(
          customerProfileImagePath,
          req.files.profileImage[0].buffer
        );
        if (isCustomerExists.profile_img == undefined) {
          isCustomerExists.profile_img = customerProfileImagePath;
        } else {
          fs.unlinkSync(isCustomerExists.profile_img);
          isCustomerExists.profile_img = customerProfileImagePath;
        }
      }

      await isCustomerExists.save();
      return sendResponse(
        res,
        200,
        false,
        "Profile Details Updated Successfully"
      );
    });
  } catch (error) {
    console.error(
      "Updating the Customer Profile Data Users Error:",
      error.message
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCustomerBookedEventTickets = async (req, res) => {
  try {
    // Log the incoming request for tracking purposes
    logRequest("Get Customer Event Booked Tickets By Id API Called", req.body);

    // Extract customer_id from the request body
    const { customer_id } = req.body;

    // Check if customer_id is provided, return an error if not
    if (!customer_id) {
      return sendResponse(res, 404, true, "Customer Id not Provided");
    }

    // Fetch customer data using the customer_id
    const customerData = await getCustomerByIdService(customer_id);

    // If no customer data is found, return a 404 response
    if (!customerData) {
      return sendResponse(res, 404, true, "Customer Data not found");
    }

    // Create filter query to fetch event bookings for the customer
    const bookingFilterQuery = {
      customer_id,
      status: {
        $in: [BookingStatus.Booked, BookingStatus.Cancelled],
      },
    };

    // Fetch all event bookings for the customer
    const EventsBookingsData = await getEventBookingsDataService(
      bookingFilterQuery
    );

    // If no bookings are found, return an appropriate message
    if (EventsBookingsData.length == 0) {
      return sendResponse(res, 200, true, "No Event Bookings Found");
    }

    // Initialize arrays to hold upcoming and past event tickets
    let UpcomingEventTickets = [];
    let PastEventTickets = [];

    // Process each booking data
    const formattedEventBookingsData = await Promise.all(
      EventsBookingsData.map(async (eventBooking) => {
        // Fetch the event and ticket details
        const eventData = await getEventByIdService(eventBooking.event_id);
        const EventTicketsData = await getEventTicketByIdService(
          eventBooking.EventTicket_id
        );
        const EventTicketType = eventBooking._doc.EventTicketType;

        // Initialize variables for event venue and city
        let EventVenue;
        let VenueCity;

        // Get event flags for venue and online status
        const VenueToBeAnnouncedFlag = eventData._doc.VenueToBeAnnounced;
        const OnlineEventFlag = eventData._doc.OnlineEventFlag;
        const VenueEventFlag = eventData._doc.VenueEventFlag;

        // Determine venue and city based on event flags
        if (VenueEventFlag == IsVenueAvailable.Yes) {
          // Venue is available, fetch venue details
          const venue_id = eventData._doc.venue_id;
          const VeneDetails = await findOneVenueDataService({ _id: venue_id });
          EventVenue = VeneDetails._doc.Name;
          VenueCity = VeneDetails._doc.City;
        }

        if (OnlineEventFlag == IsOnlineEvent.Yes) {
          EventVenue = "Online Event";
          VenueCity = "Online";
        }

        if (VenueToBeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
          EventVenue = "Venue to be Announced";
          VenueCity = eventData._doc.VenueToBeAnnouncedCity;
        }

        // Determine event ticket type (Single Day or Season Pass) and event date/time
        let EventDateTimeData;
        let BookedEventTicketType;
        if (
          EventTicketType == TicketType.SingleDay ||
          EventTicketType == TicketType.MultipleDay
        ) {
          // Single Day or Multiple Day ticket
          EventDateTimeData = await findOneEventDateTimeDataService({
            _id: eventBooking._doc.EventDateTime_id,
          });
          BookedEventTicketType = "Single Day";
        } else {
          // Season Pass, get the first date
          const EventAllDateTimeData = await getEventDateTimeDataService({
            Event_id: eventBooking.event_id,
          });
          const FirstDateTime = SortEventDateTime(EventAllDateTimeData);
          EventDateTimeData = FirstDateTime[0];
          BookedEventTicketType = "Season Pass";
        }

        // Format event date and time for the response
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

        // Return formatted booking data for this event
        return {
          Booking_id: eventBooking._doc.Booking_id,
          Event_id: eventBooking._doc.event_id,
          TicketName: EventTicketsData._doc.Name,
          TicketQuantity: eventBooking._doc.TicketQuantity,
          TotalAmount: eventBooking._doc.TotalAmount,
          EventName: eventData._doc.EventName,
          EventDate: EventDate,
          EventTime: EventTime,
          EventVenue: EventVenue,
          VenueCity: VenueCity,
          Status:
            eventBooking._doc.status == BookingStatus.Booked
              ? "Booked"
              : eventBooking._doc.status == BookingStatus.Cancelled
              ? "Cancelled"
              : "Unknown",
          EventTicketType: BookedEventTicketType,
        };
      })
    );

    // Separate bookings into upcoming and past event tickets based on event date/time
    await Promise.all(
      formattedEventBookingsData.map(async (eventBooking) => {
        const Event_id = eventBooking.Event_id;
        const eventDateTimeForEventsFilterQuery = { Event_id };

        // Get all event date/time data for the event
        const EventDateTimeData = await getEventDateTimeDataService(
          eventDateTimeForEventsFilterQuery
        );

        // Check if the event has ended
        const isEventEnded = checkIfAllEventDateTimeEnded(EventDateTimeData);

        // Classify event as either upcoming or past
        if (isEventEnded) {
          PastEventTickets.push(eventBooking);
        } else {
          UpcomingEventTickets.push(eventBooking);
        }
      })
    );

    // Prepare the response object with upcoming and past tickets
    const respObj = {
      UpcomingEventTickets,
      PastEventTickets,
    };

    // Send the response back with the fetched data
    return sendResponse(
      res,
      200,
      false,
      "Event Bookings Fetched successfully",
      respObj
    );
  } catch (error) {
    // Log the error and return an internal server error response
    console.error(
      "Get Customer Booked Event Tickets By Id Error:",
      error.message
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  generateOtp,
  validateOtp,
  getCustomerDataById,
  updateCustomerProfile,
  getCustomerBookedEventTickets,
};
