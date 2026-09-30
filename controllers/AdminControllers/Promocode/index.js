import {
  validatePromocodeCreation,
  validateCategoryDataUpdate,
  validateCategoryImageDelete,
  validateCategoryImageUpload,
  validateSearchQuery,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import path from "path";
import fs from "fs/promises";
import {
  ImagesPath,
  PromocodeCanbeUsedIn,
  PromocodeUnit,
  PromocodeOneTimePerCustomerFlag,
  PromocodeValid,
  EventStatus,
  Status,
  PromocodeStatus,
} from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  fetchCategoryDetailsFromDbService,
  createCategoryService,
  findOneCategoryDataService,
  getCategoryDataService,
  getCategoryByIdService,
  updateCategoryDataService,
  deleteCategoryByIdService,
} from "../../../services/CategoryServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";
import {
  fetchPromocodeDetailsFromDbService,
  createPromocodeService,
  findOnePromocodeDataService,
  getPromocodeDataService,
  getPromocodeByIdService,
  deletePromocodeByIdService,
  updatePromocodeDataService,
  getPaginatedPromocodeData,
  countPromocodes,
} from "../../../services/PromocodeServices.js";
import { getEventDataService } from "../../../services/EventServices.js";
import { getCustomerDataService } from "../../../services/CustomerServices.js";

const createPromocode = async (req, res) => {
  try {
    console.log("Create Promocode Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validatePromocodeCreation(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      CanBeUsed,
      Events,
      PromoCodeName,
      TermsCondition,
      PromocodeType,
      Value,
      MinCheckoutAmount,
      ExpiryDate,
      OneTimeUseFlag,
      PromocodeValidFor,
    } = req.body;

    const trimmedPromoCodeName = PromoCodeName.trim();
    const trimmedTermsCondition = TermsCondition ? TermsCondition.trim() : null;

    const PromoCodeNameRegex = new RegExp(
      "^" + trimmedPromoCodeName + "$",
      "i"
    );

    const filterQuery = {
      PromoCodeName: PromoCodeNameRegex,
      status: PromocodeStatus.Active,
    };

    const isPromocodeAlreadyExists = await findOnePromocodeDataService(
      filterQuery
    );

    if (isPromocodeAlreadyExists) {
      return sendResponse(res, 409, true, "Promocode Name Already Exists");
    }

    const formattedExpiryDate = `${ExpiryDate}T23:59:59.000+00:00`;

    const promocodeObj = {
      _id: uuidv4(),
      CanBeUsed,
      PromoCodeName: trimmedPromoCodeName,
      TermsCondition: trimmedTermsCondition,
      PromocodeType,
      Value,
      MinCheckoutAmount,
      ExpiryDate: formattedExpiryDate,
      OneTimeUseFlag,
      PromocodeValidFor,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    if (CanBeUsed == PromocodeCanbeUsedIn.SpecificEvents) {
      if (!Events) {
        return sendResponse(
          res,
          404,
          true,
          "Events for Promocode Not Provided"
        );
      }
      const EventIdsArray = Events.map((eventobj) => eventobj.event_id);
      const eventFilterQuery = {
        _id: { $in: EventIdsArray },
        EventStatus: EventStatus.Published,
      };

      const foundEvents = await getEventDataService(eventFilterQuery);

      if (foundEvents.length !== EventIdsArray.length) {
        return sendResponse(res, 404, true, "Some events were not found");
      }

      promocodeObj.Events = Events;
    }

    const newPromocode = await createPromocodeService(promocodeObj);

    return sendResponse(
      res,
      201,
      false,
      "Promocode Created successfully",
      newPromocode
    );
  } catch (error) {
    console.error("Create Promocode Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPromocodes = async (req, res) => {
  try {
    console.log("Get All Promocodes API Called");

    const promocodeData = await getPromocodeDataService({});

    if (!promocodeData.length) {
      return sendResponse(res, 404, true, "Promocodes not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Promocodes fetched successfully",
      promocodeData
    );
  } catch (error) {
    console.error("Error in fetching Promocodes Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedPromocodeData = async (req, res) => {
  try {
    console.log("Get All Promocode by Pagination API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const PromocodeData = await getPaginatedPromocodeData({}, limit, skip);

    if (!PromocodeData.length) {
      return sendResponse(res, 404, true, "Promocode not found");
    }

    const totalPromocodes = await countPromocodes({});

    return sendResponse(res, 200, false, "Promocodes fetched successfully", {
      totalPages: Math.ceil(totalPromocodes / limit),
      currentPage: page,
      totalPromocodes: totalPromocodes,
      PromocodeData: PromocodeData,
    });
  } catch (error) {
    console.error("Error in fetching Promocode Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromocodeById = async (req, res) => {
  try {
    console.log("Get Promocode By Id Api Called");
    console.log("Promocode Id:-----> " + JSON.stringify(req.body.Promocode_id));

    const { Promocode_id } = req.body;

    if (!Promocode_id) {
      return sendResponse(res, 404, true, "Promocode Id Not Provided");
    }

    const promocode = await getPromocodeByIdService(Promocode_id);

    if (!promocode) {
      return sendResponse(res, 404, true, "Promocode not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Promocode fetched successfully",
      promocode
    );
  } catch (error) {
    console.error("Get Promocode By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnablePromocode = async (req, res) => {
  try {
    console.log("Enable the Promocode Api Called ");
    console.log("Promocode Id:-----> " + JSON.stringify(req.body.Promocode_id));

    const { Promocode_id } = req.body;

    if (!Promocode_id) {
      return sendResponse(res, 404, true, "Promocode Id Not Provided");
    }

    const promocodeFilterQuery = {
      _id: Promocode_id,
    };
    const PromocodeData = await findOnePromocodeDataService(
      promocodeFilterQuery
    );

    if (!PromocodeData) {
      return sendResponse(res, 404, true, "Promocode not found");
    }

    const promocodeCurrentStatus = PromocodeData._doc.status;

    if (promocodeCurrentStatus == PromocodeStatus.Expired) {
      return sendResponse(res, 409, true, "Promocode Expired");
    }

    if (promocodeCurrentStatus == PromocodeStatus.Active) {
      return sendResponse(res, 409, true, "Promocode already active");
    }

    const promocodeUpdateQuery = {
      status: PromocodeStatus.Active,
    };
    await updatePromocodeDataService(
      promocodeFilterQuery,
      promocodeUpdateQuery
    );

    return sendResponse(res, 200, false, "Promocode Enabled successfully");
  } catch (error) {
    console.error("Error in updating Promocode Status to Enable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisablePromocode = async (req, res) => {
  try {
    console.log("Disable the Promocode Api Called ");
    console.log("Promocode Id:-----> " + JSON.stringify(req.body.Promocode_id));

    const { Promocode_id } = req.body;

    if (!Promocode_id) {
      return sendResponse(res, 404, true, "Promocode Id Not Provided");
    }

    const promocodeFilterQuery = {
      _id: Promocode_id,
    };
    const PromocodeData = await findOnePromocodeDataService(
      promocodeFilterQuery
    );

    if (!PromocodeData) {
      return sendResponse(res, 404, true, "Promocode not found");
    }
    const promocodeCurrentStatus = PromocodeData._doc.status;

    if (promocodeCurrentStatus == PromocodeStatus.Expired) {
      return sendResponse(res, 409, true, "Promocode Expired");
    }

    if (promocodeCurrentStatus == PromocodeStatus.InActive) {
      return sendResponse(res, 409, true, "Promocode already disabled");
    }

    const promocodeUpdateQuery = {
      status: PromocodeStatus.InActive,
    };
    await updatePromocodeDataService(
      promocodeFilterQuery,
      promocodeUpdateQuery
    );

    return sendResponse(res, 200, false, "Promocode Disable successfully");
  } catch (error) {
    console.error("Error in updating Promocode Status to Disable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoCodeDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Promocode Data by Search Keyword API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSearchQuery(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { search_keyword } = req.body;
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      PromoCodeName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const PromocodeData = await getPromocodeDataService(filterQuery);

    if (!PromocodeData.length) {
      return sendResponse(res, 404, true, "Promocode not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Promocode fetched successfully",
      PromocodeData
    );
  } catch (error) {
    console.error(
      "Error in fetching Promocode Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromocodeDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log("Search Get Promocode Data by Search Keyword API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;

    if (!search_keyword) {
      return sendResponse(res, 400, true, "Search Keyword is required");
    }
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      PromoCodeName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const PromocodeData = await getPaginatedPromocodeData(
      filterQuery,
      limit,
      skip
    );

    if (!PromocodeData.length) {
      return sendResponse(res, 404, true, "Promocode not found");
    }

    const totalPromocodes = await countPromocodes(filterQuery);

    return sendResponse(res, 200, false, "Promocodes fetched successfully", {
      totalPages: Math.ceil(totalPromocodes / limit),
      currentPage: page,
      totalPromocodes: totalPromocodes,
      PromocodeData: PromocodeData,
    });
  } catch (error) {
    console.error(
      "Error in fetching PromocodeData Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createPromocode,
  getAllPromocodes,
  getPromocodeById,
  EnablePromocode,
  DisablePromocode,
  getPromoCodeDataBySearchKeyword,
  getAllPaginatedPromocodeData,
  getPromocodeDataBySearchKeywordPaginated,
};
