import { SuperAdmin, Employee, Organizer } from "../../../models/AllModels.js";
import {
  validaterRegisterScannerUser,
  validateScannerUserLogin,
  validateQrCodeDetails,
  validateScannerUserUpdate,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import bcrypt from "bcrypt";
const saltRounds = 10;
import generateAuthToken from "../../../helpers/auth.js";
import { encrypt } from "../../../helpers/encryptionUtils.js";
import {
  Status,
  AdminRoles,
  BookingStatus,
  TicketType,
  ScannerUserType,
  EventStatus,
  EventEnableDisableStatus,
} from "../../../helpers/Enum.js";
import {
  getAsiaCalcuttaCurrentDateTimeinIsoFormat,
  getStartEndDateTime,
  getAsiaCalcutta4hoursSubtractedCurrentDateTimeinIsoFormat,
} from "../../../helpers/DateTime.js";
import {
  createScannerUserService,
  findOneScannerUserDataService,
  getScannerUserByIdService,
  getScannerUserDataService,
  updateScannerUserDataService,
  getPaginatedScannerUsersData,
  countScannerUsers,
} from "../../../services/ScannerUserServices.js";
import {
  findOneEventDataService,
  getEventDataService,
  getformattedEventDataForScannerUser,
} from "../../../services/EventServices.js";
import { getOrganizerDataService } from "../../../services/OrganizerServices.js";
import { findOneEventBookingsDataService } from "../../../services/EventBookingServices.js";
import {
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
} from "../../../services/EventDateTimeServices.js";
import {
  createCheckInService,
  createBulkCheckInService,
  findOneCheckInDataService,
  getCheckInDataService,
} from "../../../services/CheckInServices.js";
import { findOneEventBulkTicketsDataService } from "../../../services/EventBulkTicketServices.js";
import { sendTicketRedeemptionSms } from "../../../helpers/SmsFunctions.js";
import { findOneEventTicketDataService } from "../../../services/EventTicketServices.js";
import { findOneVenueDataService } from "../../../services/VenueServices.js";

const registerScannerUser = async (req, res) => {
  try {
    console.log("Register Scanner User Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validaterRegisterScannerUser(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      Username,
      Password,
      UserType,
      Organizers,
      Events,
      CreatedBy,
      createduser_id,
    } = req.body;

    // Check if SuperAdmin, Organizer, or Employee exists based on CreatedBy role
    if (
      CreatedBy == AdminRoles.SuperAdmin ||
      CreatedBy == AdminRoles.Organizer ||
      CreatedBy == AdminRoles.Employee
    ) {
      const userExists = await (CreatedBy == AdminRoles.SuperAdmin
        ? SuperAdmin
        : CreatedBy == AdminRoles.Organizer
        ? Organizer
        : Employee
      ).findOne({ _id: createduser_id });
      if (!userExists) {
        return sendResponse(res, 404, true, `${CreatedBy} Not Found`);
      }
    }

    // const trimmedFullName = FullName.trim();
    const trimmedUsernameName = Username.trim().toLowerCase();
    const trimmedPassword = Password.trim();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");

    const filterQuery = {
      Username: usernameRegex,
    };

    const existingScannerUser = await findOneScannerUserDataService(
      filterQuery
    );

    if (existingScannerUser) {
      return sendResponse(res, 409, true, `Scanner Username Already Exists`);
    }
    const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);

    const scannerUserObj = {
      _id: uuidv4(),
      Username: trimmedUsernameName,
      Password: hashedPassword,
      UserType: UserType,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
      CreatedBy,
      createduser_id,
    };

    if (UserType == ScannerUserType.Event) {
      if (!Events) {
        return sendResponse(
          res,
          409,
          true,
          "Event must be Provided if the Scanner is used For Event"
        );
      }
      const eventIds = Events.map((event) => event.event_id);

      let EventFilterfilterQuery = {
        _id: { $in: eventIds },
        EventStatus: EventStatus.Published,
        EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
      };

      const EventsData = await getEventDataService(EventFilterfilterQuery);
      if (EventsData.length == eventIds.length) {
        scannerUserObj.Events = Events;
      } else {
        return sendResponse(
          res,
          404,
          true,
          "Some events do not exist or are not Published/Enabled."
        );
      }
    }

    if (UserType == ScannerUserType.Organizer) {
      if (!Organizers) {
        return sendResponse(
          res,
          409,
          true,
          "Organizer must be Provided if the Scanner is used For Organizer Events"
        );
      }
      const organizerIds = Organizers.map(
        (organizer) => organizer.organizer_id
      );

      let organizerFilterQuery = {
        _id: { $in: organizerIds },
        status: Status.Active,
      };

      const organizersData = await getOrganizerDataService(
        organizerFilterQuery
      );
      if (organizersData.length == organizerIds.length) {
        scannerUserObj.Organizers = Organizers;
      } else {
        return sendResponse(res, 404, true, "Some organizers do not exist ");
      }
    }

    let newScanner = await createScannerUserService(scannerUserObj);

    return sendResponse(
      res,
      201,
      false,
      "Scanner User Registered successfully",
      newScanner
    );
  } catch (error) {
    console.error("Register Scanner User Admin Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const scannerUserLogin = async (req, res) => {
  try {
    console.log("ScannerUser Login API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateScannerUserLogin(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { Username, Password } = req.body;

    const trimmedPassword = Password.trim();
    const trimmedUsernameName = Username.trim().toLowerCase();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");

    const filterQuery = {
      Username: usernameRegex,
      status: Status.Active,
    };

    const isScannerUserWithUsernameExists = await findOneScannerUserDataService(
      filterQuery
    );

    if (!isScannerUserWithUsernameExists) {
      return sendResponse(res, 409, true, `Invalid Username or Password`);
    }

    const passwordMatch = await bcrypt.compare(
      trimmedPassword,
      isScannerUserWithUsernameExists.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Username or Password");
    }

    const payload = {
      Username: isScannerUserWithUsernameExists.Username,
      CurrentTimeStamp: getCurrentDateTime(),
    };

    const token = generateAuthToken({ payload });
    const encryptedToken = encrypt(token);

    const userData = {
      token: encryptedToken,
      scanneruser_id: isScannerUserWithUsernameExists._id,
    };

    return sendResponse(res, 200, false, "Login successfully", userData);
  } catch (error) {
    console.error("Scanner User Login Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllScannerUsers = async (req, res) => {
  try {
    console.log("Get All Scanner Users API Called");

    const ScannerUsersData = await getScannerUserDataService({});

    if (!ScannerUsersData || ScannerUsersData.length == 0) {
      return sendResponse(res, 404, true, "Scanner Users not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Scanner Users fetched successfully",
      ScannerUsersData
    );
  } catch (error) {
    console.error("Error in fetching ScannerUsers Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getScannerUsersDetailsbyId = async (req, res) => {
  try {
    const { scanneruser_id } = req.body;

    console.log("Get Scanner User Details By Id Api Called");
    console.log(
      "Scanner User Id:-----> " + JSON.stringify(req.body.scanneruser_id)
    );

    if (!scanneruser_id) {
      return sendResponse(res, 404, true, "Scanner User Id Not Provided");
    }

    let ScannerUserExists = await getScannerUserByIdService(scanneruser_id);

    if (!ScannerUserExists) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Scanner User Details fetched successfully",
      ScannerUserExists
    );
  } catch (error) {
    console.error("Get Scanner User by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateScannerUserDetailsbyId = async (req, res) => {
  try {
    console.log("Update Scanner User Details By Id Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { UserType, Organizers, Events, scanneruser_id } = req.body;

    const validationResponse = await validateScannerUserUpdate(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    let ScannerUserExists = await getScannerUserByIdService(scanneruser_id);

    if (!ScannerUserExists) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    if (UserType == ScannerUserType.Event) {
      if (!Events) {
        return sendResponse(
          res,
          409,
          true,
          "Event must be Provided if the Scanner is used For Event"
        );
      }
      const eventIds = Events.map((event) => event.event_id);

      let EventFilterfilterQuery = {
        _id: { $in: eventIds },
        EventStatus: EventStatus.Published,
        EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
      };

      const EventsData = await getEventDataService(EventFilterfilterQuery);
      if (EventsData.length == eventIds.length) {
        ScannerUserExists.Events = Events;
        ScannerUserExists.UserType = ScannerUserType.Event;
        ScannerUserExists.Organizers = [];
      } else {
        return sendResponse(
          res,
          404,
          true,
          "Some events do not exist or are not Published/Enabled."
        );
      }
    }

    if (UserType == ScannerUserType.Organizer) {
      if (!Organizers) {
        return sendResponse(
          res,
          409,
          true,
          "Organizer must be Provided if the Scanner is used For Organizer Events"
        );
      }
      const organizerIds = Organizers.map(
        (organizer) => organizer.organizer_id
      );

      let organizerFilterQuery = {
        _id: { $in: organizerIds },
        status: Status.Active,
      };

      const organizersData = await getOrganizerDataService(
        organizerFilterQuery
      );
      if (organizersData.length == organizerIds.length) {
        ScannerUserExists.Organizers = Organizers;
        ScannerUserExists.Events = [];
        ScannerUserExists.UserType = ScannerUserType.Organizer;
      } else {
        return sendResponse(res, 404, true, "Some organizers do not exist ");
      }
    }

    await ScannerUserExists.save();

    return sendResponse(res, 201, false, "Scanner User Updated successfully");
  } catch (error) {
    console.error("Update Scanner User Details By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnableScannerUser = async (req, res) => {
  try {
    console.log("Enable Scanner User Api Called ");
    console.log(
      "ScannerUser Id:-----> " + JSON.stringify(req.body.scanneruser_id)
    );

    const { scanneruser_id } = req.body;

    if (!scanneruser_id) {
      return sendResponse(res, 404, true, "Scanner User Id Not Provided");
    }

    const scannerUserFilterQuery = {
      _id: scanneruser_id,
    };
    const scannerUserData = await findOneScannerUserDataService(
      scannerUserFilterQuery
    );

    if (!scannerUserData) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    const scannerUserUpdateQuery = {
      status: Status.Active,
    };
    await updateScannerUserDataService(
      scannerUserFilterQuery,
      scannerUserUpdateQuery
    );

    return sendResponse(res, 200, false, "Scanner User Enabled successfully");
  } catch (error) {
    console.error("Error enabling Scanner User:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisableScanerUser = async (req, res) => {
  try {
    console.log("Disable Scanner User Api Called ");
    console.log(
      "ScannerUser Id:-----> " + JSON.stringify(req.body.scanneruser_id)
    );

    const { scanneruser_id } = req.body;

    if (!scanneruser_id) {
      return sendResponse(res, 404, true, "Scanner User Id Not Provided");
    }

    const scannerUserFilterQuery = {
      _id: scanneruser_id,
    };
    const scannerUserData = await findOneScannerUserDataService(
      scannerUserFilterQuery
    );

    if (!scannerUserData) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    const scannerUserUpdateQuery = {
      status: Status.Inactive,
    };
    await updateScannerUserDataService(
      scannerUserFilterQuery,
      scannerUserUpdateQuery
    );

    return sendResponse(res, 200, false, "Scanner User disabled successfully");
  } catch (error) {
    console.error("Error disabling Scanner User:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const scannerUserUpdatePassword = async (req, res) => {
  try {
    console.log("ScannerUser Update Password by SuperAdmin API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { scanneruser_id, new_password, CreatedBy, createduser_id } =
      req.body;

    if (!scanneruser_id) {
      return sendResponse(res, 404, true, `Scanner User Id Not found`);
    }

    if (!new_password) {
      return sendResponse(res, 404, true, `Password Not found`);
    }

    if (!CreatedBy) {
      return sendResponse(res, 404, true, `CreatedBy not found`);
    }

    if (!createduser_id) {
      return sendResponse(res, 404, true, `createduser_id found`);
    }

    // Check if SuperAdmin, Organizer, or Employee exists based on CreatedBy role
    if (
      CreatedBy == AdminRoles.SuperAdmin ||
      CreatedBy == AdminRoles.Organizer ||
      CreatedBy == AdminRoles.Employee
    ) {
      const userExists = await (CreatedBy == AdminRoles.SuperAdmin
        ? SuperAdmin
        : CreatedBy == AdminRoles.Organizer
        ? Organizer
        : Employee
      ).findOne({ _id: createduser_id });
      if (!userExists) {
        return sendResponse(res, 404, true, `${CreatedBy} Not Found`);
      }
    }

    const trimmedNewPassword = new_password.trim();

    const filterQuery = {
      _id: scanneruser_id,
      status: Status.Active,
    };

    let scannerUserData = await findOneScannerUserDataService(filterQuery);

    if (!scannerUserData) {
      return sendResponse(res, 409, true, `Sacnner User not found`);
    }

    const filterquery = { _id: scanneruser_id };

    bcrypt.hash(trimmedNewPassword, saltRounds, async function (err, hash) {
      if (err) {
        console.error(err);
        return sendResponse(res, 500, true, "Error hashing NewPassword");
      }

      const updatefilter = { Password: hash };

      await updateScannerUserDataService(filterquery, updatefilter);
      return sendResponse(res, 200, false, "Password Updated Successfully");
    });
  } catch (error) {
    console.error("Scanner User Updated Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getScannerUsersEventsbyId = async (req, res) => {
  try {
    const { scanneruser_id } = req.body;

    console.log("Get Scanner User Events By Id Api Called");
    console.log(
      "Scanner User Id:-----> " + JSON.stringify(req.body.scanneruser_id)
    );

    if (!scanneruser_id) {
      return sendResponse(res, 404, true, "Scanner User Id Not Provided");
    }

    let ScannerUserExists = await getScannerUserByIdService(scanneruser_id);

    if (!ScannerUserExists) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    const UserType = ScannerUserExists._doc.UserType;
    const Events = ScannerUserExists._doc.Events;
    const Organizers = ScannerUserExists._doc.Organizers;

    if (UserType == ScannerUserType.Event) {
      if (!Events) {
        return sendResponse(res, 404, true, "No Assigned Events found");
      }
      const eventIds = Events.map((event) => event.event_id);

      let EventFilterfilterQuery = {
        _id: { $in: eventIds },
        EventStatus: EventStatus.Published,
        EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
      };

      const EventsData = await getEventDataService(EventFilterfilterQuery);
      if (EventsData.length == 0) {
        return sendResponse(res, 404, true, "Events Not Found for Scanning");
      }
      const formattedEventsData = await getformattedEventDataForScannerUser(
        EventsData
      );
      return sendResponse(
        res,
        200,
        false,
        "Events fetched successfully",
        formattedEventsData
      );
    }

    if (UserType == ScannerUserType.Organizer) {
      if (!Organizers) {
        return sendResponse(
          res,
          404,
          true,
          "No Assigned Organizers Events found"
        );
      }
      const organizerIds = Organizers.map(
        (organizer) => organizer.organizer_id
      );

      let organizerFilterQuery = {
        _id: { $in: organizerIds },
        status: Status.Active,
      };

      const organizersData = await getOrganizerDataService(
        organizerFilterQuery
      );

      const foundActiveOrganizerIds = organizersData.map(
        (organizer) => organizer._id
      );

      if (foundActiveOrganizerIds.length > 0) {
        const OrganizerEventFilterQuery = {
          "EventOrganizers.organizer_id": { $in: foundActiveOrganizerIds },
          EventStatus: EventStatus.Published,
          EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
        };

        const EventsData = await getEventDataService(OrganizerEventFilterQuery);

        if (EventsData.length > 0) {
          const formattedEventsData = await getformattedEventDataForScannerUser(
            EventsData
          );
          return sendResponse(
            res,
            200,
            false,
            "Events found",
            formattedEventsData
          );
        } else {
          return sendResponse(res, 404, true, "No Events for Organizers found");
        }
      } else {
        return sendResponse(res, 404, true, "No Events for Organizers found");
      }
    }
  } catch (error) {
    console.error("Get Scanner User Events by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const scanQrCode = async (req, res) => {
  try {
    console.log("Get Scanner User Details By Id API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate the request body
    const validationResponse = await validateQrCodeDetails(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { scanneruser_id, event_id, Booking_id } = req.body;

    // Fetch scanner user details by ID
    let ScannerUserExists = await getScannerUserByIdService(scanneruser_id);

    if (!ScannerUserExists) {
      return sendResponse(res, 404, true, "Scanner User not found");
    }

    const UserType = ScannerUserExists._doc.UserType;
    let ScannerUserEventsIds = [];

    // If the scanner user is associated with specific events
    if (UserType == ScannerUserType.Event) {
      const Events = ScannerUserExists._doc.Events;
      if (!Events) {
        return sendResponse(res, 404, true, "No Assigned Events found");
      }
      Events.forEach((event) => ScannerUserEventsIds.push(event.event_id));
    }

    // If the scanner user is associated with specific organizers
    if (UserType == ScannerUserType.Organizer) {
      const Organizers = ScannerUserExists._doc.Organizers;
      if (!Organizers) {
        return sendResponse(
          res,
          404,
          true,
          "No Assigned Organizers Events found"
        );
      }

      const organizerIds = Organizers.map(
        (organizer) => organizer.organizer_id
      );

      try {
        // Filter for active organizers
        let organizerFilterQuery = {
          _id: { $in: organizerIds },
          status: Status.Active,
        };

        const organizersData = await getOrganizerDataService(
          organizerFilterQuery
        );
        const foundActiveOrganizerIds = organizersData.map(
          (organizer) => organizer._id
        );

        if (foundActiveOrganizerIds.length > 0) {
          const OrganizerEventFilterQuery = {
            "EventOrganizers.organizer_id": { $in: foundActiveOrganizerIds },
            EventStatus: EventStatus.Published,
            EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
          };

          // Fetch events associated with the organizer
          const EventsData = await getEventDataService(
            OrganizerEventFilterQuery
          );
          if (EventsData.length > 0) {
            EventsData.forEach((event) =>
              ScannerUserEventsIds.push(event._doc._id)
            );
          } else {
            return sendResponse(
              res,
              404,
              true,
              "No Events for Organizers found"
            );
          }
        } else {
          return sendResponse(res, 404, true, "No Events for Organizers found");
        }
      } catch (err) {
        console.error("Error in fetching organizer data:", err.message);
        return sendResponse(res, 500, true, "Error fetching organizer data");
      }
    }

    // Check if the event exists in the list of scanner user's events
    const isEventExistsForScanning = ScannerUserEventsIds.includes(event_id);

    if (isEventExistsForScanning) {
      try {
        const BookingFilterQuery = {
          Booking_id,
          event_id,
          status: BookingStatus.Booked,
        };

        // Check for booking details in normal bookings
        let BookingDetails = await findOneEventBookingsDataService(
          BookingFilterQuery
        );
        let DetailsFoundIn, BulkTicketBatchId;

        if (BookingDetails) {
          DetailsFoundIn = "NormalBooking";
        } else {
          // Check for booking details in bulk tickets
          const BulkTicketBookingFilterQuery = { Booking_id, event_id };
          BookingDetails = await findOneEventBulkTicketsDataService(
            BulkTicketBookingFilterQuery
          );

          if (!BookingDetails) {
            return sendResponse(res, 409, true, "Booking not Found");
          }

          DetailsFoundIn = "BulkTicketBooking";
          BulkTicketBatchId = BookingDetails._doc.Batch_id;
        }

        const TicketBookingStatus = BookingDetails._doc.status;
        const CustomerPhonenumber = BookingDetails._doc.PhoneNumber;
        const EventData = await findOneEventDataService({ _id: event_id });
        const EventName = EventData._doc.EventName;
        const VenueEventFlag = EventData._doc.VenueEventFlag;
        const OnlineEventFlag = EventData._doc.OnlineEventFlag;
        const VenueToBeAnnounced = EventData._doc.VenueToBeAnnounced;
        let VenueName;
        let EventCity;

        // Check if the booking is canceled
        if (TicketBookingStatus == BookingStatus.Cancelled) {
          return sendResponse(res, 409, true, "Booking is Cancelled");
        }

        if (VenueEventFlag == 1) {
          const venue_id = EventData._doc.venue_id;
          const venuefilterQuery = { _id: venue_id };
          const venueData = await findOneVenueDataService(venuefilterQuery);
          EventCity = venueData._doc.City;
          VenueName = venueData._doc.Name;
        }

        if (OnlineEventFlag == 1) {
          EventCity = "-";
          VenueName: "Online Event";
        }

        if (VenueToBeAnnounced == 1) {
          EventCity = EventData._doc.VenueToBeAnnouncedCity;
          VenueName = "To Be Announced";
        }

        if (DetailsFoundIn == "BulkTicketBooking") {
          const EventTicketDateTime_id = BookingDetails._doc.EventDateTime_id;

          // Fetch event date and time details
          const eventDateTimeFilterQuery = { _id: EventTicketDateTime_id };
          const EventDateTimeDetails = await findOneEventDateTimeDataService(
            eventDateTimeFilterQuery
          );

          if (!EventDateTimeDetails) {
            return sendResponse(
              res,
              409,
              true,
              "Event Date Time Details Not Found"
            );
          }

          const EventStartDateTime =
            EventDateTimeDetails._doc.EventStartDateTime.toISOString();
          const EventEndDateTime =
            EventDateTimeDetails._doc.EventEndDateTime.toISOString();

          const currentDate = getAsiaCalcuttaCurrentDateTimeinIsoFormat();
          let date = new Date(EventStartDateTime);
          date.setHours(date.getHours() - 4);
          let Event4hourBeforeStartTime = date.toISOString();

          const checkInFilterQuery = { Booking_id };

          const checkInDetails = await findOneCheckInDataService(
            checkInFilterQuery
          );

          const respObj = {
            CustomerName: BookingDetails._doc.CustomerName,
            EventName: EventName,
            BookingId: Booking_id,
            Quantity: 1,
            city: BookingDetails._doc.VenueCity,
            EventDate: EventStartDateTime,
            TicketName: BookingDetails._doc.TicketName,
            Email: BookingDetails._doc.Email,
            PhoneNo: BookingDetails._doc.PhoneNumber,
            "BookingDate&Time": BookingDetails._doc.createdAt,
            VenueName: VenueName,
          };

          if (checkInDetails) {
            respObj.Status = "Failed";
            return sendResponse(
              res,
              409,
              true,
              `Ticket Already Scanned on ${checkInDetails._doc.createdAt}`,
              respObj
            );
          }

          if (
            currentDate >= Event4hourBeforeStartTime &&
            currentDate <= EventEndDateTime
          ) {
            const CheckInDatObj = {
              _id: uuidv4(),
              event_id,
              TicketType: TicketType.BulkTicket,
              BulkTicketBatchId,
              Booking_id,
              Scanneruser_id: scanneruser_id,
              FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
              createdAt: getCurrentDateTime(),
            };

            // Create a new check-in record
            await createCheckInService(CheckInDatObj);

            respObj.Status = "Success";

            sendTicketRedeemptionSms(
              `91${CustomerPhonenumber}`,
              EventName,
              Booking_id
            );
            return sendResponse(
              res,
              200,
              false,
              "QR Scanned Successfully",
              respObj
            );
          } else {
            return sendResponse(res, 404, true, "Invalid Ticket Date");
          }
        }

        if (DetailsFoundIn == "NormalBooking") {
          const EventTicketType = BookingDetails._doc.EventTicketType;
          const TicketQuantity = BookingDetails._doc.TicketQuantity;
          const EventTicketId = BookingDetails._doc.EventTicket_id;
          const EventTicketDateTime_id = BookingDetails._doc.EventDateTime_id;
          const checkInFilterQuery = { Booking_id };

          if (
            EventTicketType == TicketType.SingleDay ||
            EventTicketType == TicketType.MultipleDay
          ) {
            // Fetch event date and time details
            const eventDateTimeFilterQuery = { _id: EventTicketDateTime_id };
            const EventDateTimeDetails = await findOneEventDateTimeDataService(
              eventDateTimeFilterQuery
            );

            const TicketDetails = await findOneEventTicketDataService({
              _id: EventTicketId,
            });

            const EventStartDateTime =
              EventDateTimeDetails._doc.EventStartDateTime.toISOString();
            const EventEndDateTime =
              EventDateTimeDetails._doc.EventEndDateTime.toISOString();

            if (!EventDateTimeDetails) {
              return sendResponse(
                res,
                409,
                true,
                "Event Date Time Details Not Found"
              );
            }

            const respObj = {
              CustomerName: BookingDetails._doc.CustomerName,
              EventName: EventName,
              BookingId: Booking_id,
              Quantity: TicketQuantity,
              EventDate: EventStartDateTime,
              TicketName: TicketDetails._doc.Name,
              Email: BookingDetails._doc.Email,
              PhoneNo: BookingDetails._doc.PhoneNumber,
              "BookingDate&Time": BookingDetails._doc.BookingDateTime,
              city: EventCity,
              VenueName: VenueName,
            };
            // Check if the ticket was already scanned
            const checkInDetails = await getCheckInDataService(
              checkInFilterQuery
            );
            if (checkInDetails.length >= TicketQuantity) {
              respObj.Status = "Failed";

              return sendResponse(
                res,
                409,
                true,
                `Ticket Already Scanned on ${
                  checkInDetails[checkInDetails.length - 1]._doc.createdAt
                }`,
                respObj
              );
            }

            const currentDate = getAsiaCalcuttaCurrentDateTimeinIsoFormat();

            let date = new Date(EventStartDateTime);
            date.setHours(date.getHours() - 4);
            let Event4hourBeforeStartTime = date.toISOString();

            // Verify if the current time falls within the event's start and end time
            if (
              currentDate >= Event4hourBeforeStartTime &&
              currentDate <= EventEndDateTime
            ) {
              const bulkCheckInArray = [];

              for (let i = 0; i < TicketQuantity; i++) {
                const CheckInDatObj = {
                  _id: uuidv4(),
                  event_id,
                  TicketType: EventTicketType,
                  EventTicketId,
                  Booking_id,
                  Scanneruser_id: scanneruser_id,
                  FilterationDateTime:
                    getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
                  createdAt: getCurrentDateTime(),
                };

                bulkCheckInArray.push(CheckInDatObj);
              }

              await createBulkCheckInService(bulkCheckInArray);

              sendTicketRedeemptionSms(
                `91${CustomerPhonenumber}`,
                EventName,
                Booking_id
              );

              respObj.Status = "Success";

              return sendResponse(
                res,
                200,
                false,
                "QR Scanned Successfully",
                respObj
              );
            } else {
              return sendResponse(res, 404, true, "Invalid Ticket Date");
            }
          }

          if (EventTicketType == TicketType.SeasonPass) {
            const eventDateTimeFilterQuery = { Event_id: event_id };
            const allEventDateTimes = await getEventDateTimeDataService(
              eventDateTimeFilterQuery
            );

            if (!allEventDateTimes || allEventDateTimes.length === 0) {
              return sendResponse(
                res,
                409,
                true,
                "Event Date Time Details Not Found"
              );
            }

            // Use ISO string for current time for consistent comparison
            const currentDateIso = getAsiaCalcuttaCurrentDateTimeinIsoFormat();

            // Find if today is a valid event day
            let todaySlot = null;
            for (let slot of allEventDateTimes) {
              const startIso = new Date(
                slot._doc.EventStartDateTime
              ).toISOString();
              const endIso = new Date(slot._doc.EventEndDateTime).toISOString();

              // Calculate 4 hours before event start
              let startDateObj = new Date(slot._doc.EventStartDateTime);
              startDateObj.setHours(startDateObj.getHours() - 4);
              const fourHoursBeforeStartIso = startDateObj.toISOString();

              // Only allow scanning if current time is within the allowed window
              if (
                currentDateIso >= fourHoursBeforeStartIso &&
                currentDateIso <= endIso
              ) {
                todaySlot = slot;
                break;
              }
            }

            if (!todaySlot) {
              return sendResponse(
                res,
                404,
                true,
                "Ticket is not valid for today or event not running today (scanning allowed only from 4 hours before start)"
              );
            }

            if (!todaySlot) {
              return sendResponse(
                res,
                404,
                true,
                "Ticket is not valid for today or event not running today"
              );
            }

            // Check if already checked in for today
            const todayStartIso = new Date(
              todaySlot._doc.EventStartDateTime
            ).toISOString();
            const todayEndIso = new Date(
              todaySlot._doc.EventEndDateTime
            ).toISOString();

            // Find check-ins for this booking and today
            const allCheckIns = await getCheckInDataService({
              Booking_id,
            });
            let todayCheckIns = allCheckIns.filter((ci) => {
              let dateStr = ci._doc.FilterationDateTime || ci._doc.createdAt;
              let checkInTime;
              if (ci._doc.FilterationDateTime) {
                checkInTime = new Date(dateStr);
              } else if (ci._doc.createdAt) {
                // Parse "21-09-2025 16:17:12" as "YYYY-MM-DDTHH:mm:ss"
                const [d, m, yAndTime] = dateStr.split("-");
                const [y, time] = yAndTime.split(" ");
                dateStr = `${y}-${m}-${d}T${time}`;
                checkInTime = new Date(dateStr);
              } else {
                return false;
              }
              if (isNaN(checkInTime.getTime())) return false;
              const checkInTimeIso = checkInTime.toISOString();
              return (
                checkInTimeIso >= todayStartIso && checkInTimeIso <= todayEndIso
              );
            });

            const TicketDetails = await findOneEventTicketDataService({
              _id: EventTicketId,
            });

            const respObj = {
              CustomerName: BookingDetails._doc.CustomerName,
              EventName: EventName,
              BookingId: Booking_id,
              Quantity: TicketQuantity,
              EventDate: todaySlot._doc.EventStartDateTime.toISOString(),
              TicketName: TicketDetails?._doc?.Name || "",
              Email: BookingDetails._doc.Email,
              PhoneNo: BookingDetails._doc.PhoneNumber,
              "BookingDate&Time": BookingDetails._doc.BookingDateTime,
              city: EventCity,
              VenueName: VenueName,
            };

            if (todayCheckIns.length >= TicketQuantity) {
              respObj.Status = "Failed";
              return sendResponse(
                res,
                409,
                true,
                `Season Pass already scanned for today on ${
                  todayCheckIns[todayCheckIns.length - 1]._doc.createdAt
                }`,
                respObj
              );
            }

            // Allow check-in for today for the full quantity (if not already checked in)
            const bulkCheckInArray = [];
            for (let i = 0; i < TicketQuantity; i++) {
              const CheckInDatObj = {
                _id: uuidv4(),
                event_id,
                TicketType: TicketType.SeasonPass,
                EventTicketId,
                Booking_id,
                Scanneruser_id: scanneruser_id,
                FilterationDateTime:
                  getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
                createdAt: getCurrentDateTime(),
              };
              bulkCheckInArray.push(CheckInDatObj);
            }

            await createBulkCheckInService(bulkCheckInArray);

            sendTicketRedeemptionSms(
              `91${CustomerPhonenumber}`,
              EventName,
              Booking_id
            );

            respObj.Status = "Success";
            return sendResponse(
              res,
              200,
              false,
              "Season Pass QR Scanned Successfully for today",
              respObj
            );
          }
        }
      } catch (err) {
        console.error("Error in Booking Details:", err.message);
        return sendResponse(res, 500, true, "Error in Booking Details");
      }
    } else {
      return sendResponse(res, 404, true, "Event not assigned to Scanner User");
    }
  } catch (err) {
    console.error("Error in QR Scan Code:", err.message);
    return sendResponse(res, 500, true, "Error in QR Scan Code");
  }
};

export {
  registerScannerUser,
  scannerUserLogin,
  getAllScannerUsers,
  getScannerUsersDetailsbyId,
  updateScannerUserDetailsbyId,
  EnableScannerUser,
  DisableScanerUser,
  scannerUserUpdatePassword,
  getScannerUsersEventsbyId,
  scanQrCode,
};
