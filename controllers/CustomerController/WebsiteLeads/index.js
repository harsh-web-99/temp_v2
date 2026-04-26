import { validateWebsiteLead } from "../../../validations/index.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import {
  insertWebsiteLeadService,
  getWebsiteLeadsService,
  getPaginatedWebsiteLeadsData,
  countWebsiteLeads,
} from "../../../services/WebsiteLeadsServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";

const insertWebsiteLead = async (req, res) => {
  try {
    console.log("Insert Website Lead Details API Called");
    console.log("Request Body Parameters:------> " + JSON.stringify(req.body));

    const response = await validateWebsiteLead(req.body);
    if (response.error) {
      return sendResponse(res, 400, true, response.errorMessage);
    }

    const _id = uuidv4();
    let { FullName, Email, Position, City, CompanyName, PhoneNumber } =
      req.body;

    const leadObj = {
      _id,
      FullName,
      Email,
      Position,
      City,
      CompanyName,
      PhoneNumber,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    let newLead = await insertWebsiteLeadService(leadObj);

    return sendResponse(
      res,
      201,
      false,
      "Details Submitted Successfully",
      newLead
    );
  } catch (error) {
    console.error("Insert WebsiteLead Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedWebsiteLeadsData = async (req, res) => {
  try {
    console.log("Get All WebisteLeads API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const WebsideLeadsData = await getPaginatedWebsiteLeadsData(
      {},
      limit,
      skip
    );

    if (!WebsideLeadsData.length) {
      return sendResponse(res, 404, true, "Website Leads not found");
    }

    const totalLeads = await countWebsiteLeads({});

    return sendResponse(res, 200, false, "Leads fetched successfully", {
      totalPages: Math.ceil(totalLeads / limit),
      currentPage: page,
      totalLeads: totalLeads,
      WebsideLeadsData: WebsideLeadsData,
    });
  } catch (error) {
    console.error("Error in fetching Website Leads Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { insertWebsiteLead, getAllPaginatedWebsiteLeadsData };
