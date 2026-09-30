import sendResponse from "../../../helpers/sendResponse.js";
import {
  getArtistDataService,
  getArtistByIdService,
  getOtherArtistsService,
} from "../../../services/ArtistServices.js";
import {
  getEventDataService,
  getFormattedEventCardData,
  WebsiteCommonEventFilterQuery,
} from "../../../services/EventServices.js";
import { getUpcomingEventIds } from "../../../services/EventDateTimeServices.js";
import { Status } from "../../../helpers/Enum.js";
import { validateSearchQuery } from "../../../validations/index.js";
import { Artist } from "../../../models/AllModels.js";

const getAllArtistData = async (req, res) => {
  try {
    console.log("Get All Artist Data for Website API Called");

    const filterQuery = { status: Status.Active };
    const ArtistData = await Artist.find({ filterQuery }).sort({
      Priority: 1,
    });

    const artistsWithPriority0 = ArtistData.filter(
      (artist) => artist.Priority == 0
    );
    const otherArtists = ArtistData.filter((artist) => artist.Priority != 0);

    const sortedArtists = [...otherArtists, ...artistsWithPriority0];

    if (!ArtistData.length) {
      return sendResponse(res, 404, true, "Artist not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Artists fetched successfully",
      sortedArtists
    );
  } catch (error) {
    console.error("Error in fetching Artist Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getArtistBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Artist by Keyword  API Called");
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

    const ArtistData = await getArtistDataService(filterQuery);

    if (!ArtistData.length) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Artist fetched successfully",
      ArtistData
    );
  } catch (error) {
    console.error("Error in fetching Artist Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventsByArtist = async (req, res) => {
  try {
    const { artist_id } = req.body;

    if (!artist_id) {
      return sendResponse(res, 400, true, "Artist Id not Provided");
    }

    const artist = await getArtistByIdService(artist_id);
    if (!artist) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    const otherArtists = await getOtherArtistsService(artist_id);

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    const EventFilterQuery = {
      "EventArtist.artist_id": artist_id,
      // _id: { $in: EventIds },
      ...WebsiteCommonEventFilterQuery,
    };

    const currentArtistEvents = await getEventDataService(EventFilterQuery);

    if (currentArtistEvents.length == 0) {
      const resObj = {
        currentArtist: artist,
        currentArtistEvents: [],
        otherArtists: otherArtists,
      };

      return sendResponse(
        res,
        200,
        false,
        "Artist Events fetched successfully",
        resObj
      );
    }

    const updatedEventsDataArray = await getFormattedEventCardData(
      currentArtistEvents
    );

    const resObj = {
      currentArtist: artist,
      currentArtistEvents: updatedEventsDataArray,
      otherArtists: otherArtists,
    };

    return sendResponse(
      res,
      200,
      false,
      "Artist Events fetched successfully",
      resObj
    );
  } catch (error) {
    console.error("Get Artist Events By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getAllArtistData, getArtistBySearchKeyword, getEventsByArtist };
