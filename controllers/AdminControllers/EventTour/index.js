import {
  validateEventTourCreation,
  validateEventTourDataUpdate,
  validateEventTourImageDelete,
  validateEventTourImageUpload,
  validateSearchQuery,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import path from "path";
import fs from "fs";
import { ImagesPath, Status } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  createEventTourService,
  findOneEventTourDataService,
  getEventTourDataService,
  getEventTourByIdService,
  deleteEventTourByIdService,
  updateEventTourDataService,
  getPaginatedEventToursData,
  countEventTours,
} from "../../../services/EventTourServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const createEventTour = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "EventTourImages", maxCount: 5 }];
    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      console.log("Create Event Tour Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Extract and validate the required fields
      const { Name, Description } = req.body;

      // Ensure Name is provided
      if (!Name || !Name.trim()) {
        return sendResponse(res, 400, true, "Event Tour Name is required");
      }

      // Ensure images are provided
      if (
        !req.files ||
        !req.files.EventTourImages ||
        req.files.EventTourImages.length == 0
      ) {
        return sendResponse(res, 400, true, "Event Tour Image(s) are required");
      }

      // Custom validation for additional business logic
      const validationResponse = await validateEventTourCreation(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const trimmedName = Name.trim();

      // Check for existing event tour with the same name
      const nameRegex = new RegExp("^" + trimmedName + "$", "i");
      const eventTourFilterQuery = { Name: nameRegex };

      const isExistingEventTour = await findOneEventTourDataService(
        eventTourFilterQuery
      );
      if (isExistingEventTour) {
        return sendResponse(res, 409, true, "Event Tour Name Already Exists");
      }

      const _id = uuidv4();

      // Handle and save images
      const EventTourImages = req.files.EventTourImages.map((file) => {
        const EventTourImageFolderPath = ImagesPath.EventTourImageFolderPath;
        if (!fs.existsSync(EventTourImageFolderPath)) {
          fs.mkdirSync(EventTourImageFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(file.originalname);
        const EventTourImagePath = `${EventTourImageFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(EventTourImagePath, file.buffer);
        return { image_path: EventTourImagePath };
      });

      // Construct the event tour object
      const eventTourObj = {
        _id,
        Name: trimmedName,
        Description: Description ? Description.trim() : null, // Optional
        Images: EventTourImages,
        createdAt: getCurrentDateTime(),
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      };

      // Save the new event tour
      const newEventTour = await createEventTourService(eventTourObj);

      return sendResponse(
        res,
        201,
        false,
        "Event Tour Created successfully",
        newEventTour
      );
    });
  } catch (error) {
    console.error("Create Event Tour Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllEventTour = async (req, res) => {
  try {
    console.log("Get All Event Tour Data API Called");

    const eventTourFilterQuery = {
      status: 1,
    };

    const EventTourData = await getEventTourDataService({});

    if (!EventTourData || EventTourData.length == 0) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Event Tour fetched successfully",
      EventTourData
    );
  } catch (error) {
    console.error("Error in fetching Event Tour Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventTourById = async (req, res) => {
  try {
    console.log("Get EventTour By Id Api Called");
    console.log(
      "Event Tour Id:-----> " + JSON.stringify(req.body.eventTour_id)
    );

    const { eventTour_id } = req.body;

    if (!eventTour_id) {
      return sendResponse(res, 404, true, "Event Tour Id Not Provided");
    }

    const eventTourFilterQuery = {
      _id: eventTour_id,
    };

    let isEventTourExists = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!isEventTourExists) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "EventTour fetched successfully",
      isEventTourExists
    );
  } catch (error) {
    console.error("Get Event tour By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateEventTourData = async (req, res) => {
  try {
    console.log("Update EventTour Data Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let { Name, Description, eventTour_id } = req.body;

    Name = Name ? Name.trim() : null;
    Description = Description ? Description.trim() : null;

    let eventTour = await getEventTourByIdService(eventTour_id);
    if (!eventTour) {
      return sendResponse(res, 404, true, "EventTour not found");
    }

    if (Name) {
      const eventTourFilterQuery = {
        $and: [
          { _id: { $ne: eventTour_id } },
          { Name: { $regex: new RegExp("^" + Name + "$", "i") } },
        ],
      };

      const existingNameEventTour = await findOneEventTourDataService(
        eventTourFilterQuery
      );

      if (existingNameEventTour) {
        return sendResponse(res, 409, true, "Event tour Name Already Exists");
      }

      eventTour.Name = Name;
    }

    if (Description) {
      eventTour.Description = Description;
    } else {
      eventTour.Description = null;
    }

    await eventTour.save();

    return sendResponse(
      res,
      200,
      false,
      "Event Tour updated successfully",
      eventTour
    );
  } catch (error) {
    console.error("Update EventTour Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventTourImage = async (req, res) => {
  try {
    const validationResponse = await validateEventTourImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { eventTour_id, image_id } = req.body;

    console.log("Delete EventTour Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const eventTourFilterQuery = {
      _id: eventTour_id,
    };

    let isEventTourExists = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!isEventTourExists) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }

    const EventTourImagesArray = isEventTourExists.Images;

    const ImagesFoundwithId = EventTourImagesArray.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Event Tour Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.promises.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = EventTourImagesArray.filter((data) => {
      return data._id != image_id;
    });

    const eventTourUpdateQuery = {
      Images: UpdatedImagesAfterDeletion,
    };

    await updateEventTourDataService(
      eventTourFilterQuery,
      eventTourUpdateQuery
    );
    return sendResponse(
      res,
      200,
      false,
      "Event Tour Image Deleted Successfully"
    );
  } catch (error) {
    console.error("Delete EventTour Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadEventTourImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "EventTourImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error");
      }

      const validationResponse = await validateEventTourImageUpload(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { eventTour_id } = req.body;

      console.log("Upload EventTour Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.EventTourImage) {
        return sendResponse(res, 404, true, "EventTour Image not Provided");
      }

      const eventTourFilterQuery = {
        _id: eventTour_id,
      };

      let isEventTourExists = await findOneEventTourDataService(
        eventTourFilterQuery
      );

      if (!isEventTourExists) {
        return sendResponse(res, 404, true, "EventTour Not Found!!");
      }

      const PreviousEventTourImageArray = isEventTourExists.Images;

      const SingleEventTourImage = req.files.EventTourImage[0];

      const EventTourImageFolderPath = ImagesPath.EventTourImageFolderPath;
      if (!fs.existsSync(EventTourImageFolderPath)) {
        fs.mkdirSync(EventTourImageFolderPath, { recursive: true });
      }
      const updatedfilename = sanitizeFileName(
        SingleEventTourImage.originalname
      );
      const EventTourImagePath = `${EventTourImageFolderPath}${Date.now()}-${updatedfilename}`;
      fs.writeFileSync(EventTourImagePath, SingleEventTourImage.buffer);

      const NewImagePathObject = {
        image_path: EventTourImagePath,
        _id: uuidv4(),
      };

      PreviousEventTourImageArray.push(NewImagePathObject);

      const eventTourUpdateQuery = {
        Images: PreviousEventTourImageArray,
      };

      await updateEventTourDataService(
        eventTourFilterQuery,
        eventTourUpdateQuery
      );

      let updatedEventTourData = await findOneEventTourDataService(
        eventTourFilterQuery
      );

      const UpdatedEventTourImageArray = updatedEventTourData.Images;

      return sendResponse(
        res,
        201,
        false,
        "Event Tour Image Uploaded successfully",
        UpdatedEventTourImageArray
      );
    });
  } catch (error) {
    console.error("Upload EventTour Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventTour = async (req, res) => {
  try {
    console.log("Delete EventTour Api Called");
    console.log("EventTour Id:-----> " + JSON.stringify(req.body.eventTour_id));

    const { eventTour_id } = req.body;

    if (!eventTour_id) {
      return sendResponse(res, 404, true, "Event Tour Id Not Provided");
    }

    const eventTourFilterQuery = {
      _id: eventTour_id,
    };

    let isEventTourExists = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!isEventTourExists) {
      return sendResponse(res, 404, true, "EventTour not found");
    }

    let isEventTourDeleted = await deleteEventTourByIdService(
      eventTourFilterQuery
    );
    if (isEventTourDeleted.deletedCount == 1) {
      isEventTourExists.Images.map(async (prevEventTourImage) => {
        await fs.promises.unlink(path.join(prevEventTourImage.image_path));
      });
      return sendResponse(res, 200, false, "EventTour Deleted Successfully");
    } else {
      return sendResponse(res, 409, false, "Failed to Delete Event Tour");
    }
  } catch (error) {
    console.error("Delete EventTour Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventTourDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Event Tours Data by Search Keyword  API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateSearchQuery(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { search_keyword } = req.body;

    const trimmedSearchKeyWord = search_keyword.trim();

    const eventTourFilterQuery = {
      Name: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const EventTourData = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!EventTourData.length) {
      return sendResponse(res, 404, true, "Event Tours not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Event Tours fetched successfully",
      EventTourData
    );
  } catch (error) {
    console.error(
      "Error in fetching EventTours Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedEventTours = async (req, res) => {
  try {
    console.log("Get All Paginated Event Tours API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const EventToursData = await getPaginatedEventToursData({}, limit, skip);

    if (!EventToursData.length) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }

    const totalEventTours = await countEventTours({});

    return sendResponse(res, 200, false, "Event Tour fetched successfully", {
      totalPages: Math.ceil(totalEventTours / limit),
      currentPage: page,
      totalEventTours: totalEventTours,
      EventToursData: EventToursData,
    });
  } catch (error) {
    console.error("Error in fetching Event Tour Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventToursDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log(
      "Search Get Event Tour Paginated Data by Search Keyword API Called"
    );
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

    const EventTourData = await getPaginatedEventToursData(
      filterQuery,
      limit,
      skip
    );

    if (!EventTourData.length) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }

    const totalEventTours = await countEventTours(filterQuery);

    return sendResponse(res, 200, false, "Event Tour fetched successfully", {
      totalPages: Math.ceil(totalEventTours / limit),
      currentPage: page,
      totalEventTours: totalEventTours,
      EventTourData: EventTourData,
    });
  } catch (error) {
    console.error(
      "Error in fetching Event Tour Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnableEventTour = async (req, res) => {
  try {
    console.log("Enable the EventTours Api Called ");
    console.log("EventTour Id:-----> " + JSON.stringify(req.body.eventTourId));

    const { eventTourId } = req.body;

    if (!eventTourId) {
      return sendResponse(res, 404, true, "Organizer Id Not Provided");
    }

    const eventTourFilterQuery = {
      _id: eventTourId,
    };
    const EventTourData = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!EventTourData) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }

    const eventTourUpdateQuery = {
      status: Status.Active,
    };
    await updateEventTourDataService(
      eventTourFilterQuery,
      eventTourUpdateQuery
    );

    return sendResponse(res, 200, false, "Event Tour Enabled successfully");
  } catch (error) {
    console.error("Error in Enabling Event Tour:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisableEventTour = async (req, res) => {
  try {
    console.log("Disable the Event Tour Api Called ");
    console.log("Event Tour Id:-----> " + JSON.stringify(req.body.eventTourId));

    const { eventTourId } = req.body;

    if (!eventTourId) {
      return sendResponse(res, 404, true, "Event Tour Id Not Provided");
    }

    const eventTourFilterQuery = {
      _id: eventTourId,
    };
    const EventTourData = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!EventTourData) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }

    const eventTourUpdateQuery = {
      status: Status.Inactive,
    };
    await updateEventTourDataService(
      eventTourFilterQuery,
      eventTourUpdateQuery
    );

    return sendResponse(res, 200, false, "Event Tour Disabled successfully");
  } catch (error) {
    console.error("Error in Disable Event Tour", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getActiveEventTours = async (req, res) => {
  try {
    console.log("Get All Active Event Tour Data API Called");

    const eventTourFilterQuery = {
      status: Status.Active,
    };

    const EventTourData = await getEventTourDataService(eventTourFilterQuery);

    if (!EventTourData || EventTourData.length == 0) {
      return sendResponse(res, 404, true, "Event Tour not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Active Event Tours fetched successfully",
      EventTourData
    );
  } catch (error) {
    console.error("Error in fetching Event Tour Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createEventTour,
  getAllEventTour,
  getEventTourById,
  updateEventTourData,
  deleteEventTourImage,
  uploadEventTourImage,
  deleteEventTour,
  getEventTourDataBySearchKeyword,
  getAllPaginatedEventTours,
  getEventToursDataBySearchKeywordPaginated,
  EnableEventTour,
  DisableEventTour,
  getActiveEventTours,
};
