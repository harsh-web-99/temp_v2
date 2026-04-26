import { validateSmtpDetails } from "../../../validations/index.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import {
  registerSmtpService,
  getSmtpDetailsService,
  findOneSmtpDataService,
  updateSmtpDetailsService,
} from "../../../services/SmtpServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";

const registerSmtp = async (req, res) => {
  try {
    console.log("Register Smtp Details API Called");
    console.log("Request Body Parameters:------> " + JSON.stringify(req.body));

    const response = await validateSmtpDetails(req.body);
    if (response.error) {
      return sendResponse(res, 400, true, response.errorMessage);
    }

    const _id = uuidv4();
    let { Port, Host, Username, Password, Encryption } = req.body;

    // Retrieve existing SMTP data
    const existingSmtpData = await getSmtpDetailsService({});

    if (existingSmtpData.length >= 1) {
      return sendResponse(
        res,
        409,
        true,
        "Only One Smtp Details Can be Registered"
      );
    }

    const smtpDetailsObj = {
      _id,
      Port,
      Host,
      Username,
      Password,
      Encryption,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    // Create and save new SMTP details
    let newSmtp = await registerSmtpService(smtpDetailsObj);

    return sendResponse(
      res,
      201,
      false,
      "SMTP Details registered successfully",
      newSmtp
    );
  } catch (error) {
    console.error("Register Smtp Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getSmtpDetails = async (req, res) => {
  try {
    console.log("Get SMTP Details API Called");

    // Retrieve SMTP data from the Smtp model
    const SmtpData = await getSmtpDetailsService({});

    if (SmtpData.length == 0) {
      return sendResponse(res, 404, true, "SMTP Details Not Found");
    }
    return sendResponse(
      res,
      200,
      false,
      "SMTP Details fetched successfully",
      SmtpData[0]
    );
  } catch (err) {
    console.error("Get Smtp Details Error:", err);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateSmtpDetails = async (req, res) => {
  try {
    console.log("Update SMTP Details by Id API Called");
    console.log("Request Body Parameters: " + JSON.stringify(req.body));

    const { smtp_id } = req.body;

    // Validate SMTP details
    const response = await validateSmtpDetails(req.body);
    if (response.error) {
      return sendResponse(res, 400, true, response.errorMessage);
    }

    // Check if the SMTP with the given ID exists
    const filterQuery = {
      _id: smtp_id,
    };
    const existingSmtpDetails = await findOneSmtpDataService(filterQuery);

    if (!existingSmtpDetails) {
      return sendResponse(res, 404, true, "SMTP Details Not Found");
    }

    const updatefilterQuery = {
      _id: smtp_id,
    };

    const updateQuery = req.body;

    // Update the SMTP details

    const SmtpData = await updateSmtpDetailsService(
      updatefilterQuery,
      updateQuery
    );

    return sendResponse(
      res,
      200,
      false,
      "SMTP Details updated successfully",
      SmtpData
    );
  } catch (error) {
    console.error("Update SMTP by Id Error:", err);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { registerSmtp, getSmtpDetails, updateSmtpDetails };
