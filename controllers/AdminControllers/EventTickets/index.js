import {
  validateEventTicketCreation,
  validateEventTicketUpdate,
  validatePromoterEventTicketsByEventDates,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  TicketStatus,
  TicketType,
  TicketAvailability,
  TicketVisiblity,
  EventStatus,
  Status,
  IsVenueAvailable,
  IsOnlineEvent,
  EventVenueTobeAnnounced,
  ImagesUrls,
  BookingStatus,
} from "../../../helpers/Enum.js";
import {
  createEventTicketService,
  findOneEventTicketDataService,
  getEventTicketDataService,
  updateEventTicketDataService,
  getPaginatedEventTicketsData,
  countEventTickets,
} from "../../../services/EventTicketServices.js";
import { findOneEventDataService } from "../../../services/EventServices.js";
import {
  getEventDateTimeDataService,
  findOneEventDateTimeDataService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import { findOnePromoterDataService } from "../../../services/PromoterServices.js";
import {
  getEventBookingsDataService,
  findOneEventBookingsDataService,
} from "../../../services/EventBookingServices.js";
import { findOneVenueDataService } from "../../../services/VenueServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { generateQRCode } from "../../../services/EventTicketServices.js";

import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAllEventTickets = async (req, res) => {
  try {
    console.log("Get Event Tickets by Id API Called");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = { _id: event_id };
    const isEventExists = await findOneEventDataService(eventFilterQuery);
    if (!isEventExists) {
      return sendResponse(res, 409, true, `Event Not Found`);
    }

    const eventPromotersData = isEventExists._doc.EventPromoter;
    const eventVisibility = isEventExists._doc.EventVisibility;

    const updatedEventPromotersDataWithName = await Promise.all(
      eventPromotersData.map(async (data) => {
        const promotersFilterQuery = { _id: data.promoter_id };
        const EventDateTimeData = await findOnePromoterDataService(
          promotersFilterQuery
        );
        const promoterName = EventDateTimeData._doc.FullName;
        return {
          promoterName: promoterName,
          promoter_id: data.promoter_id,
        };
      })
    );

    // Filter out duplicate promoters
    const uniquePromoters = updatedEventPromotersDataWithName.reduce(
      (acc, current) => {
        const x = acc.find((item) => item.promoter_id == current.promoter_id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      },
      []
    );

    const eventDateTimeFilterQuery = { Event_id: event_id };
    const EventDatesTime = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    const eventTicketsQueryFilter = { Event_id: event_id };
    const EventTicketsData = await getPaginatedEventTicketsData(
      eventTicketsQueryFilter,
      limit,
      skip
    );

    const totalEventTickets = await getEventTicketDataService(
      eventTicketsQueryFilter
    );

    const totalTicketsCount = await countEventTickets(eventTicketsQueryFilter);

    const updatedEventTicketsData = await Promise.all(
      EventTicketsData.map(async (ticket) => {
        const EventTicketDateTime = ticket.EventDateTime_id;
        const eventTicketId = ticket._id;
        const TicketTotalQuantity = ticket.Quantity;

        const eventDateTimeDetails = await findOneEventDateTimeDataService({
          _id: EventTicketDateTime,
        });

        const EventTicketType = ticket._doc.TicketType;

        const bookingFilterQuery = {
          EventTicket_id: eventTicketId,
          status: { $in: [BookingStatus.Booked, BookingStatus.InProcess] },
        };
        const BookedTicketData = await getEventBookingsDataService(
          bookingFilterQuery
        );

        const totalBookedTicketQuantity = BookedTicketData.reduce(
          (total, item) => {
            return total + item.TicketQuantity;
          },
          0
        );

        const pendingTicketQuantity =
          TicketTotalQuantity - totalBookedTicketQuantity;

        if (EventTicketType == TicketType.SeasonPass) {
          const EventStartDateTimeForSeasonPass =
            EventDatesTime[0]._doc.EventStartDateTime;
          return {
            ...ticket._doc,
            TicketDate: EventStartDateTimeForSeasonPass,
            PendingQuantity: pendingTicketQuantity,
          };
        } else {
          const EventStartDateTime = eventDateTimeDetails.EventStartDateTime;

          return {
            ...ticket._doc,
            TicketDate: EventStartDateTime,
            PendingQuantity: pendingTicketQuantity,
          };
        }
      })
    );

    const ticketNamesSet = new Set();
    totalEventTickets.forEach((ticket) => {
      ticketNamesSet.add(ticket.Name);
    });
    const TicketNamesArray = Array.from(ticketNamesSet);

    const resObj = {
      EventPromotersData: uniquePromoters,
      EventDateTimeData: EventDatesTime,
      TicketNamesArray: TicketNamesArray,
      EventStatus: eventVisibility,
      totalPages: Math.ceil(totalTicketsCount / limit),
      currentPage: page,
      totalTicketsCount,
      EventTicketsData: updatedEventTicketsData,
      EventName: isEventExists._doc.EventName,
    };

    return sendResponse(
      res,
      200,
      false,
      "Event Tickets fetched successfully",
      resObj
    );
  } catch (error) {
    console.error("Error in fetching Event Tickets Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getTicketsByFilter = async (req, res) => {
  try {
    console.log("Get Tickets by Filter API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { event_id, eventDateTime_id, ticketName } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    if (!event_id) {
      return sendResponse(res, 400, true, "Event ID is required");
    }

    const eventFilterQuery = { _id: event_id };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const eventTicketsFilterQuery = { Event_id: event_id };

    if (eventDateTime_id) {
      eventTicketsFilterQuery.EventDateTime_id = eventDateTime_id;
    }

    if (ticketName) {
      eventTicketsFilterQuery.Name = ticketName;
    }

    const eventDateTimeFilterQuery = { Event_id: event_id };
    const EventDatesTime = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    const TicketsData = await getPaginatedEventTicketsData(
      eventTicketsFilterQuery,
      limit,
      skip
    );

    if (!TicketsData.length) {
      return sendResponse(res, 404, true, "Tickets not found");
    }

    const totalTickets = await countEventTickets(eventTicketsFilterQuery);

    const updatedEventTicketsData = await Promise.all(
      TicketsData.map(async (ticket) => {
        const EventTicketDateTime = ticket.EventDateTime_id;
        const eventTicketId = ticket._id;
        const TicketTotalQuantity = ticket.Quantity;

        const eventDateTimeDetails = await findOneEventDateTimeDataService({
          _id: EventTicketDateTime,
        });

        const EventTicketType = ticket._doc.TicketType;

        const bookingFilterQuery = {
          EventTicket_id: eventTicketId,
          status: { $in: [BookingStatus.Booked, BookingStatus.InProcess] },
        };
        const BookedTicketData = await getEventBookingsDataService(
          bookingFilterQuery
        );

        const totalBookedTicketQuantity = BookedTicketData.reduce(
          (total, item) => {
            return total + item.TicketQuantity;
          },
          0
        );

        const pendingTicketQuantity =
          TicketTotalQuantity - totalBookedTicketQuantity;

        if (EventTicketType == TicketType.SeasonPass) {
          const EventStartDateTimeForSeasonPass =
            EventDatesTime[0]._doc.EventStartDateTime;
          return {
            ...ticket._doc,
            TicketDate: EventStartDateTimeForSeasonPass,
            PendingQuantity: pendingTicketQuantity,
          };
        } else {
          const EventStartDateTime = eventDateTimeDetails.EventStartDateTime;

          return {
            ...ticket._doc,
            TicketDate: EventStartDateTime,
            PendingQuantity: pendingTicketQuantity,
          };
        }
      })
    );

    return sendResponse(res, 200, false, "Tickets fetched successfully", {
      totalPages: Math.ceil(totalTickets / limit),
      currentPage: page,
      totalTickets,
      TicektsData: updatedEventTicketsData,
    });
  } catch (error) {
    console.error("Error in fetching Tickets by Filter Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const createEventTicket = async (req, res) => {
  try {
    // Log API call and request body
    console.log("Create Event Ticket API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate request body
    const validationResponse = await validateEventTicketCreation(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    // Destructure request body
    const {
      Event_id,
      EventTicketType,
      EventDateTimeIds,
      EventTicketVisibility,
      EventPromoters,
      Name,
      Description,
      Price,
      Quantity,
      BookingMaxLimit,
    } = req.body;

    // Check if event exists
    const eventFilterQuery = { _id: Event_id };
    const isEventExists = await findOneEventDataService(eventFilterQuery);
    if (!isEventExists) {
      return sendResponse(res, 409, true, "Event Not Found");
    }

    // Common validation for Event Promoters
    if (EventTicketVisibility != TicketVisiblity.Promoters) {
      if (EventPromoters) {
        return sendResponse(
          res,
          409,
          true,
          "Event Promoters only accepted when Ticket Visibility is Promoters"
        );
      }
    } else if (!EventPromoters) {
      return sendResponse(
        res,
        409,
        true,
        "Event Promoters are required when Ticket Visibility is Promoters"
      );
    }

    // Additional validation for Event Promoters
    if (EventTicketVisibility == TicketVisiblity.Promoters) {
      const foundEventPromoters = isEventExists._doc.EventPromoter;
      const eventAssignedPromoters = new Set(
        foundEventPromoters.map((data) => data.promoter_id)
      );
      const missingEventAssignedPromoters = EventPromoters.filter(
        (data) => !eventAssignedPromoters.has(data.promoter_id)
      );
      if (missingEventAssignedPromoters.length > 0) {
        return sendResponse(
          res,
          404,
          true,
          "Event Assigned Promoters Not Found"
        );
      }
    }

    // Handler for SingleDay tickets
    if (EventTicketType == TicketType.SingleDay) {
      const eventDateTimeFilterQuery = { Event_id: Event_id };
      const eventDatesTime = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );

      if (eventDatesTime.length > 1) {
        return sendResponse(
          res,
          409,
          true,
          "EventTicketType cannot be SingleDay as it has MultipleDay Events"
        );
      }

      const EventDateTime_id = eventDatesTime[0]._doc._id;
      const trimmedEventTicketName = Name.trim();
      const nameRegex = new RegExp(`^${trimmedEventTicketName}$`, "i");
      const eventTicketsFilterQuery = {
        Event_id: Event_id,
        EventDateTime_id: EventDateTime_id,
        Name: nameRegex,
      };
      const existingTicket = await getEventTicketDataService(
        eventTicketsFilterQuery
      );
      if (existingTicket.length > 0) {
        return sendResponse(
          res,
          409,
          true,
          `A ticket with the name "${Name}" already exists`
        );
      }

      const eventTicketObj = {
        _id: uuidv4(),
        Event_id,
        TicketType: EventTicketType,
        Visibility: EventTicketVisibility,
        Promoters: EventPromoters || [],
        EventDateTime_id: EventDateTime_id,
        Name: trimmedEventTicketName,
        Description: Description ? Description : null,
        Price,
        Quantity,
        BookingMaxLimit,
        createdAt: getCurrentDateTime(),
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      };
      const newEventTicket = await createEventTicketService(eventTicketObj);

      // Send success response
      return sendResponse(
        res,
        201,
        false,
        "Event Ticket Created successfully",
        newEventTicket
      );
    }

    // Handler for MultipleDay tickets
    if (EventTicketType == TicketType.MultipleDay) {
      const eventDateTimeFilterQuery = { Event_id: Event_id };
      const eventDatesTime = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );

      const eventDateTimeIds = new Set(eventDatesTime.map((data) => data._id));
      const missingEventDateTimes = EventDateTimeIds.filter(
        (data) => !eventDateTimeIds.has(data.eventDateTime_id)
      );
      if (missingEventDateTimes.length > 0) {
        return sendResponse(res, 404, true, "Event Date Time Not Found");
      }

      const reqBodyEventDateTimeIds = EventDateTimeIds.map(
        (mp) => mp.eventDateTime_id
      );
      const trimmedEventTicketName = Name.trim();
      const nameRegex = new RegExp(`^${trimmedEventTicketName}$`, "i");
      const eventTicketsFilterQuery = {
        Event_id: Event_id,
        EventDateTime_id: reqBodyEventDateTimeIds,
        Name: nameRegex,
      };
      const existingTicket = await getEventTicketDataService(
        eventTicketsFilterQuery
      );
      if (existingTicket.length > 0) {
        return sendResponse(
          res,
          409,
          true,
          `A ticket with the name "${trimmedEventTicketName}" already exists for one of the provided event date/time IDs.`
        );
      }

      try {
        const createTickets = await Promise.all(
          EventDateTimeIds.map(async (ticketData) => {
            const EventTicketDateTimeId = ticketData.eventDateTime_id;

            const eventTicketObj = {
              _id: uuidv4(),
              Event_id,
              TicketType: EventTicketType,
              Visibility: EventTicketVisibility,
              Promoters: EventPromoters || [],
              EventDateTime_id: EventTicketDateTimeId,
              Name: trimmedEventTicketName,
              Description: Description ? Description : null,
              Price,
              Quantity,
              BookingMaxLimit,
              createdAt: getCurrentDateTime(),
              FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
            };

            console.log("Creating ticket with data:", eventTicketObj);

            try {
              const newEventTicket = await createEventTicketService(
                eventTicketObj
              );
              console.log("Ticket created:", newEventTicket);
              return newEventTicket;
            } catch (serviceError) {
              console.error("Error creating ticket:", serviceError);
              throw serviceError; // Re-throw to be caught by outer Promise.all
            }
          })
        );

        console.log("All tickets created:", createTickets);
        // Send success response
        return sendResponse(
          res,
          201,
          false,
          "Event Ticket Created successfully",
          createTickets
        );
      } catch (error) {
        console.error("Error in Promise.all:", error);
      }
    }

    // Handler for SeasonPass tickets
    if (EventTicketType == TicketType.SeasonPass) {
      const eventDateTimeFilterQuery = { Event_id: Event_id };
      const eventDatesTime = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );

      const eventDateTimeArray = eventDatesTime.map((data) => ({
        eventDateTime_id: data._id,
      }));
      const reqBodyEventDateTimeIds = eventDatesTime.map((mp) => mp._id);

      const trimmedEventTicketName = Name.trim();
      const nameRegex = new RegExp(`^${trimmedEventTicketName}$`, "i");
      const eventTicketsFilterQuery = {
        Event_id: Event_id,
        "MultiplePassDates.eventDateTime_id": { $in: reqBodyEventDateTimeIds },
        Name: nameRegex,
      };
      const existingTicket = await getEventTicketDataService(
        eventTicketsFilterQuery
      );
      if (existingTicket.length > 0) {
        return sendResponse(
          res,
          409,
          true,
          `A ticket with the name "${trimmedEventTicketName}" already exists for one of the provided event date/time IDs.`
        );
      }

      const eventTicketObj = {
        _id: uuidv4(),
        Event_id,
        TicketType: EventTicketType,
        Visibility: EventTicketVisibility,
        Promoters: EventPromoters || [],
        Name: trimmedEventTicketName,
        Description: Description ? Description : null,
        Price,
        Quantity,
        BookingMaxLimit,
        createdAt: getCurrentDateTime(),
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      };
      const newEventTicket = await createEventTicketService(eventTicketObj);

      // Send success response
      return sendResponse(
        res,
        201,
        false,
        "Event Ticket Created successfully",
        newEventTicket
      );
    }
  } catch (error) {
    // Handle errors
    console.error("Create Event Ticket Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventTicketDetailsById = async (req, res) => {
  try {
    console.log("Get Event Ticket By Id Api Called");
    console.log(
      "Event Ticket Id:-----> " + JSON.stringify(req.body.eventTicket_id)
    );

    const { eventTicket_id } = req.body;

    if (!eventTicket_id) {
      return sendResponse(res, 404, true, "Event Ticket Id Not Provided");
    }

    const eventTicketFilterQuery = {
      _id: eventTicket_id,
    };
    let isEventTicketExists = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!isEventTicketExists) {
      return sendResponse(res, 404, true, "Event Tickets not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Event Tickets fetched successfully",
      isEventTicketExists
    );
  } catch (error) {
    console.error("Get Event Tickets By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateEventTicketbyId = async (req, res) => {
  try {
    console.log("Update Event Tickets By Id API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate the request body
    const validationResponse = await validateEventTicketUpdate(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      Event_id,
      eventTicket_id,
      EventTicketVisibility,
      Description,
      Quantity,
      Price,
      BookingMaxLimit,
      EventPromoters,
    } = req.body;

    // Check if the event exists
    const eventFilterQuery = { _id: Event_id };
    const isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 409, true, "Event Not Found");
    }

    // Check the current event status
    // const currentEventStatus = isEventExists._doc.EventStatus;
    // const nonModifiableStatuses = [
    //   EventStatus.Draft,
    //   EventStatus.InReview,
    //   EventStatus.ReviewRejected,
    //   EventStatus.Completed,
    // ];

    // if (nonModifiableStatuses.includes(currentEventStatus)) {
    //   return sendResponse(
    //     res,
    //     409,
    //     true,
    //     `Event Status is ${currentEventStatus} and cannot be modified`
    //   );
    // }

    // Check if the event ticket exists
    const eventTicketFilterQuery = {
      _id: eventTicket_id,
      Event_id: Event_id,
    };
    const isEventTicketExists = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!isEventTicketExists) {
      return sendResponse(res, 404, true, "Event Ticket not found");
    }

    const EventTicketCurrentQuantity = isEventTicketExists.Quantity;

    if (Quantity) {
      if (Quantity < EventTicketCurrentQuantity) {
        return sendResponse(
          res,
          409,
          true,
          "Event Qunatity cannot be less than previous Quantity"
        );
      }
    }

    // Validate and update EventTicketVisibility
    if (EventTicketVisibility) {
      if (EventTicketVisibility == TicketVisiblity.Promoters) {
        if (!EventPromoters) {
          return sendResponse(
            res,
            409,
            true,
            "Event Promoters Not Provided. It is Mandatory When Ticket Visibility is Promoters"
          );
        }

        const foundEventPromoters = isEventExists._doc.EventPromoter;
        const eventAssignedPromoters = new Set(
          foundEventPromoters.map((data) => data.promoter_id)
        );

        const missingEventAssignedPromoters = EventPromoters.filter(
          (data) => !eventAssignedPromoters.has(data.promoter_id)
        );

        if (missingEventAssignedPromoters.length > 0) {
          return sendResponse(
            res,
            404,
            true,
            "Event Assigned Promoters Not Found"
          );
        }

        isEventTicketExists.Promoters = EventPromoters;
      }
      isEventTicketExists.Visibility = EventTicketVisibility;
    }

    // Update the other fields if provided
    if (Description) isEventTicketExists.Description = Description;
    if (Quantity) isEventTicketExists.Quantity = Quantity;
    if (Price) isEventTicketExists.Price = Price;
    if (BookingMaxLimit) isEventTicketExists.BookingMaxLimit = BookingMaxLimit;

    // Save the updated event ticket
    await isEventTicketExists.save();

    return sendResponse(
      res,
      200,
      false,
      "Event Ticket updated successfully",
      isEventTicketExists
    );
  } catch (error) {
    console.error("Update Event Ticket Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const UpdateTicketAvailabilityToSoldOut = async (req, res) => {
  try {
    console.log(
      "Update Ticket Avaiability to Sold Out by Ticket Id API Called"
    );
    console.log(
      "EventTicket Id:-----> " + JSON.stringify(req.body.eventTicket_id)
    );

    const { eventTicket_id } = req.body;

    if (!eventTicket_id) {
      return sendResponse(res, 404, true, "Event Ticket Id Not Provided");
    }

    const eventTicketFilterQuery = {
      _id: eventTicket_id,
    };
    const EventTicketsData = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!EventTicketsData) {
      return sendResponse(res, 404, true, "Event Tickets not found");
    }

    const eventTicketUpdateQuery = {
      EventTicketAvailability: TicketAvailability.SoldOut,
    };
    const UpdatedTicketData = await updateEventTicketDataService(
      eventTicketFilterQuery,
      eventTicketUpdateQuery
    );

    return sendResponse(
      res,
      200,
      false,
      "Update Event Tickets Availability To Sold Out"
    );
  } catch (error) {
    console.error(
      "Error in updating Event Tickets Availability to SoldOut:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const UpdateTicketAvailabilityToAvailable = async (req, res) => {
  try {
    console.log(
      "Update Ticket Avaiability to Available by Ticket Id API Called"
    );
    console.log(
      "EventTicket Id:-----> " + JSON.stringify(req.body.eventTicket_id)
    );

    const { eventTicket_id } = req.body;

    if (!eventTicket_id) {
      return sendResponse(res, 404, true, "Event Ticket Id Not Provided");
    }

    const eventTicketFilterQuery = {
      _id: eventTicket_id,
    };
    const EventTicketsData = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!EventTicketsData) {
      return sendResponse(res, 404, true, "Event Tickets not found");
    }

    const eventTicketUpdateQuery = {
      EventTicketAvailability: TicketAvailability.Available,
    };
    const UpdatedTicketData = await updateEventTicketDataService(
      eventTicketFilterQuery,
      eventTicketUpdateQuery
    );

    return sendResponse(
      res,
      200,
      false,
      "Event Tickets Availability Updated successfully"
    );
  } catch (error) {
    console.error(
      "Error in updating Event Tickets Availability to Available:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnableEventTicket = async (req, res) => {
  try {
    console.log("Enable the Event Ticket Api Called ");
    console.log(
      "EventTicket Id:-----> " + JSON.stringify(req.body.eventTicket_id)
    );

    const { eventTicket_id } = req.body;

    if (!eventTicket_id) {
      return sendResponse(res, 404, true, "Event Ticket Id Not Provided");
    }

    const eventTicketFilterQuery = {
      _id: eventTicket_id,
    };
    const EventTicketsData = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!EventTicketsData) {
      return sendResponse(res, 404, true, "Event Tickets not found");
    }

    const eventTicketUpdateQuery = {
      EventTicketStatus: TicketStatus.Enable,
    };
    const UpdatedTicketData = await updateEventTicketDataService(
      eventTicketFilterQuery,
      eventTicketUpdateQuery
    );

    return sendResponse(res, 200, false, "Event Tickets Enabled successfully");
  } catch (error) {
    console.error("Error in updating Event Tickets Status to Enable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisableEventTicket = async (req, res) => {
  try {
    console.log("Disable Event Ticket Id API Called");
    console.log(
      "EventTicket Id:-----> " + JSON.stringify(req.body.eventTicket_id)
    );

    const { eventTicket_id } = req.body;

    if (!eventTicket_id) {
      return sendResponse(res, 404, true, "Event Ticket Id Not Provided");
    }
    const eventTicketFilterQuery = {
      _id: eventTicket_id,
    };
    const EventTicketsData = await findOneEventTicketDataService(
      eventTicketFilterQuery
    );

    if (!EventTicketsData) {
      return sendResponse(res, 404, true, "Event Tickets not found");
    }

    const eventTicketUpdateQuery = {
      EventTicketStatus: TicketStatus.Disable,
    };
    const UpdatedTicketData = await updateEventTicketDataService(
      eventTicketFilterQuery,
      eventTicketUpdateQuery
    );

    return sendResponse(res, 200, false, "Event Tickets Disabled successfully");
  } catch (error) {
    console.error("Error in Disable Event Tickets", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoterTicketsbyEventDate = async (req, res) => {
  try {
    console.log("Get Promoter Event Tickets by Event Date Id API Called");
    console.log("Request Body: ", req.body);

    const validationResponse = await validatePromoterEventTicketsByEventDates(
      req.body
    );
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { event_id, eventDateTime_id, promoter_id } = req.body;

    // Using async/await for the service calls in parallel
    const [promoter, event, eventDateTime, eventTickets] = await Promise.all([
      findOnePromoterDataService({ _id: promoter_id, status: Status.Active }),
      findOneEventDataService({ _id: event_id }),
      findOneEventDateTimeDataService({
        _id: eventDateTime_id,
        Event_id: event_id,
      }),
      getEventTicketDataService({
        Event_id: event_id,
        EventDateTime_id: eventDateTime_id,
      }),
    ]);

    // Check if promoter, event, or event datetime is missing
    if (!promoter) return sendResponse(res, 409, true, "Promoter Not Found");
    if (!event) return sendResponse(res, 409, true, "Event Not Found");
    if (!eventDateTime)
      return sendResponse(res, 409, true, "Event Date Time Not Found");
    if (!eventTickets)
      return sendResponse(res, 409, true, "Event Tickets Not Found");

    // Filter and map the event tickets
    const promoterEventTickets = eventTickets
      .filter(
        ({
          Visibility,
          Promoters,
          EventTicketAvailability,
          EventTicketStatus,
        }) =>
          EventTicketAvailability == TicketAvailability.Available &&
          EventTicketStatus == TicketStatus.Enable &&
          (Visibility == TicketVisiblity.All ||
            (Visibility == TicketVisiblity.Promoters &&
              Promoters.some(({ promoter_id: id }) => id == promoter_id)))
      )
      .map((ticket) => ({
        ...ticket._doc,
        EventStartDateTime: eventDateTime.EventStartDateTime,
        EventEndDateTime: eventDateTime.EventEndDateTime,
      }));

    // Check if promoter event tickets exist
    if (!promoterEventTickets.length) {
      return sendResponse(res, 404, true, "No Tickets Found for the Promoter");
    }

    const sortedTickets = promoterEventTickets.sort(
      (a, b) => a.Price - b.Price
    );

    return sendResponse(
      res,
      200,
      false,
      "Promoter Event Tickets fetched successfully",
      sortedTickets
    );
  } catch (error) {
    console.error("Error in fetching Promoter Event Tickets Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoterSeasonPass = async (req, res) => {
  try {
    console.log("Get Promoter Season Pass Tickets by Id API Called");
    console.log("Request Body: ", req.body);

    const { event_id, promoter_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 409, true, "Event Id Not Found");
    }

    if (!promoter_id) {
      return sendResponse(res, 409, true, "Promoter Id Not Found");
    }

    // Using async/await for the service calls in parallel
    const [promoter, event, eventDateTime, eventTicketsSeasonPass] =
      await Promise.all([
        findOnePromoterDataService({ _id: promoter_id, status: Status.Active }),
        findOneEventDataService({ _id: event_id }),
        getEventDateTimeDataService({
          Event_id: event_id,
        }),
        getEventTicketDataService({
          Event_id: event_id,
          TicketType: TicketType.SeasonPass,
        }),
      ]);

    // Check if promoter, event, or event datetime is missing
    if (!promoter) return sendResponse(res, 409, true, "Promoter Not Found");
    if (!event) return sendResponse(res, 409, true, "Event Not Found");
    if (!eventDateTime)
      return sendResponse(res, 409, true, "Event Date Time Not Found");
    if (!eventTicketsSeasonPass) {
      return sendResponse(res, 409, true, "Event Season Passes Not Found");
    }

    const arrangedEventDateTime = SortEventDateTime(eventDateTime);

    const eventdateTimeFirstObj = arrangedEventDateTime[0]._doc;

    const promoterEventSeasonPassTickets = eventTicketsSeasonPass
      .filter(
        ({
          Visibility,
          Promoters,
          EventTicketAvailability,
          EventTicketStatus,
        }) =>
          EventTicketAvailability == TicketAvailability.Available &&
          EventTicketStatus == TicketStatus.Enable &&
          (Visibility == TicketVisiblity.All ||
            (Visibility == TicketVisiblity.Promoters &&
              Promoters.some(({ promoter_id: id }) => id == promoter_id)))
      )
      .map((ticket) => ({
        ...ticket._doc,
        EventStartDateTime: eventdateTimeFirstObj.EventStartDateTime,
        EventEndDateTime: eventdateTimeFirstObj.EventEndDateTime,
      }));

    // Check if promoter event tickets exist
    if (!promoterEventSeasonPassTickets.length) {
      return sendResponse(
        res,
        404,
        true,
        "No Season Pass Found for the Promoter"
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Promoter Event Season Pass Tickets fetched successfully",
      promoterEventSeasonPassTickets
    );
  } catch (error) {
    console.error("Error in fetching Promoter Event Tickets Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getBookingDetails = async (Booking_id) => {
  // Fetch the booking data
  const BookingData = await findOneEventBookingsDataService({
    Booking_id,
    status: BookingStatus.Booked,
  });

  if (!BookingData) {
    return null;
  }

  const { event_id, EventTicketType, EventTicket_id, TicketQuantity } =
    BookingData;

  // Fetch event and ticket data in parallel
  const [EventData, TicketData] = await Promise.all([
    findOneEventDataService({ _id: event_id }),
    findOneEventTicketDataService({ _id: EventTicket_id }),
  ]);

  let EventVenue, VenueCity;

  const VenueToBeAnnouncedFlag = EventData._doc.VenueToBeAnnounced;
  const OnlineEventFlag = EventData._doc.OnlineEventFlag;
  const VenueEventFlag = EventData._doc.VenueEventFlag;

  // Determine event venue and city
  if (VenueEventFlag == IsVenueAvailable.Yes) {
    const venue_id = EventData._doc.venue_id;
    const VeneDetails = await findOneVenueDataService({ _id: venue_id });
    EventVenue = VeneDetails._doc.Name;
    VenueCity = VeneDetails._doc.City;
  } else if (OnlineEventFlag == IsOnlineEvent.Yes) {
    EventVenue = "Online Event";
    VenueCity = `Online`;
  } else if (VenueToBeAnnouncedFlag == EventVenueTobeAnnounced.Yes) {
    EventVenue = "Venue to be Announced";
    VenueCity = `Online`;
  }

  let EventDateTimeData, BookedEventTicketType;

  // Check if it's a SingleDay or SeasonPass type ticket
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
    const eventTicketFilterQuery = { Event_id: event_id };
    const EventDateAllTimeData = await getEventDateTimeDataService(
      eventTicketFilterQuery
    );
    const arrangedEventDateTime = SortEventDateTime(EventDateAllTimeData);
    EventDateTimeData = arrangedEventDateTime[0];
    BookedEventTicketType = "Season Pass";
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

  // Generate the QR code
  const qrObj = {
    Booking_id: Booking_id,
    TicketType: TicketData._doc.TicketType,
  };
  const qrCodeUrl = await generateQRCode(qrObj);

  return {
    BookingData,
    TicketData,
    EventData,
    EventVenue,
    VenueCity,
    EventDate,
    EventTime,
    TicketQuantity,
    BookedEventTicketType,
    qrCodeUrl,
  };
};

const renderTicketbyBookingId = async (req, res) => {
  try {
    console.log("Get Tickets Data for Rendering Ticket API Called");
    console.log("Booking_Id: ", req.params.Booking_id);

    const { Booking_id } = req.params;

    // Use the helper function to get booking details
    const ticketDetails = await getBookingDetails(Booking_id);

    if (!ticketDetails) {
      return res.status(404).render("booking-not-found");
    }

    const {
      EventData,
      TicketData,
      EventVenue,
      VenueCity,
      EventDate,
      EventTime,
      TicketQuantity,
      BookedEventTicketType,
      qrCodeUrl,
    } = ticketDetails;

    const logoUrl = ImagesUrls.EventingClubLogo;

    const ticketData = {
      logoUrl,
      eventName: EventData.EventName,
      TicketName: TicketData._doc.Name,
      EventDate,
      EventTime,
      EventVenue,
      TicketQuantity,
      VenueCity,
      qrCodeUrl,
      Booking_id,
      BookedEventTicketType,
    };

    res.render("renderticket", { ticket: ticketData });
  } catch (error) {
    console.error("Error in RenderTicket function:", error);
    return sendResponse(res, 500, true, `Internal Server Error`);
  }
};

const DownloadRenderedTicket = async (req, res) => {
  const { Booking_id } = req.params;

  if (!Booking_id) {
    return sendResponse(res, 409, true, `Booking Id not Provided`);
  }

  // Use the helper function to get booking details
  const ticketDetails = await getBookingDetails(Booking_id);

  if (!ticketDetails) {
    return res.status(404).send("Booking not found");
  }

  const {
    EventData,
    TicketData,
    EventVenue,
    VenueCity,
    EventDate,
    EventTime,
    TicketQuantity,
    BookedEventTicketType,
    qrCodeUrl,
  } = ticketDetails;

  const logoUrl = ImagesUrls.EventingClubLogo;

  const ticketData = {
    logoUrl,
    eventName: EventData.EventName,
    TicketName: TicketData._doc.Name,
    EventDate,
    EventTime,
    EventVenue,
    TicketQuantity,
    VenueCity,
    qrCodeUrl,
    Booking_id,
    BookedEventTicketType,
  };

  // Render the EJS template
  const html = await ejs.renderFile(
    path.join(__dirname, "..", "..", "..", "views", "renderticket.ejs"),
    { ticket: ticketData }
  );

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1280, height: 800 });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=ticket-${Booking_id}.pdf`
  );
  res.send(pdfBuffer);
};

export {
  getAllEventTickets,
  updateEventTicketbyId,
  createEventTicket,
  getEventTicketDetailsById,
  UpdateTicketAvailabilityToSoldOut,
  UpdateTicketAvailabilityToAvailable,
  EnableEventTicket,
  DisableEventTicket,
  getTicketsByFilter,
  getPromoterTicketsbyEventDate,
  getPromoterSeasonPass,
  renderTicketbyBookingId,
  DownloadRenderedTicket,
};
