import { getHomePageBannerSliderDataService } from "../../../services/HomeBannerSliderServices.js";
import sendResponse from "../../../helpers/sendResponse.js";
import { Status } from "../../../helpers/Enum.js";
import { WebsiteCommonEventFilterQuery } from "../../../services/EventServices.js";
import { Venue, Event } from "../../../models/AllModels.js";

const getAllBannerSliderData = async (req, res) => {
  try {
    console.log("Get All HomePage Banner Slider Data For Website API Called");
    const filterQuery = {
      status: 1,
    };

    const BannerSliderData = await getHomePageBannerSliderDataService(
      filterQuery
    );

    if (!BannerSliderData || BannerSliderData.length == 0) {
      return sendResponse(res, 404, true, "HomePage Banner Slider not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Banner Slider fetched successfully",
      BannerSliderData
    );
  } catch (error) {
    console.error("Error in fetching HomePage Banner Slider Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const searchEventsVenues = async (req, res) => {
  try {
    const { search_keyword } = req.body;

    if (!search_keyword) {
      return sendResponse(res, 400, true, "Search Keyword is required");
    }
    const trimmedSearchKeyWord = search_keyword.trim();

    let EventFilterfilterQuery = {
      ...WebsiteCommonEventFilterQuery,
      EventName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const EventsData = await Event.find(EventFilterfilterQuery).select(
      "EventName"
    );

    if (EventsData.length > 0) {
    }

    const venuefilterQuery = {
      status: Status.Active,
      Name: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const VenueData = await Venue.find(venuefilterQuery).select("Name City");
    if (VenueData.length > 0) {
    }

    const respArr = [...VenueData, ...EventsData];

    return sendResponse(
      res,
      200,
      false,
      "Search Data fetched successfully",
      respArr
    );
  } catch (error) {
    console.error("Error in fetching search Events Venues Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getAllBannerSliderData, searchEventsVenues };
