import {
  getGenreDataService,
  getGenreByIdService,
} from "../../../services/GenreServices.js";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  getFormattedEventCardData,
  getEventDataService,
  WebsiteCommonEventFilterQuery,
} from "../../../services/EventServices.js";
import { getUpcomingEventIds } from "../../../services/EventDateTimeServices.js";
import { Status } from "../../../helpers/Enum.js";
import { validateSearchQuery } from "../../../validations/index.js";

const getAllGenreData = async (req, res) => {
  try {
    console.log("Get All Genre API Called");

    const filterQuery = { status: Status.Active };

    const GenreData = await getGenreDataService(filterQuery);

    if (!GenreData || GenreData.length == 0) {
      return sendResponse(res, 404, true, "Genre not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Genre fetched successfully",
      GenreData
    );
  } catch (error) {
    console.error("Error in fetching Genre Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getGenreBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Genre by Keyword  API Called");
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

    const GenreData = await getGenreDataService(filterQuery);

    if (!GenreData.length) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Genre fetched successfully",
      GenreData
    );
  } catch (error) {
    console.error("Error in fetching Genre Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getGenreEvents = async (req, res) => {
  try {
    console.log("Get Genre Events By VenueId For Website Api Called");
    console.log("Req BodY Parameters:-----> " + JSON.stringify(req.body));

    const { genre_id } = req.body;
    if (!genre_id) {
      return sendResponse(res, 404, true, "Genre Id not Provided");
    }

    // Fetch the current genre by ID
    const venue = await getGenreByIdService(genre_id);
    if (!venue) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      // _id: { $in: EventIds },
      "EventGenre.genre_id": genre_id,
      ...WebsiteCommonEventFilterQuery,
    };

    const VenueEvents = await getEventDataService(EventFilterfilterQuery);

    if (VenueEvents.length == 0) {
      return sendResponse(res, 404, false, `No ${venue.Name} Events Found`);
    }

    const updatedEventsDataArray = await getFormattedEventCardData(VenueEvents);

    return sendResponse(
      res,
      200,
      false,
      "Genre Events fetched successfully",
      updatedEventsDataArray
    );
  } catch (error) {
    console.error("Get Genre Events By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getAllGenreData, getGenreBySearchKeyword, getGenreEvents };
