import {
  Promoter,
  SuperAdmin,
  Employee,
  Organizer,
} from "../../../models/AllModels.js";
import {
  validaterRegisterPromoter,
  validatePromoterLogin,
  validateChangePassword,
  validateResetPasswordEmail,
  validatePromoterProfileUpdate,
  validateSearchQuery,
  validateResetPasswordData,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import bcrypt from "bcrypt";
const saltRounds = 10;
import fs from "fs";
import crypto from "crypto";
import generateAuthToken from "../../../helpers/auth.js";
import { encrypt } from "../../../helpers/encryptionUtils.js";
import {
  Status,
  AdminRoles,
  SendDefaultPasswordMail,
} from "../../../helpers/Enum.js";
import { ImagesPath } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  SendDefaultPasswordEmail,
  sendMailForgotPasswordLink,
} from "../../../helpers/mailer.js";
import { Urls } from "../../../config/index.js";
import {
  createPromoterService,
  findOnePromoterDataService,
  getPromoterDataService,
  getPromoterByIdService,
  updatePromoterDataService,
  getPaginatedPromotersData,
  countPromoters,
} from "../../../services/PromoterServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const registerPromoter = async (req, res) => {
  try {
    console.log("Register Promoter Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validaterRegisterPromoter(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      FullName,
      Username,
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

    const existingPromoter = await findOnePromoterDataService(filterQuery);

    if (existingPromoter) {
      const conflictField =
        existingPromoter.Username.toLowerCase() ==
        trimmedUsernameName.toLowerCase()
          ? "Promoter Username"
          : "Promoter Email";
      return sendResponse(res, 409, true, `${conflictField} Already Exists`);
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);

    if (SendMailFlag == SendDefaultPasswordMail.Yes && normalizedEmail) {
      const emailVerificationResponse = await SendDefaultPasswordEmail(
        trimmedFullName,
        Username,
        normalizedEmail,
        Password,
        "Promoter",
        Urls.PromoterLogin
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

    const promoterObj = {
      _id: uuidv4(),
      FullName: trimmedFullName,
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

    let newPromoter = await createPromoterService(promoterObj);

    return sendResponse(
      res,
      201,
      false,
      "Promoter Registered successfully",
      newPromoter
    );
  } catch (error) {
    console.error("Register Promoter Admin Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const promoterLogin = async (req, res) => {
  try {
    console.log("Promoter Login API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validatePromoterLogin(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { Username, Password } = req.body;

    const trimmedPassword = Password.trim();
    const trimmedUsernameName = Username.trim().toLowerCase();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");

    const filterQuery = {
      Username: usernameRegex,
      status: Status.Active,
    };

    const isPromoterWithUsernameExists = await findOnePromoterDataService(
      filterQuery
    );

    if (!isPromoterWithUsernameExists) {
      return sendResponse(res, 409, true, `Invalid Username or Password`);
    }

    const passwordMatch = await bcrypt.compare(
      trimmedPassword,
      isPromoterWithUsernameExists.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Username or Password");
    }

    const payload = {
      Email: isPromoterWithUsernameExists.Email,
      CurrentTimeStamp: getCurrentDateTime(),
    };

    const token = generateAuthToken({ payload });
    const encryptedToken = encrypt(token);

    const userData = {
      token: encryptedToken,
      Email: isPromoterWithUsernameExists.Email,
      user_id: isPromoterWithUsernameExists._id,
      Username: isPromoterWithUsernameExists.FullName,
      AdminRole: AdminRoles.Promoter,
    };

    return sendResponse(res, 200, false, "Login successfully", userData);
  } catch (error) {
    console.error("Promoter Login Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPromoters = async (req, res) => {
  try {
    console.log("Get All Promoter API Called");

    const filterQuery = {
      status: 1,
    };

    const PromoterData = await getPromoterDataService(filterQuery);

    if (!PromoterData || PromoterData.length == 0) {
      return sendResponse(res, 404, true, "Promoters not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Promoters fetched successfully",
      PromoterData
    );
  } catch (error) {
    console.error("Error in fetching Promoter Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoterById = async (req, res) => {
  try {
    const { user_id } = req.body;

    console.log("Get Promoter By Id Api Called");
    console.log("User Id:-----> " + JSON.stringify(req.body.user_id));

    if (!user_id) {
      return sendResponse(res, 404, true, "User Id Not Provided");
    }

    let PromoterExists = await getPromoterByIdService(user_id);

    if (!PromoterExists) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Promoter fetched successfully",
      PromoterExists
    );
  } catch (error) {
    console.error("Get Promoter by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updatePromoterProfileById = async (req, res) => {
  try {
    console.log("Update Promoter Profile By Id API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const fieldsConfig = [{ name: "ProfileImage", maxCount: 1 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 409, true, `Multer Error`);
      }

      // Validate input fields
      const validationResponse = await validatePromoterProfileUpdate(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { user_id } = req.body;

      // Fetch existing promoter by user_id
      const existingPromoter = await getPromoterByIdService(user_id);
      if (!existingPromoter) {
        return sendResponse(res, 404, true, "Promoter not found");
      }

      // Update full name if provided
      if (req.body.FullName) {
        existingPromoter.FullName =
          req.body.FullName.trim() || existingPromoter.FullName;
      }

      // Handle email update
      if (req.body.Email) {
        const normalizedEmail = req.body.Email.trim().toLowerCase();
        const emailRegex = new RegExp("^" + normalizedEmail + "$", "i");

        const filterQuery = {
          Email: emailRegex,
          _id: { $ne: user_id },
        };

        const emailExistsPromoter = await findOnePromoterDataService(
          filterQuery
        );

        if (emailExistsPromoter) {
          return sendResponse(res, 409, true, `Email Already Exists`);
        }

        existingPromoter.Email = normalizedEmail;
      }

      // Update other fields if provided
      existingPromoter.Phone1 = req.body.Phone1 || existingPromoter.Phone1;
      existingPromoter.Phone2 = req.body.Phone2 || existingPromoter.Phone2;
      existingPromoter.Address = req.body.Address || existingPromoter.Address;
      existingPromoter.Country = req.body.Country || existingPromoter.Country;
      existingPromoter.CountryIsoCode =
        req.body.CountryIsoCode || existingPromoter.CountryIsoCode;
      existingPromoter.State = req.body.State || existingPromoter.State;
      existingPromoter.StateIsoCode =
        req.body.StateIsoCode || existingPromoter.StateIsoCode;
      existingPromoter.City = req.body.City || existingPromoter.City;
      existingPromoter.CityIsoCode =
        req.body.CityIsoCode || existingPromoter.CityIsoCode;

      // Handle profile image update
      if (req.files && req.files.ProfileImage) {
        const PromoterProfileFolderPath = ImagesPath.PromoterProfileFolderPath;
        if (!fs.existsSync(PromoterProfileFolderPath)) {
          fs.mkdirSync(PromoterProfileFolderPath, { recursive: true });
        }

        const updatedProfileImageFilename = sanitizeFileName(
          req.files.ProfileImage[0].originalname
        );
        const PromoterProfileImagePath = `${PromoterProfileFolderPath}${Date.now()}-${updatedProfileImageFilename}`;

        // Save the new profile image
        fs.writeFileSync(
          PromoterProfileImagePath,
          req.files.ProfileImage[0].buffer
        );

        // Delete old profile image if it exists
        if (existingPromoter.profile_img) {
          if (fs.existsSync(existingPromoter.profile_img)) {
            fs.unlinkSync(existingPromoter.profile_img);
          }
        }
        // Update the new profile image path
        existingPromoter.profile_img = PromoterProfileImagePath;
      }

      // Save the updated promoter details
      await existingPromoter.save();

      return sendResponse(
        res,
        200,
        false,
        "Promoter Profile Updated Successfully",
        existingPromoter
      );
    });
  } catch (error) {
    console.error("Update Promoter Profile Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const promoterChangePassword = async (req, res) => {
  try {
    console.log("Promoter Change Password API Called");
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

    let PromoterData = await findOnePromoterDataService(filterQuery);

    if (!PromoterData) {
      return sendResponse(res, 409, true, `Promoter not found`);
    }

    const trimmedCurrentPassword = CurrentPassword.trim();
    const trimmedNewPassword = NewPassword.trim();

    const passwordMatch = await bcrypt.compare(
      trimmedCurrentPassword,
      PromoterData.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Current Password");
    }

    const newpasswordMatch = await bcrypt.compare(
      trimmedNewPassword,
      PromoterData.Password
    );

    if (newpasswordMatch) {
      return sendResponse(res, 409, true, "Cannot Use Previous Password");
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

      await updatePromoterDataService(filter, updateFilter);
      return sendResponse(res, 200, false, "Password Changed Successfully");
    });
  } catch (error) {
    console.error("Organizer Change Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoterForgotPasswordLink = async (req, res) => {
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

      let PromoterEmailExists;

      try {
        const filterQuery = {
          Email: emailRegex,
        };

        PromoterEmailExists = await findOnePromoterDataService(filterQuery);
      } catch (error) {
        console.error("Error checking if email exists:", error);
        return sendResponse(res, 500, true, `Internal Server Error`);
      }

      if (!PromoterEmailExists) {
        return sendResponse(res, 500, true, `Invalid Email Address`);
      }

      const PromoterName = PromoterEmailExists.FullName;

      PromoterEmailExists.resetPasswordToken = token;
      PromoterEmailExists.resetPasswordExpires = Date.now() + 3600000;

      const PromoterResetPasswordLink = `${Urls.PromoterResetPassword}/${token}`;

      const response = await sendMailForgotPasswordLink(
        PromoterResetPasswordLink,
        normalizedEmail,
        PromoterName
      );

      if (response == "SmtpDetails Not Found in Database") {
        return res.status(403).send("SmtpDetails Not Found in Database");
      }

      try {
        await PromoterEmailExists.save();
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

const promoterResetPassword = async (req, res) => {
  try {
    const validationResponse = await validateResetPasswordData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { new_password } = req.body;
    const { token } = req.params;

    const trimmedNewPassword = new_password.trim();

    if (!token) {
      return sendResponse(res, 400, true, `Token missing`);
    }

    let PromoterData;

    try {
      const filterQuery = {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      };

      PromoterData = await findOnePromoterDataService(filterQuery);
    } catch (error) {
      console.error("Error finding user by reset token:", error);
      return sendResponse(res, 500, true, `Internal Server Error`);
    }

    if (!PromoterData) {
      return sendResponse(
        res,
        500,
        true,
        `Password reset token is invalid or has expired.`
      );
    }

    PromoterData.resetPasswordToken = undefined;
    PromoterData.resetPasswordExpires = undefined;

    try {
      const hashedPassword = await bcrypt.hash(trimmedNewPassword, saltRounds);
      PromoterData.Password = hashedPassword;

      await PromoterData.save();

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

const getPromoterDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Promoter Data by Search Keyword  API Called");
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

    const PromoterData = await getPromoterDataService(filterQuery);

    if (!PromoterData.length) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Promoter fetched successfully",
      PromoterData
    );
  } catch (error) {
    console.error(
      "Error in fetching Promoter Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedPromoterData = async (req, res) => {
  try {
    console.log("Get All Promoter Data by Pagination API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const PromoterData = await getPaginatedPromotersData({}, limit, skip);

    if (!PromoterData.length) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    const totalPromoters = await countPromoters({});

    return sendResponse(res, 200, false, "Promoters fetched successfully", {
      totalPages: Math.ceil(totalPromoters / limit),
      currentPage: page,
      totalPromoters: totalPromoters,
      PromoterData: PromoterData,
    });
  } catch (error) {
    console.error("Error in fetching Promoters Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPromoterDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log(
      "Search Get Promoter Paginatined Data by Search Keyword API Called"
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

    const PromoterData = await getPaginatedPromotersData(
      filterQuery,
      limit,
      skip
    );

    if (!PromoterData.length) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    const totalPromoters = await countPromoters(filterQuery);

    return sendResponse(res, 200, false, "Promoters fetched successfully", {
      totalPages: Math.ceil(totalPromoters / limit),
      currentPage: page,
      totalPromoters: totalPromoters,
      PromoterData: PromoterData,
    });
  } catch (error) {
    console.error(
      "Error in fetching Promoters Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const promoterUpdatePassword = async (req, res) => {
  try {
    console.log("Promoter Update Password by SuperAdmin API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { promoter_id, new_password, CreatedBy, createduser_id } = req.body;

    if (!promoter_id) {
      return sendResponse(res, 404, true, `Promoter Id Not found`);
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
      _id: promoter_id,
      status: Status.Active,
    };

    let PromoterData = await findOnePromoterDataService(filterQuery);

    if (!PromoterData) {
      return sendResponse(res, 409, true, `Promoter not found`);
    }

    const filterquery = { _id: promoter_id };

    bcrypt.hash(trimmedNewPassword, saltRounds, async function (err, hash) {
      if (err) {
        console.error(err);
        return sendResponse(res, 500, true, "Error hashing NewPassword");
      }

      const updatefilter = { Password: hash };

      await updatePromoterDataService(filterquery, updatefilter);
      return sendResponse(res, 200, false, "Password Updated Successfully");
    });
  } catch (error) {
    console.error("Promoter Updated Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnablePromoter = async (req, res) => {
  try {
    console.log("Enable the Promoter Api Called ");
    console.log("Promoter Id:-----> " + JSON.stringify(req.body.promoter_id));

    const { promoter_id } = req.body;

    if (!promoter_id) {
      return sendResponse(res, 404, true, "Promoter Id Not Provided");
    }

    const promoterFilterQuery = {
      _id: promoter_id,
    };
    const promoterData = await findOnePromoterDataService(promoterFilterQuery);

    if (!promoterData) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    const promoterupdateQuery = {
      status: Status.Active,
    };
    await updatePromoterDataService(promoterFilterQuery, promoterupdateQuery);

    return sendResponse(res, 200, false, "Promoter Enabled successfully");
  } catch (error) {
    console.error("Error in updating Promoter Status to Actiavte:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisablePromoter = async (req, res) => {
  try {
    console.log("Disable the Promoter Api Called ");
    console.log("Promoter Id:-----> " + JSON.stringify(req.body.promoter_id));

    const { promoter_id } = req.body;

    if (!promoter_id) {
      return sendResponse(res, 404, true, "Promoter Id Not Provided");
    }

    const promoterFilterQuery = {
      _id: promoter_id,
    };
    const promoterData = await findOnePromoterDataService(promoterFilterQuery);

    if (!promoterData) {
      return sendResponse(res, 404, true, "Promoter not found");
    }

    const promoterupdateQuery = {
      status: Status.Inactive,
    };
    await updatePromoterDataService(promoterFilterQuery, promoterupdateQuery);

    return sendResponse(res, 200, false, "Promoter Disabled successfully");
  } catch (error) {
    console.error("Error in updating Promoter Status to Disable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  registerPromoter,
  promoterLogin,
  getAllPromoters,
  getPromoterById,
  updatePromoterProfileById,
  promoterChangePassword,
  getPromoterForgotPasswordLink,
  promoterResetPassword,
  getPromoterDataBySearchKeyword,
  getAllPaginatedPromoterData,
  getPromoterDataBySearchKeywordPaginated,
  promoterUpdatePassword,
  EnablePromoter,
  DisablePromoter,
};
