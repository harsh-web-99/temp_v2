import {
  validateVenueCreation,
  validateVenueUpdateData,
  validateVenueImageDelete,
  validateVenueImageUpload,
  validateSearchQuery,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import path from "path";
import fs from "fs";
import { ImagesPath } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  createVenueService,
  findOneVenueDataService,
  getVenueDataService,
  getVenueByIdService,
  deleteVenueByIdService,
  updateVenueDataService,
  getPaginatedVenuesData,
  countVenues,
} from "../../../services/VenueServices.js";
import {
  createEventCitiesService,
  findOneEventCitiesDataService,
} from "../../../services/EventCities.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import {
  sanitizeFileName,
  isValidGoogleMapsIframe,
} from "../../../helpers/commonFunctions.js";

const createVenue = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "Images", maxCount: 5 }];

    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      console.log("Create Venue Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      const {
        Country,
        CountryIsoCode,
        State,
        StateIsoCode,
        City,
        CityIsoCode,
        Map_Location,
        Name,
        Description,
        Address,
        Priority,
      } = req.body;

      const trimmedName = Name.trim();

      const nameRegex = new RegExp("^" + trimmedName + "$", "i");

      const filterQuery = {
        Name: nameRegex,
      };

      const isExistingVenueWithSameName = await findOneVenueDataService(
        filterQuery
      );

      if (isExistingVenueWithSameName) {
        return sendResponse(res, 409, true, `Venue Name Already Exists`);
      }

      const _id = uuidv4();

      const VenueImages = req.files.Images.map((file) => {
        const VenueImageFolderPath = ImagesPath.VenueImageFolderPath;
        if (!fs.existsSync(VenueImageFolderPath)) {
          fs.mkdirSync(VenueImageFolderPath, { recursive: true });
        }
        const updatedFilename = sanitizeFileName(file.originalname);
        const VenueImagePath = `${VenueImageFolderPath}${Date.now()}-${updatedFilename}`;
        fs.writeFileSync(VenueImagePath, file.buffer);
        return { image_path: VenueImagePath };
      });

      const EventCityFilterObj = {
        CityName: City,
      };

      const isEventCityExists = await findOneEventCitiesDataService(
        EventCityFilterObj
      );

      if (!isEventCityExists) {
        const eventCityObj = {
          _id: uuidv4(),
          CityName: City,
          FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
          createdAt: getCurrentDateTime(),
        };

        await createEventCitiesService(eventCityObj);
      }

      const venueObj = {
        _id,
        Images: VenueImages,
        Country,
        CountryIsoCode,
        State,
        StateIsoCode,
        City,
        CityIsoCode,
        Name: trimmedName,
        Description,
        Address,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        Priority,
      };

      const isMapLocationValid = isValidGoogleMapsIframe(Map_Location);

      if (isMapLocationValid) {
        venueObj.Map_Location = Map_Location;
      } else {
        return sendResponse(res, 400, true, "Invalid Google Maps iframe URL");
      }

      let newVenue = await createVenueService(venueObj);

      return sendResponse(
        res,
        201,
        false,
        "Venue Created successfully",
        newVenue
      );
    });
  } catch (error) {
    console.error("Create Venue Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllVenue = async (req, res) => {
  try {
    console.log("Get All Venue API Called");

    const filterQuery = {
      status: 1,
    };

    const VenueData = await getVenueDataService({});

    if (!VenueData || VenueData.length == 0) {
      return sendResponse(res, 404, true, "Venue not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Venue fetched successfully",
      VenueData
    );
  } catch (error) {
    console.error("Error in fetching Venue Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenueById = async (req, res) => {
  try {
    console.log("Get Venue By Id Api Called");
    console.log("Venue Id:-----> " + JSON.stringify(req.body.venue_id));

    const { venue_id } = req.body;

    if (!venue_id) {
      return sendResponse(res, 404, true, "Venue Id Not Provided");
    }

    const filterQuery = {
      _id: venue_id,
    };

    let isVenueExists = await findOneVenueDataService(filterQuery);

    if (!isVenueExists) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    return sendResponse(
      res,
      201,
      false,
      "Venue Fetched successfully",
      isVenueExists
    );
  } catch (error) {
    console.error("Get Venue By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateVenueData = async (req, res) => {
  try {
    console.log("Update Venue Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let {
      Country,
      CountryIsoCode,
      State,
      StateIsoCode,
      City,
      CityIsoCode,
      Map_Location,
      Name,
      Description,
      Address,
      venue_id,
      Priority,
    } = req.body;

    Name = Name ? Name.trim() : null;

    let VenueData = await getVenueByIdService(venue_id);
    if (!VenueData) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    if (Name) {
      const filterQuery = {
        $and: [
          { _id: { $ne: venue_id } },
          { Name: { $regex: new RegExp("^" + Name + "$", "i") } },
        ],
      };
      const existingVenueName = await findOneVenueDataService(filterQuery);

      if (existingVenueName) {
        return sendResponse(res, 409, true, "Venue Name Already Exists");
      }

      VenueData.Name = Name;
    }

    if (Country) VenueData.Country = Country;
    if (CountryIsoCode) VenueData.CountryIsoCode = CountryIsoCode;
    if (State) VenueData.State = State;
    if (StateIsoCode) VenueData.StateIsoCode = StateIsoCode;
    if (City) {
      const EventCityFilterObj = {
        CityName: City,
      };

      const isEventCityExists = await findOneEventCitiesDataService(
        EventCityFilterObj
      );

      if (!isEventCityExists) {
        const eventCityObj = {
          _id: uuidv4(),
          CityName: City,
          FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
          createdAt: getCurrentDateTime(),
        };

        await createEventCitiesService(eventCityObj);
      }
      VenueData.City = City;
    }
    if (CityIsoCode) VenueData.CityIsoCode = CityIsoCode;
    if (Map_Location) {
      const isMapLocationValid = isValidGoogleMapsIframe(Map_Location);

      if (isMapLocationValid) {
        VenueData.Map_Location = Map_Location;
      } else {
        return sendResponse(res, 400, true, "Invalid Google Maps iframe URL");
      }
    }
    if (Description) VenueData.Description = Description;
    if (Address) VenueData.Address = Address;
    if (Priority) VenueData.Priority = Priority;

    await VenueData.save();

    return sendResponse(
      res,
      200,
      false,
      "Venue updated successfully",
      VenueData
    );
  } catch (error) {
    console.error("Update Venue Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteVenueImage = async (req, res) => {
  try {
    const validationResponse = await validateVenueImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { venue_id, image_id } = req.body;

    console.log("Delete Venue Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const filterQuery = {
      _id: venue_id,
    };

    let isVenueExists = await findOneVenueDataService(filterQuery);

    if (!isVenueExists) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    const VenueImagesArray = isVenueExists.Images;

    const ImagesFoundwithId = VenueImagesArray.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Venue Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.promises.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = VenueImagesArray.filter((data) => {
      return data._id != image_id;
    });

    const updateQuery = {
      Images: UpdatedImagesAfterDeletion,
    };

    await updateVenueDataService(filterQuery, updateQuery);

    return sendResponse(res, 200, false, "Venue Image Deleted Successfully");
  } catch (error) {
    console.error("Delete Venue Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadVenueImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "VenueImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error");
      }

      const validationResponse = await validateVenueImageUpload(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { venue_id } = req.body;

      console.log("Upload Venue Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.VenueImage) {
        return sendResponse(res, 404, true, "Venue Image not Provided");
      }

      const filterQuery = {
        _id: venue_id,
      };

      let isVenueExists = await findOneVenueDataService(filterQuery);

      if (!isVenueExists) {
        return sendResponse(res, 404, true, "Venue Not Found!!");
      }

      const PreviousVenueImageArray = isVenueExists.Images;

      const SingleVenueImage = req.files.VenueImage[0];

      const VenueImageFolderPath = ImagesPath.VenueImageFolderPath;
      if (!fs.existsSync(VenueImageFolderPath)) {
        fs.mkdirSync(VenueImageFolderPath, { recursive: true });
      }
      const updatedFilename = sanitizeFileName(SingleVenueImage.originalname);
      const VenueImagePath = `${VenueImageFolderPath}${Date.now()}-${updatedFilename}`;
      fs.writeFileSync(VenueImagePath, SingleVenueImage.buffer);

      const NewImagePathObject = {
        image_path: VenueImagePath,
        _id: uuidv4(),
      };

      PreviousVenueImageArray.push(NewImagePathObject);

      const updateQuery = {
        Images: PreviousVenueImageArray,
      };
      await updateVenueDataService(filterQuery, updateQuery);

      let updatedVenueData = await findOneVenueDataService(filterQuery);

      const UpdatedVenueImageArray = updatedVenueData.Images;

      return sendResponse(
        res,
        201,
        false,
        "Venue Image Uploaded successfully",
        UpdatedVenueImageArray
      );
    });
  } catch (error) {
    console.error("Upload Venue Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteVenue = async (req, res) => {
  try {
    console.log("Delete Venue Api Called");
    console.log("Venue Id:-----> " + JSON.stringify(req.body.venue_id));

    const { venue_id } = req.body;

    if (!venue_id) {
      return sendResponse(res, 404, true, "Venue Id Not Provided");
    }

    const filterQuery = {
      _id: venue_id,
    };

    let isVenueExists = await findOneVenueDataService(filterQuery);

    if (!isVenueExists) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    let isVenueDeleted = await deleteVenueByIdService(filterQuery);
    if (isVenueDeleted.deletedCount == 1) {
      isVenueExists.Images.map(async (prevVenueImage) => {
        await fs.promises.unlink(path.join(prevVenueImage.image_path));
      });
      return sendResponse(res, 200, false, "Venue Deleted Successfully");
    } else {
      return sendResponse(res, 409, false, "Failed to Delete Venue");
    }
  } catch (error) {
    console.error("Delete Venue Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenueDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Venue Data by Search Keyword  API Called");
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

    const VenueData = await getVenueDataService(filterQuery);

    if (!VenueData.length) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Venue fetched successfully",
      VenueData
    );
  } catch (error) {
    console.error("Error in fetching Venue Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedVenues = async (req, res) => {
  try {
    console.log("Get All Paginated Venues API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const VenueData = await getPaginatedVenuesData({}, limit, skip);

    if (!VenueData.length) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    const totalVenue = await countVenues({});

    return sendResponse(res, 200, false, "Venue fetched successfully", {
      totalPages: Math.ceil(totalVenue / limit),
      currentPage: page,
      totalVenue: totalVenue,
      VenueData: VenueData,
    });
  } catch (error) {
    console.error("Error in fetching Venue Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenueDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log("Search Get Venue Data by Search Keyword API Called");
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

    const VenueData = await getPaginatedVenuesData(filterQuery, limit, skip);

    if (!VenueData.length) {
      return sendResponse(res, 404, true, "Venue not found");
    }

    const totalVenue = await countVenues(filterQuery);

    return sendResponse(res, 200, false, "Venue fetched successfully", {
      totalPages: Math.ceil(totalVenue / limit),
      currentPage: page,
      totalVenue: totalVenue,
      VenueData: VenueData,
    });
  } catch (error) {
    console.error("Error in fetching Venue Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createVenue,
  getAllVenue,
  getVenueById,
  updateVenueData,
  deleteVenueImage,
  uploadVenueImage,
  deleteVenue,
  getVenueDataBySearchKeyword,
  getAllPaginatedVenues,
  getVenueDataBySearchKeywordPaginated,
};
