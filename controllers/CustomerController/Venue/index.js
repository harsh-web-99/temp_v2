import {
  getVenueDataService,
  getVenueByIdService,
} from "../../../services/VenueServices.js";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  getFormattedEventCardData,
  getEventDataService,
  WebsiteCommonEventFilterQuery,
} from "../../../services/EventServices.js";
import { getUpcomingEventIds } from "../../../services/EventDateTimeServices.js";
import { Status } from "../../../helpers/Enum.js";
import { validateSearchQuery } from "../../../validations/index.js";
import { Venue } from "../../../models/AllModels.js";

const getAllVenueData = async (req, res) => {
  try {
    console.log("Get All Venue API Called");

    const filterQuery = { status: Status.Active };

    const VenueData = await Venue.find({ filterQuery }).sort({
      Priority: 1,
    });

    if (!VenueData || VenueData.length == 0) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    const venuesWithPriority0 = VenueData.filter(
      (venue) => venue.Priority == 0
    );
    const otherVenues = VenueData.filter((venue) => venue.Priority != 0);

    const sortedVeues = [...otherVenues, ...venuesWithPriority0];
    return sendResponse(
      res,
      200,
      false,
      "Venue fetched successfully",
      sortedVeues
    );
  } catch (error) {
    console.error("Error in fetching Venue Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenuesBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Venue by Keyword  API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;
    const validationResponse = await validateSearchQuery(req.body);

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const trimmedSearchKeyWord = search_keyword.trim();
    const filterQuery = {
      status: Status.Active,
      Name: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const VenueData = await getVenueDataService(filterQuery);

    if (!VenueData.length) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Venue fetched successfully",
      VenueData
    );
  } catch (error) {
    console.error("Error in fetching Venue Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenueEvents = async (req, res) => {
  try {
    console.log("Get Venue Events By VenueId For Website Api Called");
    console.log("Venue Id:-----> " + JSON.stringify(req.body.venue_id));

    const { venue_id } = req.body;
    if (!venue_id) {
      return sendResponse(res, 404, true, "Venue Id not Provided");
    }

    // Fetch the current venue by ID
    const venue = await getVenueByIdService(venue_id);
    if (!venue) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      // _id: { $in: EventIds },
      venue_id: venue_id,
      ...WebsiteCommonEventFilterQuery,
    };

    const VenueEvents = await getEventDataService(EventFilterfilterQuery);

    if (VenueEvents.length == 0) {
      const resObj = {
        venueName: venue._doc.Name,
        venueImages: venue._doc.Images,
        venueAddress: venue._doc.Address,
        venueDescription: venue._doc.Description,
        venueMapLocation: venue._doc.Map_Location,
        venueEvents: [],
      };

      return sendResponse(
        res,
        200,
        false,
        "Venue Events fetched successfully",
        resObj
      );
    }

    const updatedEventsDataArray = await getFormattedEventCardData(VenueEvents);

    const resObj = {
      venueName: venue._doc.Name,
      venueImages: venue._doc.Images,
      venueAddress: venue._doc.Address,
      venueDescription: venue._doc.Description,
      venueMapLocation: venue._doc.Map_Location,
      venueEvents: updatedEventsDataArray,
    };

    return sendResponse(
      res,
      200,
      false,
      "Venue Events fetched successfully",
      resObj
    );
  } catch (error) {
    console.error("Get Venue Events By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getAllVenueData, getVenueEvents, getVenuesBySearchKeyword };
