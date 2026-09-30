import {
  validateSuperAdmin,
  validateChangePassword,
  validateSuperAdminProfileUpdate,
  validateResetPasswordEmail,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import fs from "fs";
import { ImagesPath } from "../../../helpers/Enum.js";
import bcrypt from "bcrypt";
const saltRounds = 10;
import generateAuthToken from "../../../helpers/auth.js";
import { encrypt } from "../../../helpers/encryptionUtils.js";
import { Status, AdminRoles } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  createSuperAdminService,
  findOneSuperAdminDataService,
  getSuperAdminDataService,
  getSuperAdminByIdService,
  updateSuperAdminDataService,
  getPaginatedSuperAdminsData,
  countSuperAdmins,
} from "../../../services/SuperAdminServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const registerSuperAdmin = async (req, res) => {
  try {
    console.log("Register Super Admin Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSuperAdmin(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { Username, Password } = req.body;

    const SuperAdminData = await getSuperAdminDataService({});

    if (SuperAdminData.length >= 1) {
      return sendResponse(
        res,
        409,
        true,
        `Only One Super Admin Can be Created`
      );
    }

    const trimmedUsernameName = Username.trim().toLowerCase();
    const trimmedPassword = Password.trim();

    const usernameRegex = new RegExp("^" + trimmedUsernameName + "$", "i");

    const filterQuery = {
      Username: usernameRegex,
    };
    const existingSuperAdmin = await findOneSuperAdminDataService(filterQuery);

    if (existingSuperAdmin) {
      return sendResponse(res, 409, true, `Username Already Exists`);
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);

    const superAdminObj = {
      _id: uuidv4(),
      Username: trimmedUsernameName,
      Password: hashedPassword,
      FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      createdAt: getCurrentDateTime(),
    };

    let newSuperAdmin = await createSuperAdminService(superAdminObj);

    return sendResponse(
      res,
      201,
      false,
      "Super Admin Registered successfully",
      newSuperAdmin
    );
  } catch (error) {
    console.error("Register Super Admin Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const superAdminLogin = async (req, res) => {
  try {
    console.log("Super Admin Login API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSuperAdmin(req.body);
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

    const isAdminWithEmailExists = await findOneSuperAdminDataService(
      filterQuery
    );

    if (!isAdminWithEmailExists) {
      return sendResponse(res, 409, true, `Invalid Email or Password`);
    }

    const passwordMatch = await bcrypt.compare(
      trimmedPassword,
      isAdminWithEmailExists.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Email or Password");
    }

    const payload = {
      Username: isAdminWithEmailExists.Username,
      CurrentTimeStamp: getCurrentDateTime(),
    };

    const token = generateAuthToken({ payload });
    const encryptedToken = encrypt(token);

    const userData = {
      token: encryptedToken,
      Username: isAdminWithEmailExists.Username,
      user_id: isAdminWithEmailExists._id,
      AdminRole: AdminRoles.SuperAdmin,
    };

    return sendResponse(res, 200, false, "Login successfully", userData);
  } catch (error) {
    console.error("Super Admin Login Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllSuperAdmins = async (req, res) => {
  try {
    console.log("Get All Super Admins API Called");

    const filterQuery = {
      status: 1,
    };

    const SuperAdminData = await getSuperAdminDataService(filterQuery);

    if (!SuperAdminData || SuperAdminData.length == 0) {
      return sendResponse(res, 404, true, "Super Admin not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Super Admin fetched successfully",
      SuperAdminData
    );
  } catch (error) {
    console.error("Error in fetching Super Admin Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getSuperAdminById = async (req, res) => {
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

    let SuperAdminExists = await findOneSuperAdminDataService(filterQuery);

    if (!SuperAdminExists) {
      return sendResponse(res, 404, true, "SuperAdmin not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "SuperAdmin fetched successfully",
      SuperAdminExists
    );
  } catch (error) {
    console.error("Get SuperAdmin by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateSuperAdminProfileById = async (req, res) => {
  try {
    console.log("Update Super Admin Profile By Id Api Called");
    console.log(" Req Body Parameters:-----> " + JSON.stringify(req.body));

    const fieldsConfig = [{ name: "ProfileImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 409, true, `Multer Error`);
      }

      const validationResponse = await validateSuperAdminProfileUpdate(
        req.body
      );
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { user_id } = req.body;

      const existingSuperAdmin = await getSuperAdminByIdService(user_id);
      if (!existingSuperAdmin) {
        return sendResponse(res, 409, true, "Super Admin not found");
      }

      if (req.body.FullName) {
        existingSuperAdmin.FullName =
          req.body.FullName.trim() || existingSuperAdmin.FullName;
      }

      // Handle email update
      if (req.body.Email) {
        const normalizedEmail = req.body.Email.trim().toLowerCase();
        const emailRegex = new RegExp("^" + normalizedEmail + "$", "i");

        const filterQuery = {
          Email: emailRegex,
          _id: { $ne: user_id },
        };

        const emailExistsSuperAdmin = await findOneSuperAdminDataService(
          filterQuery
        );

        if (emailExistsSuperAdmin) {
          return sendResponse(res, 409, true, `Email Already Exists`);
        }

        existingSuperAdmin.Email = normalizedEmail;
      }

      existingSuperAdmin.Phone1 = req.body.Phone1 || existingSuperAdmin.Phone1;
      existingSuperAdmin.Phone2 = req.body.Phone2 || existingSuperAdmin.Phone2;
      existingSuperAdmin.Address =
        req.body.Address || existingSuperAdmin.Address;
      existingSuperAdmin.Country =
        req.body.Country || existingSuperAdmin.Country;
      existingSuperAdmin.CountryIsoCode =
        req.body.CountryIsoCode || existingSuperAdmin.CountryIsoCode;
      existingSuperAdmin.State = req.body.State || existingSuperAdmin.State;
      existingSuperAdmin.StateIsoCode =
        req.body.StateIsoCode || existingSuperAdmin.StateIsoCode;
      existingSuperAdmin.City = req.body.City || existingSuperAdmin.City;
      existingSuperAdmin.CityIsoCode =
        req.body.CityIsoCode || existingSuperAdmin.CityIsoCode;
      existingSuperAdmin.Email = req.body.Email || existingSuperAdmin.Email;

      if (req.files && req.files.ProfileImage) {
        const SuperAdminProfileFolderPath =
          ImagesPath.SuperAdminProfileFolderPath;
        if (!fs.existsSync(SuperAdminProfileFolderPath)) {
          fs.mkdirSync(SuperAdminProfileFolderPath, { recursive: true });
        }
        const updatedProfileImagefilename = sanitizeFileName(
          req.files.ProfileImage[0].originalname
        );
        const SuperAdminProfileImagePath = `${SuperAdminProfileFolderPath}${Date.now()}-${updatedProfileImagefilename}`;
        fs.writeFileSync(
          SuperAdminProfileImagePath,
          req.files.ProfileImage[0].buffer
        );
        if (existingSuperAdmin.profile_img == undefined) {
          existingSuperAdmin.profile_img = SuperAdminProfileImagePath;
        } else {
          fs.unlinkSync(existingSuperAdmin.profile_img);
          existingSuperAdmin.profile_img = SuperAdminProfileImagePath;
        }
      }

      await existingSuperAdmin.save();
      return sendResponse(
        res,
        200,
        false,
        "Super Admin Profile Updated Successfully",
        existingSuperAdmin
      );
    });
  } catch (error) {
    console.error("Update Admin Profile Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const superAdminChangePassword = async (req, res) => {
  try {
    console.log("Super Admin Change Password API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateChangePassword(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    let { CurrentPassword, NewPassword, user_id } = req.body;

    const trimmedCurrentPassword = CurrentPassword.trim();
    const trimmedNewPassword = NewPassword.trim();

    const filterQuery = {
      _id: user_id,
      status: Status.Active,
    };

    let SuperAdminData = await findOneSuperAdminDataService(filterQuery);

    if (!SuperAdminData) {
      return sendResponse(res, 409, true, `Super Admin not found`);
    }

    const passwordMatch = await bcrypt.compare(
      trimmedCurrentPassword,
      SuperAdminData.Password
    );

    if (!passwordMatch) {
      return sendResponse(res, 409, true, "Invalid Current Password");
    }

    const newpasswordMatch = await bcrypt.compare(
      trimmedNewPassword,
      SuperAdminData.Password
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

      const updateQuery = {
        Password: hash,
      };

      await updateSuperAdminDataService(filter, updateQuery);
      return sendResponse(res, 200, false, "Password Changed Successfully");
    });
  } catch (error) {
    console.error("Super Admin Change Password Error:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getSuperAdminForgotPasswordLink = async (req, res) => {
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

      try {
        const filterQuery = {
          Email: emailRegex,
        };

        OrganizerEmailExists = await findOneSuperAdminDataService(filterQuery);
      } catch (error) {
        console.error("Error checking if email exists:", error);
        return sendResponse(res, 500, true, `Internal Server Error`);
      }

      if (!OrganizerEmailExists) {
        return sendResponse(res, 500, true, `Invalid Email Address`);
      }

      OrganizerEmailExists.resetPasswordToken = token;
      OrganizerEmailExists.resetPasswordExpires = Date.now() + 3600000;

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

const superAdminresetPassword = async (req, res) => {
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

    let OrganizerData;

    try {
      const filterQuery = {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      };

      OrganizerData = await findOneSuperAdminDataService(filterQuery);
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
      const hashedPassword = await bcrypt.hash(trimmedNewPassword, saltRounds);
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

export {
  registerSuperAdmin,
  superAdminLogin,
  getAllSuperAdmins,
  getSuperAdminById,
  updateSuperAdminProfileById,
  superAdminChangePassword,
  getSuperAdminForgotPasswordLink,
  superAdminresetPassword,
};
