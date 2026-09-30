import { validateCustomerRegistrationBySuperAdmin } from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  EventVenueTobeAnnounced,
  BookingStatus,
  IsOnlineEvent,
  IsVenueAvailable,
  TicketType,
  CustomerType,
} from "../../../helpers/Enum.js";
import {
  registerCustomerService,
  findOneCustomerDataService,
  getCustomerDataService,
  getCustomerByIdService,
  updateCustomerDataService,
  getPaginatedCustomerData,
  countCustomer,
} from "../../../services/CustomerServices.js";
import { findOneSuperAdminDataService } from "../../../services/SuperAdminServices.js";
import { logRequest } from "../../../helpers/commonFunctions.js";
import {
  getEventBookingsDataService,
  getPaginatedEventBookingsData,
  countEventBookings,
} from "../../../services/EventBookingServices.js";
import { getEventByIdService } from "../../../services/EventServices.js";
import { getEventTicketByIdService } from "../../../services/EventTicketServices.js";
import { findOneVenueDataService } from "../../../services/VenueServices.js";
import {
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";

const getAllWebCustomers = async (req, res) => {
  try {
    console.log("Get All Web Customers API Called");

    const filterQuery = { status: 1 };
    const CustomersData = await getCustomerDataService({});

    if (!CustomersData.length) {
      return sendResponse(res, 404, true, "Customer not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Customers fetched successfully",
      CustomersData
    );
  } catch (error) {
    console.error("Error in fetching Customer Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const registerCustomerBySuperAdmin = async (req, res) => {
  try {
    // Log API call and request body parameters
    console.log("Register Customer By SuperAdmin Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateCustomerRegistrationBySuperAdmin(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    // Destructure request body
    const { Email, CustomerName, MobileNumber, createduser_id } = req.body;

    const superAdminQueryFilter = {
      _id: createduser_id,
    };
    // Check if the user creating bulk ticket is a super admin
    const superAdminExists = await findOneSuperAdminDataService(
      superAdminQueryFilter
    );

    if (!superAdminExists) {
      return sendResponse(res, 404, true, `SuperAdmin Not Found`);
    }

    const trimmedMobileNumber = MobileNumber.trim();
    const existingCustomerWithMobileNumber = await findOneCustomerDataService({
      MobileNumber: trimmedMobileNumber,
    });
    if (existingCustomerWithMobileNumber) {
      return sendResponse(
        res,
        409,
        true,
        "Customer Mobile Number Already Found"
      );
    }

    const normalizedEmail = Email.trim().toLowerCase();
    const emailRegex = new RegExp(`^${normalizedEmail}$`, "i");
    const existingEmailforCustomer = await findOneCustomerDataService({
      Email: emailRegex,
    });
    if (existingEmailforCustomer) {
      return sendResponse(res, 409, true, "Customer Email Already Exists");
    }

    const customerDataObj = {
      _id: uuidv4(),
      MobileNumber: trimmedMobileNumber,
      Email: normalizedEmail,
      CustomerName: CustomerName,
      createdAt: getCurrentDateTime(),
      RegistrationType: CustomerType.AdminPanelRegistration,
    };

    const customerData = await registerCustomerService(customerDataObj);

    return sendResponse(
      res,
      201,
      false,
      "Customer Registered Successfully",
      customerData
    );
  } catch (error) {
    // Handle errors
    console.error("Register Customer By SuperAdmin Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    // Log the incoming request for tracking purposes
    logRequest("Get Customer Bookings By Id API Called", req.body);

    // Extract customer_id from the request body
    const { customer_id } = req.body;

    // Check if customer_id is provided, return an error if not
    if (!customer_id) {
      return sendResponse(res, 404, true, "Customer Id not Provided");
    }

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch customer data using the customer_id
    const customerData = await getCustomerByIdService(customer_id);

    // If no customer data is found, return a 404 response
    if (!customerData) {
      return sendResponse(res, 404, true, "Customer Data not found");
    }

    // Create filter query to fetch event bookings for the customer
    const bookingFilterQuery = { customer_id, status: BookingStatus.Booked };

    const EventsBookingsData = await getPaginatedEventBookingsData(
      bookingFilterQuery,
      limit,
      skip
    );

    const totalBookings = await countEventBookings(bookingFilterQuery);

    // If no bookings are found, return an appropriate message
    if (EventsBookingsData.length == 0) {
      return sendResponse(res, 200, true, "No Event Bookings Found");
    }

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
          EventName: eventData._doc.EventName,
          TicketName: EventTicketsData._doc.Name,
          TicketPrice: EventTicketsData._doc.Price,
          TicketQuantity: eventBooking._doc.TicketQuantity,
          EventDate: EventDate,
          EventTime: EventTime,
          EventVenue: EventVenue,
          VenueCity: VenueCity,
          EventTicketType: BookedEventTicketType,
          TotalAmount: eventBooking._doc.TotalAmount,
        };
      })
    );

    return sendResponse(
      res,
      200,
      false,
      "Event Bookings Fetched successfully",
      {
        totalPages: Math.ceil(totalBookings / limit),
        currentPage: page,
        totalBookings: totalBookings,
        BookingsData: formattedEventBookingsData,
      }
    );
  } catch (error) {
    // Log the error and return an internal server error response
    console.error("Get Customer Bookings By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedCustomersData = async (req, res) => {
  try {
    console.log("Get All Customers Data by Pagination API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const customerData = await getPaginatedCustomerData({}, limit, skip);

    if (!customerData.length) {
      return sendResponse(res, 404, true, "Customers not found");
    }

    const totalCustomers = await countCustomer({});

    return sendResponse(res, 200, false, "Customers fetched successfully", {
      totalPages: Math.ceil(totalCustomers / limit),
      currentPage: page,
      totalCustomers: totalCustomers,
      customerData: customerData,
    });
  } catch (error) {
    console.error("Error in fetching Customer Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCustomerDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log(
      "Search Get Customer Paginatined Data by Search Keyword API Called"
    );
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;

    if (!search_keyword) {
      return sendResponse(res, 400, true, "Search Keyword is required");
    }
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      CustomerName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const customersData = await getPaginatedCustomerData(
      filterQuery,
      limit,
      skip
    );

    if (!customersData.length) {
      return sendResponse(res, 404, true, "Customers not found");
    }

    const totalCustomers = await countCustomer(filterQuery);

    return sendResponse(res, 200, false, "Customers fetched successfully", {
      totalPages: Math.ceil(totalCustomers / limit),
      currentPage: page,
      totalCustomers: totalCustomers,
      customersData: customersData,
    });
  } catch (error) {
    console.error(
      "Error in fetching  Customers Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  getAllWebCustomers,
  registerCustomerBySuperAdmin,
  getCustomerBookings,
  getAllPaginatedCustomersData,
  getCustomerDataBySearchKeywordPaginated,
};
