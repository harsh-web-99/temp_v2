import {
  Organizer,
  SuperAdmin,
  Employee,
  OrganizerAccounts,
} from "../../../models/AllModels.js";
import {
  validaterRegisterOrganizer,
  validateOrganizerLogin,
  validateOrganizerProfileUpdate,
  validateChangePassword,
  validateResetPasswordEmail,
  validateResetPasswordData,
  validateSearchQuery,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import bcrypt from "bcrypt";
const saltRounds = 10;
import generateAuthToken from "../../../helpers/auth.js";
import { encrypt } from "../../../helpers/encryptionUtils.js";
import {
  Status,
  AdminRoles,
  OrganizerOwnerType,
  TicketBookingSource,
  BookingStatus,
} from "../../../helpers/Enum.js";
import crypto from "crypto";
import { ImagesPath, SendDefaultPasswordMail } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import fs from "fs";
import {
  SendDefaultPasswordEmail,
  sendMailForgotPasswordLink,
} from "../../../helpers/mailer.js";
import { Urls } from "../../../config/index.js";
import {
  createOrganizerService,
  findOneOrganizerDataService,
  getOrganizerDataService,
  getOrganizerByIdService,
  updateOrganizerDataService,
  deleteOrganizerByIdService,
  getPaginatedOrganizersData,
  countOrganizers,
} from "../../../services/OrganizerServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";
import {
  getPaginatedEventsData,
  countEvents,
  getEventDataService,
  findOneEventDataService,
} from "../../../services/EventServices.js";
import {
  getEventDateTimeDataService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import { getEventBookingsDataService } from "../../../services/EventBookingServices.js";

const registerOrganizer = async (req, res) => {
  try {
    console.log("Register Organizer Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validaterRegisterOrganizer(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      FullName,
      Username,
      OwnerType,
      CompanyName,
      Email,
      Password,
      Phone1,
      Country,
      CountryIsoCode,
      State,
      StateIsoCode,
      City,
      CityIsoCode,
      SendMailFlag,
      CreatedBy,
      createduser_id,
    } = req.body;

    // Check if SuperAdmin, Organizer, or Employee exists based on CreatedBy role
    if (
      CreatedBy == AdminRoles.SuperAdmin ||
      CreatedBy == AdminRoles.Organizer ||
      CreatedBy == AdminRoles.Employee
    ) {
      const userExists = await (CreatedBy == AdminRoles.SuperAdmin
        ? SuperAdmin
        : CreatedBy == AdminRoles.Organizer
        ? Organizer
        : Employee
      ).findOne({ _id: createduser_id });
      if (!userExists) {
        return sendResponse(res, 404, true, `${CreatedBy} Not Found`);
      }
    }

    const trimmedCompanyName = CompanyName.trim();
    const trimmedFullName = FullName.trim();
    const trimmedUsernameName = Username.trim().toLowerCase();
    const normalizedEmail = Email ? Email.trim().toLowerCase() : null;
    const trimmedPassword = Password.trim();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");
    const emailRegex = normalizedEmail
      ? new RegExp("^" + normalizedEmail + "$", "i")
      : null;

    const filterQuery = {
      $or: [
        { Username: usernameRegex },
        ...(normalizedEmail ? [{ Email: emailRegex }] : []),
      ],
    };

    const existingOrganizer = await findOneOrganizerDataService(filterQuery);

    if (existingOrganizer) {
      const conflictField =
        existingOrganizer.Username.toLowerCase() ==
        trimmedUsernameName.toLowerCase()
          ? "Organizer UserName"
          : "Organizer Email";
      return sendResponse(res, 409, true, `${conflictField} Already Exists`);
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);

    if (SendMailFlag == SendDefaultPasswordMail.Yes) {
      const emailVerificationResponse = await SendDefaultPasswordEmail(
        trimmedFullName,
        Username,
        Email,
        Password,
        "Organizer",
        Urls.OrganizerLogin
      );

      if (emailVerificationResponse == "SmtpDetails Not Found in Database") {
        return sendResponse(
          res,
          404,
          true,
          "SmtpDetails Not Found in Database"
        );
      }
    }

    const organizerObj = {
      _id: uuidv4(),
      FullName: trimmedFullName,
      OwnerType,
      CompanyName: trimmedCompanyName,
      Username: trimmedUsernameName,
      Password: hashedPassword,
      Country,
      CountryIsoCode,
      State,
      StateIsoCode,
      City,
      CityIsoCode,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
      CreatedBy,
      createduser_id,
      Email: normalizedEmail ? normalizedEmail : null,
      Phone1: Phone1 ? Phone1 : null,
    };

    let newOrganizer = await createOrganizerService(organizerObj);

    return sendResponse(
      res,
      201,
      false,
      "Organizer Registered successfully",
      newOrganizer
    );
  } catch (error) {
    console.error("Register Organizer Admin Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const organizerLogin = async (req, res) => {
  try {
    console.log("Organizer Login API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateOrganizerLogin(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { Username, Password } = req.body;

    const trimmedUsernameName = Username.trim().toLowerCase();
    const trimmedPassword = Password.trim();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");

    const filterQuery = {
      Username: usernameRegex,
      status: Status.Active,
    };

    const isOrganizerExists = await findOneOrganizerDataService(filterQuery);

    if (!isOrganizerExists) {
      return sendResponse(res, 409, true, `Invalid Username or Password`);
    }

    const passwordMatch = await bcrypt.compare(
      trimmedPassword,
      isOrganizerExists.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Username or Password");
    }

    const payload = {
      Email: isOrganizerExists.Email,
      CurrentTimeStamp: getCurrentDateTime(),
    };

    const token = generateAuthToken({ payload });
    const encryptedToken = encrypt(token);

    const userData = {
      token: encryptedToken,
      Email: isOrganizerExists.Email,
      Username: isOrganizerExists.FullName,
      user_id: isOrganizerExists._id,
      AdminRole: AdminRoles.Organizer,
    };

    return sendResponse(res, 200, false, "Login successfully", userData);
  } catch (error) {
    console.error("Organizer Login Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllOrganizers = async (req, res) => {
  try {
    console.log("Get All Organizers API Called");
    const filterQuery = {
      status: 1,
    };
    const OrganizersData = await getOrganizerDataService(filterQuery);

    if (!OrganizersData || OrganizersData.length == 0) {
      return sendResponse(res, 404, true, "Organizers not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Organizers fetched successfully",
      OrganizersData
    );
  } catch (error) {
    console.error("Error in fetching Organizer Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getOrganizerById = async (req, res) => {
  try {
    const { user_id } = req.body;

    console.log("Get SuperAdmin By Id Api Called");
    console.log("User Id:-----> " + JSON.stringify(req.body.user_id));

    if (!user_id) {
      return sendResponse(res, 404, true, "User Id Not Provided");
    }
    const filterQuery = {
      _id: user_id,
    };

    let OrganizerExists = await findOneOrganizerDataService(filterQuery);

    if (!OrganizerExists) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Organizer fetched successfully",
      OrganizerExists
    );
  } catch (error) {
    console.error("Get Organizer by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateOrganizerProfileById = async (req, res) => {
  try {
    console.log("Update Organizer Profile By Id Api Called");
    console.log(" Req Body Parameters:-----> " + JSON.stringify(req.body));

    const fieldsConfig = [{ name: "ProfileImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 409, true, `Multer Error`);
      }

      const validationResponse = await validateOrganizerProfileUpdate(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { user_id } = req.body;

      const existingOrganizer = await getOrganizerByIdService(user_id);

      if (!existingOrganizer) {
        return sendResponse(res, 409, true, "Organizer not found");
      }

      if (req.body.FullName) {
        existingOrganizer.FullName =
          req.body.FullName.trim() || existingOrganizer.FullName;
      }

      if (req.body.Email) {
        const normalizedEmail = req.body.Email.trim().toLowerCase();
        const emailRegex = new RegExp("^" + normalizedEmail + "$", "i");

        const filterQuery = {
          Email: emailRegex,
          _id: { $ne: user_id },
        };

        const emailExistsOrganizer = await findOneOrganizerDataService(
          filterQuery
        );

        if (emailExistsOrganizer) {
          return sendResponse(res, 409, true, `Email Already Exists`);
        }

        existingOrganizer.Email = normalizedEmail;
      }

      existingOrganizer.Phone1 = req.body.Phone1 || existingOrganizer.Phone1;
      existingOrganizer.Phone2 = req.body.Phone2 || existingOrganizer.Phone2;
      existingOrganizer.Address = req.body.Address || existingOrganizer.Address;
      existingOrganizer.Country = req.body.Country || existingOrganizer.Country;
      existingOrganizer.CountryIsoCode =
        req.body.CountryIsoCode || existingOrganizer.CountryIsoCode;
      existingOrganizer.State = req.body.State || existingOrganizer.State;
      existingOrganizer.StateIsoCode =
        req.body.StateIsoCode || existingOrganizer.StateIsoCode;
      existingOrganizer.City = req.body.City || existingOrganizer.City;
      existingOrganizer.CityIsoCode =
        req.body.CityIsoCode || existingOrganizer.CityIsoCode;

      if (req.files && req.files.ProfileImage) {
        const OrganizerProfileFolderPath =
          ImagesPath.OrganizerProfileFolderPath;
        if (!fs.existsSync(OrganizerProfileFolderPath)) {
          fs.mkdirSync(OrganizerProfileFolderPath, { recursive: true });
        }
        const updatedProfileImagefilename = sanitizeFileName(
          req.files.ProfileImage[0].originalname
        );

        const OrganizerProfileImagePath = `${OrganizerProfileFolderPath}${Date.now()}-${updatedProfileImagefilename}`;
        fs.writeFileSync(
          OrganizerProfileImagePath,
          req.files.ProfileImage[0].buffer
        );
        if (existingOrganizer.profile_img == undefined) {
          existingOrganizer.profile_img = OrganizerProfileImagePath;
        } else {
          fs.unlinkSync(existingOrganizer.profile_img);
          existingOrganizer.profile_img = OrganizerProfileImagePath;
        }
      }

      await existingOrganizer.save();
      return sendResponse(
        res,
        200,
        false,
        "Organizer Profile Updated Successfully",
        existingOrganizer
      );
    });
  } catch (error) {
    console.error("Update Organizer Profile Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const organizerChangePassword = async (req, res) => {
  try {
    console.log("Organizer Change Password API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateChangePassword(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    let { CurrentPassword, NewPassword, user_id } = req.body;

    const filterQuery = {
      _id: user_id,
      status: Status.Active,
    };

    let OrganizerData = await findOneOrganizerDataService(filterQuery);

    if (!OrganizerData) {
      return sendResponse(res, 409, true, `Organizer not found`);
    }

    const trimmedCurrentPassword = CurrentPassword.trim();
    const trimmedNewPassword = NewPassword.trim();

    const passwordMatch = await bcrypt.compare(
      trimmedCurrentPassword,
      OrganizerData.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Current Password");
    }

    const newpasswordMatch = await bcrypt.compare(
      trimmedNewPassword,
      OrganizerData.Password
    );

    if (newpasswordMatch) {
      return sendResponse(res, 409, true, "Cannot Previous Password");
    }

    const filter = { _id: user_id };

    bcrypt.hash(trimmedNewPassword, saltRounds, async function (err, hash) {
      if (err) {
        console.error(err);
        return sendResponse(res, 500, true, "Error hashing NewPassword");
      }

      const updateFilter = {
        Password: hash,
      };

      await updateOrganizerDataService(filter, updateFilter);
      return sendResponse(res, 200, false, "Password Changed Successfully");
    });
  } catch (error) {
    console.error("Organizer Change Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getForgotPasswordLink = async (req, res) => {
  try {
    const validationResponse = await validateResetPasswordEmail(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { Email } = req.body;

    const normalizedEmail = Email.trim().toLowerCase();
    const emailRegex = new RegExp("^" + normalizedEmail + "$", "i");

    crypto.randomBytes(20, async (err, buf) => {
      if (err) {
        console.error("Error generating random bytes:", err);
        return sendResponse(res, 500, true, `Internal Server Error`);
      }

      const token = buf.toString("hex");

      let OrganizerEmailExists;

      const filterQuery = {
        Email: emailRegex,
      };

      try {
        OrganizerEmailExists = await findOneOrganizerDataService(filterQuery);
      } catch (error) {
        console.error("Error checking if email exists:", error);
        return sendResponse(res, 500, true, `Internal Server Error`);
      }

      if (!OrganizerEmailExists) {
        return sendResponse(res, 500, true, `Invalid Email Address`);
      }
      const OrganizerName = OrganizerEmailExists.FullName;

      OrganizerEmailExists.resetPasswordToken = token;
      OrganizerEmailExists.resetPasswordExpires = Date.now() + 3600000;

      const OrganizerResetPasswordLink = `${Urls.OrganizerResetPassword}/${token}`;

      const response = await sendMailForgotPasswordLink(
        OrganizerResetPasswordLink,
        normalizedEmail,
        OrganizerName
      );

      if (response == "SmtpDetails Not Found in Database") {
        return res.status(403).send("SmtpDetails Not Found in Database");
      }

      try {
        await OrganizerEmailExists.save();
      } catch (error) {
        console.error("Error saving reset token:", error);
        return sendResponse(res, 500, true, `Internal Server Error`);
      }
      return sendResponse(res, 200, true, `Password Reset Token`, token);
    });
  } catch (error) {
    console.error("Error in ForgotPassword function:", error);
    res.status(500).send("Internal Server Error");
  }
};

const resetPassword = async (req, res) => {
  try {
    const validationResponse = await validateResetPasswordData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { new_password } = req.body;
    const { token } = req.params;

    const trimmedPassword = new_password.trim();

    if (!token) {
      return sendResponse(res, 400, true, `Token missing`);
    }

    let OrganizerData;

    try {
      const filterQuery = {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      };

      OrganizerData = await findOneOrganizerDataService(filterQuery);
    } catch (error) {
      console.error("Error finding user by reset token:", error);
      return sendResponse(res, 500, true, `Internal Server Error`);
    }

    if (!OrganizerData) {
      return sendResponse(
        res,
        500,
        true,
        `Password reset token is invalid or has expired.`
      );
    }

    OrganizerData.resetPasswordToken = undefined;
    OrganizerData.resetPasswordExpires = undefined;

    try {
      const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);
      OrganizerData.Password = hashedPassword;

      await OrganizerData.save();

      return sendResponse(res, 200, true, `Password Reset Successfully`);
    } catch (error) {
      console.error("Error resetting password:", error);
      return sendResponse(res, 500, true, `Internal Server Error`);
    }
  } catch (error) {
    console.error("Error in ResetPassword function:", error);
    return sendResponse(res, 500, true, `Internal Server Error`);
  }
};

const getOrganizerDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Organizer Data by Search Keyword  API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSearchQuery(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { search_keyword } = req.body;

    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      $or: [
        { Username: { $regex: new RegExp(trimmedSearchKeyWord, "i") } },
        { FullName: { $regex: new RegExp(trimmedSearchKeyWord, "i") } },
      ],
    };

    const OrganizerData = await getOrganizerDataService(filterQuery);

    if (!OrganizerData.length) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Organizer fetched successfully",
      OrganizerData
    );
  } catch (error) {
    console.error(
      "Error in fetching Organizer Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedOrganizerData = async (req, res) => {
  try {
    console.log("Get All Organizers Data by Pagination API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const OrganizerData = await getPaginatedOrganizersData({}, limit, skip);

    if (!OrganizerData.length) {
      return sendResponse(res, 404, true, "Organizers not found");
    }

    const totalOrganizers = await countOrganizers({});

    return sendResponse(res, 200, false, "Organizers fetched successfully", {
      totalPages: Math.ceil(totalOrganizers / limit),
      currentPage: page,
      totalOrganizers: totalOrganizers,
      OrganizerData: OrganizerData,
    });
  } catch (error) {
    console.error("Error in fetching Organizers Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getOrganizerDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log(
      "Search Get Organizer Paginatined Data by Search Keyword API Called"
    );
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;

    if (!search_keyword) {
      return sendResponse(res, 400, true, "Search Keyword is required");
    }
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      $or: [
        { Username: { $regex: new RegExp(trimmedSearchKeyWord, "i") } },
        { FullName: { $regex: new RegExp(trimmedSearchKeyWord, "i") } },
      ],
    };

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const OrganizerData = await getPaginatedOrganizersData(
      filterQuery,
      limit,
      skip
    );

    if (!OrganizerData.length) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    const totalOrganizers = await countOrganizers(filterQuery);

    return sendResponse(res, 200, false, "Organizers fetched successfully", {
      totalPages: Math.ceil(totalOrganizers / limit),
      currentPage: page,
      totalOrganizers: totalOrganizers,
      OrganizerData: OrganizerData,
    });
  } catch (error) {
    console.error(
      "Error in fetching Organizer Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const organizerUpdatePassword = async (req, res) => {
  try {
    console.log("Organizer Update Password by SuperAdmin API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { organizer_id, new_password, CreatedBy, createduser_id } = req.body;

    if (!organizer_id) {
      return sendResponse(res, 404, true, `Organizer Id Not found`);
    }

    if (!new_password) {
      return sendResponse(res, 404, true, `Password Not found`);
    }

    if (!CreatedBy) {
      return sendResponse(res, 404, true, `CreatedBy not found`);
    }

    if (!createduser_id) {
      return sendResponse(res, 404, true, `createduser_id found`);
    }

    // Check if SuperAdmin, Organizer, or Employee exists based on CreatedBy role
    if (
      CreatedBy == AdminRoles.SuperAdmin ||
      CreatedBy == AdminRoles.Organizer ||
      CreatedBy == AdminRoles.Employee
    ) {
      const userExists = await (CreatedBy == AdminRoles.SuperAdmin
        ? SuperAdmin
        : CreatedBy == AdminRoles.Organizer
        ? Organizer
        : Employee
      ).findOne({ _id: createduser_id });
      if (!userExists) {
        return sendResponse(res, 404, true, `${CreatedBy} Not Found`);
      }
    }

    const trimmedNewPassword = new_password.trim();

    const filterQuery = {
      _id: organizer_id,
      status: Status.Active,
    };

    let organizerData = await findOneOrganizerDataService(filterQuery);

    if (!organizerData) {
      return sendResponse(res, 409, true, `Organizer not found`);
    }

    const filterquery = { _id: organizer_id };

    bcrypt.hash(trimmedNewPassword, saltRounds, async function (err, hash) {
      if (err) {
        console.error(err);
        return sendResponse(res, 500, true, "Error hashing NewPassword");
      }

      const updatefilter = { Password: hash };

      await updateOrganizerDataService(filterquery, updatefilter);
      return sendResponse(res, 200, false, "Password Updated Successfully");
    });
  } catch (error) {
    console.error("Organizer Updated Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnableOrganizer = async (req, res) => {
  try {
    console.log("Enable the Organizer Api Called ");
    console.log("Organizer Id:-----> " + JSON.stringify(req.body.organizer_id));

    const { organizer_id } = req.body;

    if (!organizer_id) {
      return sendResponse(res, 404, true, "Organizer Id Not Provided");
    }

    const organizerFilterQuery = {
      _id: organizer_id,
    };
    const OrganizerData = await findOneOrganizerDataService(
      organizerFilterQuery
    );

    if (!OrganizerData) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    const organizerUpdateQuery = {
      status: Status.Active,
    };
    await updateOrganizerDataService(
      organizerFilterQuery,
      organizerUpdateQuery
    );

    return sendResponse(res, 200, false, "Organizer Enabled successfully");
  } catch (error) {
    console.error("Error in updating Organizer Status to Actiavte:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisableOrganizer = async (req, res) => {
  try {
    console.log("Disable the Organizer Api Called ");
    console.log("Organizer Id:-----> " + JSON.stringify(req.body.organizer_id));

    const { organizer_id } = req.body;

    if (!organizer_id) {
      return sendResponse(res, 404, true, "Organizer Id Not Provided");
    }

    const organizerFilterQuery = {
      _id: organizer_id,
    };
    const OrganizerData = await findOneOrganizerDataService(
      organizerFilterQuery
    );

    if (!OrganizerData) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    const organizerUpdateQuery = {
      status: Status.Inactive,
    };
    await updateOrganizerDataService(
      organizerFilterQuery,
      organizerUpdateQuery
    );

    return sendResponse(res, 200, false, "Organizer Disabled successfully");
  } catch (error) {
    console.error("Error in updating Organizer Status to Deactivate:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

function calculateTotalAmountBySalesType(arr, type) {
  return arr
    .filter((item) => item.BookingSource == type)
    .reduce(
      (totals, item) => {
        totals.totalAmount += item.TotalAmount;
        if (type == TicketBookingSource.Website) {
          totals.totalConvenienceFee += item.ConvenienceFee; // Only online sales have convenience fee
        }
        return totals;
      },
      { totalAmount: 0, totalConvenienceFee: 0 }
    );
}

const OrganizerTotalSalesData = async (req, res) => {
  try {
    console.log("Organizer Total Sales Data API Called");
    const { organizer_id } = req.body; // Extract organizer_id, page, and limit from request body

    // Check if organizer_id is provided
    if (!organizer_id) {
      return sendResponse(res, 404, true, "Organizer ID Not Provided");
    }

    // Query to filter organizer by ID
    const organizerFilterQuery = { _id: organizer_id };
    const OrganizerData = await findOneOrganizerDataService(
      organizerFilterQuery
    );

    // Check if organizer exists
    if (!OrganizerData) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    // Query to find events by organizer
    const organizerEventFilterQuery = {
      $or: [
        { "EventOrganizers.organizer_id": organizer_id },
        { createduser_id: organizer_id },
      ],
    };

    // Fetch all events data to compute total summary
    const OrganizersTotalEventsData = await getEventDataService(
      organizerEventFilterQuery
    );

    // Initialize accumulators for summary data
    let totalEventCount = 0;
    let totalSalesSum = 0;
    let totalPendingAmountSum = 0;
    let totalConvenienceFeeAmountSum = 0;

    // Process each event to calculate total summary (across all events)
    await Promise.all(
      OrganizersTotalEventsData.map(async (event) => {
        const TotalEventBookingsData = await getEventBookingsDataService({
          event_id: event._id,
          status: BookingStatus.Booked,
        });

        const PreviousPaymentData = await OrganizerAccounts.find({
          event_id: event._id,
          status: Status.Active,
        });

        const totalRecivedAmount = PreviousPaymentData.reduce(
          (sum, record) => sum + record.AmountRecived,
          0
        );

        // Reuse the same helper function to calculate sales
        const totalOnlineSales = calculateTotalAmountBySalesType(
          TotalEventBookingsData,
          TicketBookingSource.Website
        );
        const totalPromoterSales = calculateTotalAmountBySalesType(
          TotalEventBookingsData,
          TicketBookingSource.Promoter
        );
        const totalSales =
          totalOnlineSales.totalAmount +
          totalPromoterSales.totalAmount +
          totalOnlineSales.totalConvenienceFee;

        const PendingAmount = totalSales - totalRecivedAmount;

        // Accumulate the values for summary
        totalEventCount++;
        totalSalesSum += totalSales;
        totalPendingAmountSum += PendingAmount; // Assuming pending amount is equal to total sales for now
        totalConvenienceFeeAmountSum += totalOnlineSales.totalConvenienceFee;
      })
    );

    // Construct the total summary data object
    const TotalSummaryData = {
      totalEventCount,
      totalSalesSum,
      totalPendingAmountSum,
      totalConvenienceFeeAmountSum,
    };

    return sendResponse(
      res,
      200,
      false,
      "Organizer's Total Sales Events Fetched Successfully",
      TotalSummaryData
    );
  } catch (error) {}
};

const getOrganizerSalesData = async (req, res) => {
  try {
    console.log("Organizer Sales Data API Called");
    const { organizer_id, page = 1, limit = 10, search_keyword } = req.body; // Extract organizer_id, page, and limit from request body

    const skip = (page - 1) * limit; // Calculate skip for pagination

    // Check if organizer_id is provided
    if (!organizer_id) {
      return sendResponse(res, 404, true, "Organizer ID Not Provided");
    }

    // Query to filter organizer by ID
    const organizerFilterQuery = { _id: organizer_id };
    const OrganizerData = await findOneOrganizerDataService(
      organizerFilterQuery
    );

    // Check if organizer exists
    if (!OrganizerData) {
      return sendResponse(res, 404, true, "Organizer not found");
    }

    // Query to find events by organizer
    const organizerEventFilterQuery = {
      $or: [
        { "EventOrganizers.organizer_id": organizer_id },
        { createduser_id: organizer_id },
      ],
    };

    if (search_keyword) {
      const trimmedSearchKeyWord = search_keyword.trim();
      organizerEventFilterQuery.EventName = {
        $regex: new RegExp(trimmedSearchKeyWord, "i"),
      };
    }

    // Fetch events for the organizer with pagination
    const EventsData = await getPaginatedEventsData(
      organizerEventFilterQuery,
      limit,
      skip
    );

    // Check if events exist for the organizer
    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Events not found");
    }

    // Process each event to fetch relevant sales and date data
    const updatedEventsDataArray = await Promise.all(
      EventsData.map(async (event) => {
        const eventDateTimeFilterQuery = { Event_id: event._id };
        const EventDateTimeData = await getEventDateTimeDataService(
          eventDateTimeFilterQuery
        );

        // Sort the event date-time data and get the earliest start time
        const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);
        const EventStartDateTimeData = arrangedEventDateTime[0];

        // Format the event start date
        const eventDate = new Date(
          EventStartDateTimeData._doc.EventStartDateTime
        );
        const EventStartDate = eventDate.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const PreviousPaymentData = await OrganizerAccounts.find({
          event_id: event._id,
          status: Status.Active,
        });

        const totalRecivedAmount = PreviousPaymentData.reduce(
          (sum, record) => sum + record.AmountRecived,
          0
        );

        // Fetch all bookings for the event
        const TotalEventBookingsData = await getEventBookingsDataService({
          event_id: event._id,
          status: BookingStatus.Booked,
        });

        // Calculate total sales by source (Online/Promoter)
        const totalOnlineSales = calculateTotalAmountBySalesType(
          TotalEventBookingsData,
          TicketBookingSource.Website
        );
        const totalPromoterSales = calculateTotalAmountBySalesType(
          TotalEventBookingsData,
          TicketBookingSource.Promoter
        );

        // Total sales = Online sales + Promoter sales + Convenience Fee
        const totalSales =
          totalOnlineSales.totalAmount +
          totalPromoterSales.totalAmount +
          totalOnlineSales.totalConvenienceFee;

        // Construct the updated event object with relevant sales data
        const updatedEventObj = {
          event_id: event._id,
          EventName: event._doc.EventName,
          EventStartDate: EventStartDate,
          totalOnlineSales: totalOnlineSales.totalAmount,
          totalPromoterSales: totalPromoterSales.totalAmount,
          totalConvenienceFeeAmount: totalOnlineSales.totalConvenienceFee,
          totalSales: totalSales,
          PendingAmount: totalSales - totalRecivedAmount, // Assuming pending amount is equal to total sales for now
        };

        return updatedEventObj;
      })
    );

    // Count total events for pagination purposes
    const totalEvents = await countEvents(organizerEventFilterQuery);

    // Send the response with total summary data and table data
    return sendResponse(
      res,
      200,
      false,
      "Organizer's Events Fetched Successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
        totalEvents: totalEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching the Organizer Sales Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const AddPaymentForEvent = async (req, res) => {
  try {
    const { event_id, Date, Amount, Remark } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event ID Not Provided");
    }

    if (!Date) {
      return sendResponse(res, 404, true, "Date Not Provided");
    }

    if (!Amount) {
      return sendResponse(res, 404, true, "Amount Not Provided");
    }

    const isEventExists = await findOneEventDataService({ _id: event_id });
    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event Not Found");
    }

    const PreviousPaymentData = await OrganizerAccounts.find({
      event_id: event_id,
      status: Status.Active,
    });

    //Calculate totalRecivedAmount
    const totalRecivedAmount = PreviousPaymentData.reduce(
      (sum, record) => sum + record.AmountRecived,
      0
    );

    // Fetch all bookings for the event
    const TotalEventBookingsData = await getEventBookingsDataService({
      event_id: event_id,
      status: BookingStatus.Booked,
    });

    // Calculate total sales by source (Online/Promoter)
    const totalOnlineSales = calculateTotalAmountBySalesType(
      TotalEventBookingsData,
      TicketBookingSource.Website
    );
    const totalPromoterSales = calculateTotalAmountBySalesType(
      TotalEventBookingsData,
      TicketBookingSource.Promoter
    );

    // Total sales = Online sales + Promoter sales + Convenience Fee
    const totalSales =
      totalOnlineSales.totalAmount +
      totalPromoterSales.totalAmount +
      totalOnlineSales.totalConvenienceFee;

    const PendingAmount = totalSales - totalRecivedAmount; // Assuming pending amount is equal to total sales for now

    if (Amount > PendingAmount) {
      return sendResponse(res, 409, true, `Pending Amount is ${PendingAmount}`);
    }
    const AccountObj = {
      _id: uuidv4(),
      event_id: event_id,
      Date: Date,
      AmountRecived: Amount,
      Remark: Remark ? Remark : null,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    const newAccountsData = new OrganizerAccounts(AccountObj);
    await newAccountsData.save();
    return sendResponse(res, 201, false, "Amount Received successfully");
  } catch (error) {
    console.error("Error in Adding the Payment Organizer Event:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaymentsDataforEvent = async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event ID Not Provided");
    }

    const PreviousPaymentData = await OrganizerAccounts.find({
      event_id: event_id,
      status: Status.Active,
    });

    if (PreviousPaymentData.length == 0) {
      return sendResponse(
        res,
        404,
        true,
        "Previous Payments for Event Not Found"
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Previous Payments for Event Fetched Successfully",
      PreviousPaymentData
    );
  } catch (error) {
    console.error("Error in Fetching the Payment Organizer Event:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventPayment = async (req, res) => {
  try {
    const { paymentaccount_id } = req.body;

    if (!paymentaccount_id) {
      return sendResponse(res, 404, true, "Payment Account ID Not Provided");
    }

    const IsPaymentExists = await OrganizerAccounts.find({
      _id: paymentaccount_id,
    });

    if (!IsPaymentExists) {
      return sendResponse(res, 404, true, "Payments for Event Not Found");
    }

    await OrganizerAccounts.findByIdAndUpdate(
      { _id: paymentaccount_id },
      { status: Status.Inactive }
    );

    return sendResponse(res, 200, false, "Payment Deleted Successfully");
  } catch (error) {
    console.error(
      "Error in Fetching the Deleting Organizer Payment Event:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  registerOrganizer,
  organizerLogin,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizerProfileById,
  organizerChangePassword,
  getForgotPasswordLink,
  resetPassword,
  getOrganizerDataBySearchKeyword,
  getAllPaginatedOrganizerData,
  getOrganizerDataBySearchKeywordPaginated,
  organizerUpdatePassword,
  EnableOrganizer,
  DisableOrganizer,
  OrganizerTotalSalesData,
  getOrganizerSalesData,
  AddPaymentForEvent,
  getAllPaymentsDataforEvent,
  deleteEventPayment,
};
