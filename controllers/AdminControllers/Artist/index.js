import {
  validateArtistDataUpdate,
  validateImageDelete,
  validateArtistImageUpload,
  validateSearchQuery,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import path from "path";
import fs from "fs/promises";
import { ImagesPath } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  createArtistService,
  findOneArtistDataService,
  getArtistDataService,
  getArtistByIdService,
  updateArtistDataService,
  deleteArtistByIdService,
  getPaginatedArtistData,
  countArtists,
} from "../../../services/ArtistServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const handleMulterError = (err, res) => {
  console.error("Multer Error:", err.message);
  return sendResponse(res, 500, true, "Multer Error", err.message);
};

const registerArtist = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "Images", maxCount: 5 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      console.log("Register Artist Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      let { Name, Email, Description, PhoneNo, Priority } = req.body;

      // Name is required
      if (!Name || !Name.trim()) {
        return sendResponse(res, 400, true, "Artist Name is required");
      }

      const trimmedName = Name.trim();

      // Image is required
      if (!req.files.Images || !req.files.Images.length) {
        return sendResponse(res, 400, true, "Artist Image is required");
      }

      // Normalize optional fields
      const normalizedEmail = Email ? Email.trim().toLowerCase() : null;
      const description = Description ? Description.trim() : null;
      const phoneNo = PhoneNo ? PhoneNo.trim() : null;

      const nameRegex = new RegExp("^" + trimmedName + "$", "i");
      const emailRegex = normalizedEmail
        ? new RegExp("^" + normalizedEmail + "$", "i")
        : null;

      // Construct filter query based on available data
      const filterquery = {
        $or: [
          { Name: nameRegex },
          ...(normalizedEmail ? [{ Email: emailRegex }] : []),
        ],
      };

      const existingArtist = await findOneArtistDataService(filterquery);

      if (existingArtist) {
        const conflictField =
          existingArtist.Name.toLowerCase() == trimmedName.toLowerCase()
            ? "Artist Name"
            : "Artist Email";
        return sendResponse(res, 409, true, `${conflictField} Already Exists`);
      }

      // Process Images
      const ArtistImages = await Promise.all(
        req.files.Images.map(async (file) => {
          const ArtistImageFolderPath = ImagesPath.ArtistImageFolderPath;
          await fs.mkdir(ArtistImageFolderPath, { recursive: true });
          const updatedfilename = sanitizeFileName(file.originalname);
          const ArtistImagePath = path.join(
            ArtistImageFolderPath,
            `${Date.now()}-${updatedfilename}`
          );
          await fs.writeFile(ArtistImagePath, file.buffer);
          return { image_path: ArtistImagePath };
        })
      );

      // Construct the artist object
      const artistObj = {
        _id: uuidv4(),
        Name: trimmedName,
        Email: normalizedEmail,
        Description: description,
        Images: ArtistImages,
        PhoneNo: phoneNo,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        Priority,
      };

      const newArtist = await createArtistService(artistObj);

      return sendResponse(
        res,
        201,
        false,
        "Artist Registered successfully",
        newArtist
      );
    });
  } catch (error) {
    console.error("Register Artist Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllArtist = async (req, res) => {
  try {
    console.log("Get All Artist API Called");

    const filterQuery = { status: 1 };
    const ArtistData = await getArtistDataService({});

    if (!ArtistData.length) {
      return sendResponse(res, 404, true, "Artist not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Artists fetched successfully",
      ArtistData
    );
  } catch (error) {
    console.error("Error in fetching Artist Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getArtistById = async (req, res) => {
  try {
    console.log("Get Artist By Id Api Called");
    console.log("Artist Id:-----> " + JSON.stringify(req.body.artist_id));

    const { artist_id } = req.body;
    if (!artist_id) {
      return sendResponse(res, 404, true, "Artist Id not Provided");
    }

    const artist = await getArtistByIdService(artist_id);

    if (!artist) {
      return sendResponse(res, 404, true, "Artist not found");
    }
    return sendResponse(res, 200, false, "Artist fetched successfully", artist);
  } catch (error) {
    console.error("Get Artist By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateArtistData = async (req, res) => {
  try {
    console.log("Update Artist Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // const validationResponse = await validateArtistDataUpdate(req.body);
    // if (validationResponse.error) {
    //   return sendResponse(res, 400, true, validationResponse.errorMessage);
    // }

    let { Name, Email, Description, PhoneNo, artist_id, Priority } = req.body;
    Name = Name ? Name.trim() : null;
    Email = Email ? Email.trim().toLowerCase() : null;
    PhoneNo = PhoneNo ? PhoneNo : null;
    Description = Description ? Description.trim() : null;

    const artist = await getArtistByIdService(artist_id);
    if (!artist) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    // Check for Name conflict
    if (Name) {
      const filterQuery = {
        _id: { $ne: artist_id },
        Name: { $regex: new RegExp("^" + Name + "$", "i") },
      };

      const existingNameArtist = await findOneArtistDataService(filterQuery);

      if (existingNameArtist) {
        return sendResponse(res, 409, true, "Artist Name Already Exists");
      }

      artist.Name = Name;
    }

    // Check for Email conflict
    if (Email) {
      const filterQuery = {
        _id: { $ne: artist_id },
        Email,
      };

      const existingEmailArtist = await findOneArtistDataService(filterQuery);

      if (existingEmailArtist) {
        return sendResponse(res, 409, true, "Artist Email Already Exists");
      }

      artist.Email = Email;
    } else {
      artist.Email = null;
    }

    artist.Description = Description;
    artist.PhoneNo = PhoneNo;
    artist.Priority = Priority;

    await artist.save();
    return sendResponse(res, 200, false, "Artist updated successfully", artist);
  } catch (error) {
    console.error("Update Artist Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteArtistImage = async (req, res) => {
  try {
    const validationResponse = await validateImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { artist_id, image_id } = req.body;

    console.log("Delete Artist Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const isArtistExists = await getArtistByIdService(artist_id);

    if (!isArtistExists) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    const ArtistImagesArray = isArtistExists.Images;

    const ImagesFoundwithId = ArtistImagesArray.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Artist Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = ArtistImagesArray.filter((data) => {
      return data._id != image_id;
    });

    const filterQuery = {
      _id: artist_id,
    };

    const updateQuery = {
      Images: UpdatedImagesAfterDeletion,
    };

    await updateArtistDataService(filterQuery, updateQuery);

    return sendResponse(res, 200, false, "Artist Image Deleted Successfully");
  } catch (error) {
    console.error("Delete Artist Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadArtistImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "ArtistImage", maxCount: 1 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const validationResponse = await validateArtistImageUpload(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { artist_id } = req.body;

      console.log("Upload Artist Image API called");
      console.log("Request Body Parameters:-----> ", req.body);

      if (!req.files.ArtistImage) {
        return sendResponse(res, 400, true, "Artist Image not provided");
      }

      const artist = await getArtistByIdService(artist_id);
      if (!artist) {
        return sendResponse(res, 404, true, "Artist not found");
      }

      const SingleArtistImage = req.files.ArtistImage[0];
      const ArtistImageFolderPath = ImagesPath.ArtistImageFolderPath;
      await fs.mkdir(ArtistImageFolderPath, { recursive: true });
      const updatedfilename = sanitizeFileName(SingleArtistImage.originalname);
      const ArtistImagePath = path.join(
        ArtistImageFolderPath,
        `${Date.now()}-${updatedfilename}`
      );
      await fs.writeFile(ArtistImagePath, SingleArtistImage.buffer);

      const NewImagePathObject = { image_path: ArtistImagePath };
      artist.Images.push(NewImagePathObject);

      await artist.save();

      return sendResponse(
        res,
        201,
        false,
        "Artist Image uploaded successfully",
        artist.Images
      );
    });
  } catch (error) {
    console.error("Upload Artist Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteArtist = async (req, res) => {
  try {
    const { artist_id } = req.body;
    if (!artist_id) {
      return sendResponse(res, 404, true, "Artist Id not Provided");
    }
    console.log("Delete Artist Api Called");
    console.log("Artist Id:-----> " + JSON.stringify(req.body.artist_id));

    const artist = await getArtistByIdService(artist_id);

    if (!artist) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    await Promise.all(
      artist.Images.map(async (image) => {
        await fs.unlink(image.image_path);
      })
    );

    const deleteQuery = {
      _id: artist_id,
    };
    const result = await deleteArtistByIdService(deleteQuery);

    if (result.deletedCount == 1) {
      return sendResponse(res, 200, false, "Artist Deleted Successfully");
    } else {
      return sendResponse(res, 409, false, "Failed to Delete Artist");
    }
  } catch (error) {
    console.error("Delete Artist Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getArtistDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Artist Data by Search Keyword API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSearchQuery(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { search_keyword } = req.body;
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
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

const getArtistDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log("Search Get Artist Data by Search Keyword API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;

    if (!search_keyword) {
      return sendResponse(res, 400, true, "Search Keyword is required");
    }
    const trimmedSearchKeyWord = search_keyword.trim();

    const filterQuery = {
      Name: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Get paginated artist data
    const ArtistData = await getPaginatedArtistData(filterQuery, limit, skip);

    if (!ArtistData.length) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    const totalArtists = await countArtists(filterQuery);

    return sendResponse(res, 200, false, "Artists fetched successfully", {
      totalPages: Math.ceil(totalArtists / limit),
      currentPage: page,
      totalArtists,
      ArtistData: ArtistData,
    });
  } catch (error) {
    console.error("Error in fetching Artist Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedArtistData = async (req, res) => {
  try {
    console.log("Get All Artist API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const filterQuery = { status: 1 };

    // Get paginated artist data
    const ArtistData = await getPaginatedArtistData({}, limit, skip);

    if (!ArtistData.length) {
      return sendResponse(res, 404, true, "Artist not found");
    }

    // Get the total number of artists for pagination
    const totalArtists = await countArtists({});

    return sendResponse(res, 200, false, "Artists fetched successfully", {
      totalPages: Math.ceil(totalArtists / limit),
      currentPage: page,
      totalArtists,
      ArtistData: ArtistData,
    });
  } catch (error) {
    console.error("Error in fetching Artist Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  registerArtist,
  getAllArtist,
  getArtistById,
  updateArtistData,
  deleteArtistImage,
  uploadArtistImage,
  deleteArtist,
  getArtistDataBySearchKeyword,
  getArtistDataBySearchKeywordPaginated,
  getAllPaginatedArtistData,
};
