import sendResponse from "../../../helpers/sendResponse.js";
import {
  getCategoryDataService,
  getCategoryByIdService,
} from "../../../services/CategoryServices.js";
import {
  getFormattedEventCardData,
  getEventDataService,
  WebsiteCommonEventFilterQuery,
} from "../../../services/EventServices.js";
import {
  getUpcomingEventIds,
  getEventDateTimeDataService,
} from "../../../services/EventDateTimeServices.js";
import { Status } from "../../../helpers/Enum.js";
import {
  validateSearchQuery,
  validateCategoryEventsData,
} from "../../../validations/index.js";
import { Category } from "../../../models/AllModels.js";

const getAllCategoryData = async (req, res) => {
  try {
    console.log("Get All Category API Called");

    const filterQuery = { status: Status.Active };
    const CategoryData = await Category.find({ filterQuery }).sort({
      Priority: 1,
    });

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }

    const categoriesWithPriority0 = CategoryData.filter(
      (category) => category.Priority == 0
    );
    const otherCategories = CategoryData.filter(
      (category) => category.Priority != 0
    );

    const sortedCategories = [...otherCategories, ...categoriesWithPriority0];

    return sendResponse(
      res,
      200,
      false,
      "Category fetched successfully",
      sortedCategories
    );
  } catch (error) {
    console.error("Error in fetching Category Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCategoriesBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Category by Keyword  API Called");
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

    const CategoryData = await getCategoryDataService(filterQuery);

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Category fetched successfully",
      CategoryData
    );
  } catch (error) {
    console.error(
      "Error in fetching Category Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCategoryEvents = async (req, res) => {
  try {
    console.log("Get Events Category By Id For Website Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateCategoryEventsData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { category_id, startDate, endDate, LanguageName, Genre_id } =
      req.body;

    const category = await getCategoryByIdService(category_id);
    if (!category) {
      return sendResponse(res, 404, true, "Category not found");
    }

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      "EventCategories.category_id": category_id,
      // _id: { $in: EventIds },
      ...WebsiteCommonEventFilterQuery,
    };

    if (LanguageName) {
      EventFilterfilterQuery.EventLanguages = {
        $in: [LanguageName.trim()],
      };
    }

    if (Genre_id) {
      EventFilterfilterQuery["EventGenre.genre_id"] = Genre_id;
    }

    const CategoryEvents = await getEventDataService(EventFilterfilterQuery);

    if (CategoryEvents.length == 0) {
      return sendResponse(res, 404, false, `No ${category.Name} Events Found`);
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = CategoryEvents.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const updatedEventsDataArray = await getFormattedEventCardData(
        filteredEvents
      );

      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        updatedEventsDataArray.reverse()
      );
    }

    const updatedEventsDataArray = await getFormattedEventCardData(
      CategoryEvents
    );

    return sendResponse(
      res,
      200,
      false,
      "Category Events fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Get Category Events By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getAllCategoryData, getCategoryEvents, getCategoriesBySearchKeyword };
