import sendResponse from "../../../helpers/sendResponse.js";
import {
  TicketStatus,
  TicketType,
  TicketVisiblity,
} from "../../../helpers/Enum.js";
import { getEventTicketDataService } from "../../../services/EventTicketServices.js";
import { findOneEventDataService } from "../../../services/EventServices.js";
import { findOneEventDateTimeDataService } from "../../../services/EventDateTimeServices.js";

const getWebsiteTicketsbyEventDate = async (req, res) => {
  try {
    console.log("Get Webiste Event Tickets by Event Date Id API Called");
    console.log("Request Body: ", req.body);

    const { event_id, eventDateTime_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Found");
    }

    if (!eventDateTime_id) {
      return sendResponse(res, 404, true, "Event Date Time Id Not Found");
    }

    const [event, eventDateTime, eventTickets] = await Promise.all([
      findOneEventDataService({ _id: event_id }),
      findOneEventDateTimeDataService({
        _id: eventDateTime_id,
        Event_id: event_id,
      }),
      getEventTicketDataService({
        Event_id: event_id,
        EventDateTime_id: eventDateTime_id,
        Visibility: {
          $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
        },
        EventTicketStatus: TicketStatus.Enable,
      }),
    ]);

    if (!event) return sendResponse(res, 404, true, "Event Not Found");
    if (!eventDateTime)
      return sendResponse(res, 404, true, "Event Date Time Not Found");
    if (eventTickets.length == 0)
      return sendResponse(res, 404, true, "Event Tickets Not Found");

    const formattedEventTicketsData = eventTickets.map((data) => {
      return {
        Ticket_Id: data._doc._id,
        TicketName: data._doc.Name,
        TicketType: data._doc.TicketType,
        TicketDescprition: data._doc.Description,
        TicketPrice: data._doc.Price,
        EventDateTime_id: data._doc.EventDateTime_id,
        TicketAvailibilty: data._doc.EventTicketAvailability,
        BookingMaxLimit: data._doc.BookingMaxLimit,
        ConfeeUnit: event._doc.ConvinienceFeeUnit,
        ConValue: event._doc.ConvinienceFeeValue,
      };
    });

    const sortedTickets = formattedEventTicketsData.sort(
      (a, b) => a.TicketPrice - b.TicketPrice
    );

    return sendResponse(
      res,
      200,
      false,
      "Event Tickets fetched successfully",
      sortedTickets
    );
  } catch (error) {
    console.error("Error in fetching Website Event Tickets By Id Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getWebsiteSeasonPass = async (req, res) => {
  try {
    console.log("Get Website Season Pass Tickets by Event Id API Called");
    console.log("Request Body: ", req.body);

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 409, true, "Event Id Not Found");
    }

    const [event, eventTicketsSeasonPass] = await Promise.all([
      findOneEventDataService({ _id: event_id }),
      getEventTicketDataService({
        Event_id: event_id,
        Visibility: {
          $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
        },
        TicketType: TicketType.SeasonPass,
        EventTicketStatus: TicketStatus.Enable,
      }),
    ]);

    if (!event) return sendResponse(res, 409, true, "Event Not Found");
    if (!eventTicketsSeasonPass) {
      return sendResponse(res, 409, true, "Event Season Passes Not Found");
    }

    const formattedEventTicketsData = eventTicketsSeasonPass.map((data) => {
      return {
        Ticket_Id: data._doc._id,
        TicketName: data._doc.Name,
        TicketType: data._doc.TicketType,
        TicketDescprition: data._doc.Description,
        TicketPrice: data._doc.Price,
        TicketAvailibilty: data._doc.EventTicketAvailability,
        BookingMaxLimit: data._doc.BookingMaxLimit,
        ConfeeUnit: event._doc.ConvinienceFeeUnit,
        ConValue: event._doc.ConvinienceFeeValue,
      };
    });

    return sendResponse(
      res,
      200,
      false,
      "Event Season Pass Tickets fetched successfully",
      formattedEventTicketsData
    );
  } catch (error) {
    console.error("Error in fetching Promoter Event Tickets Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getWebsiteTicketsbyEventDate, getWebsiteSeasonPass };
