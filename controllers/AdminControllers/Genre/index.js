import { Genre } from "../../../models/AllModels.js";
import {
  validateGenreCreation,
  validateGenreDataUpdate,
  validateGenreImageDelete,
  validateGenreImageUpload,
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
  createGenreService,
  findOneGenreDataService,
  getGenreDataService,
  getGenreByIdService,
  deleteGenreByIdService,
  updateGenreDataService,
  getPaginatedGenresData,
  countGenres,
} from "../../../services/GenreServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const createGenre = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "Images", maxCount: 5 }];
    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      console.log("Create Genre Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Validate required fields
      const { Name, Description } = req.body;

      if (!Name || !Name.trim()) {
        return sendResponse(res, 400, true, "Genre Name is required");
      }

      if (!req.files || !req.files.Images || req.files.Images.length == 0) {
        return sendResponse(res, 400, true, "Genre Image is required");
      }

      // Validate genre data using a custom validation function
      const validationResponse = await validateGenreCreation(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const trimmedName = Name.trim();

      // Check for existing genre with the same name
      const nameRegex = new RegExp("^" + trimmedName + "$", "i");
      const filterQuery = { Name: nameRegex };
      const existingGenre = await findOneGenreDataService(filterQuery);
      if (existingGenre) {
        return sendResponse(res, 409, true, "Genre Name Already Exists");
      }

      // Process genre images and save them to the filesystem
      const GenreImages = req.files.Images.map((file) => {
        const GenreImageFolderPath = ImagesPath.GenreImageFolderPath;
        if (!fs.existsSync(GenreImageFolderPath)) {
          fs.mkdirSync(GenreImageFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(file.originalname);
        const GenreImagePath = `${GenreImageFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(GenreImagePath, file.buffer);
        return { image_path: GenreImagePath };
      });

      // Create genre object with optional Description
      const genreObj = {
        _id: uuidv4(),
        Name: trimmedName,
        Description: Description ? Description.trim() : null, // Optional
        Images: GenreImages,
        createdAt: getCurrentDateTime(),
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      };

      // Save the new genre
      const newGenre = await createGenreService(genreObj);

      return sendResponse(
        res,
        201,
        false,
        "Genre Registered successfully",
        newGenre
      );
    });
  } catch (error) {
    console.error("Register Genre Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllGenre = async (req, res) => {
  try {
    console.log("Get All Genre API Called");
    const filterQuery = {
      status: 1,
    };
    const GenreData = await getGenreDataService({});

    if (!GenreData || GenreData.length == 0) {
      return sendResponse(res, 404, true, "Genre not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Genre fetched successfully",
      GenreData
    );
  } catch (error) {
    console.error("Error in fetching Genre Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getGenreById = async (req, res) => {
  try {
    const { genre_id } = req.body;

    if (!genre_id) {
      return sendResponse(res, 404, true, "Genre Id Not Provided");
    }

    console.log("Get Genre By Id Api Called");
    console.log("Genre Id:-----> " + JSON.stringify(req.body.genre_id));
    const filterQuery = {
      _id: genre_id,
    };

    let isGenreExists = await findOneGenreDataService(filterQuery);

    if (!isGenreExists) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Genre fetched successfully",
      isGenreExists
    );
  } catch (error) {
    console.error("Get Genre by Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateGenreData = async (req, res) => {
  try {
    console.log("Update Genre Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let { Name, Description, genre_id } = req.body;

    Name = Name ? Name.trim() : null;
    Description = Description ? Description.trim() : null;

    let genre = await getGenreByIdService(genre_id);
    if (!genre) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    if (Name) {
      const filterQuery = {
        $and: [
          { _id: { $ne: genre_id } },
          { Name: { $regex: new RegExp("^" + Name + "$", "i") } },
        ],
      };
      const existingGenre = await findOneGenreDataService(filterQuery);

      if (existingGenre) {
        return sendResponse(res, 409, true, "Genre Name Already Exists");
      }

      genre.Name = Name;
    }

    if (Description) {
      genre.Description = Description;
    } else {
      genre.Description = null;
    }

    await genre.save();

    return sendResponse(res, 200, false, "Genre updated successfully", genre);
  } catch (error) {
    console.error("Update Genre Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteGenreImage = async (req, res) => {
  try {
    const validationResponse = await validateGenreImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { genre_id, image_id } = req.body;

    console.log("Delete Genre Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));
    const filterQuery = {
      _id: genre_id,
    };
    let isGenreExists = await findOneGenreDataService(filterQuery);

    if (!isGenreExists) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    const GenreImagesArray = isGenreExists.Images;

    const ImagesFoundwithId = GenreImagesArray.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Genre Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.promises.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = GenreImagesArray.filter((data) => {
      return data._id != image_id;
    });

    const updateQuery = {
      Images: UpdatedImagesAfterDeletion,
    };

    await updateGenreDataService(filterQuery, updateQuery);
    return sendResponse(res, 200, false, "Genre Image Deleted Successfully");
  } catch (error) {
    console.error("Delete Genre Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadGenreImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "GenreImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error");
      }

      const validationResponse = await validateGenreImageUpload(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { genre_id } = req.body;

      console.log("Upload Genre Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.GenreImage) {
        return sendResponse(res, 404, true, "Genre Image not Provided");
      }
      const filterQuery = {
        _id: genre_id,
      };

      let isGenreExists = await findOneGenreDataService(filterQuery);

      if (!isGenreExists) {
        return sendResponse(res, 404, true, "Genre Not Found!!");
      }

      const PreviousGenreImageArray = isGenreExists.Images;

      const SingleGenreImage = req.files.GenreImage[0];

      const GenreImageFolderPath = ImagesPath.GenreImageFolderPath;
      if (!fs.existsSync(GenreImageFolderPath)) {
        fs.mkdirSync(GenreImageFolderPath, { recursive: true });
      }
      const updatedfilename = sanitizeFileName(SingleGenreImage.originalname);
      const GenreImagePath = `${GenreImageFolderPath}${Date.now()}-${updatedfilename}`;
      fs.writeFileSync(GenreImagePath, SingleGenreImage.buffer);

      const NewImagePathObject = {
        image_path: GenreImagePath,
        _id: uuidv4(),
      };

      PreviousGenreImageArray.push(NewImagePathObject);
      const updateQuery = {
        Images: PreviousGenreImageArray,
      };

      await updateGenreDataService(filterQuery, updateQuery);

      let updatedGenreData = await findOneGenreDataService(filterQuery);

      const UpdatedGenreImageArray = updatedGenreData.Images;

      return sendResponse(
        res,
        201,
        false,
        "Genre Image Uploaded successfully",
        UpdatedGenreImageArray
      );
    });
  } catch (error) {
    console.error("Upload Genre Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteGenre = async (req, res) => {
  try {
    const { genre_id } = req.body;

    if (!genre_id) {
      return sendResponse(res, 404, true, "Genre Id Not Provided");
    }

    console.log("Delete Genre Api Called");
    console.log("Genre Id:-----> " + JSON.stringify(req.body.genre_id));

    const filterQuery = {
      _id: genre_id,
    };

    let isGenreExists = await findOneGenreDataService(filterQuery);

    if (!isGenreExists) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    let isGenreDeleted = await deleteGenreByIdService(filterQuery);
    if (isGenreDeleted.deletedCount == 1) {
      isGenreExists.Images.map(async (prevGenreImage) => {
        await fs.promises.unlink(path.join(prevGenreImage.image_path));
      });
      return sendResponse(res, 200, false, "Genre Deleted Successfully");
    } else {
      return sendResponse(res, 409, false, "Failed to Delete Genre");
    }
  } catch (error) {
    console.error("Delete Genre Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getGenreDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Genre Data by Search Keyword  API Called");
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

    const GenreData = await getGenreDataService(filterQuery);

    if (!GenreData.length) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Genre fetched successfully",
      GenreData
    );
  } catch (error) {
    console.error("Error in fetching Genre Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedGenre = async (req, res) => {
  try {
    console.log("Get All Paginated Genre API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const GenreData = await getPaginatedGenresData({}, limit, skip);

    if (!GenreData.length) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    const totalGenres = await countGenres({});

    return sendResponse(res, 200, false, "Genre fetched successfully", {
      totalPages: Math.ceil(totalGenres / limit),
      currentPage: page,
      totalGenres: totalGenres,
      GenreData: GenreData,
    });
  } catch (error) {
    console.error("Error in fetching Genre Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getGenreDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log("Search Get Genre Paginated Data by Search Keyword API Called");
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

    const GenreData = await getPaginatedGenresData(filterQuery, limit, skip);

    if (!GenreData.length) {
      return sendResponse(res, 404, true, "Genre not found");
    }

    const totalGenre = await countGenres(filterQuery);

    return sendResponse(res, 200, false, "Genre fetched successfully", {
      totalPages: Math.ceil(totalGenre / limit),
      currentPage: page,
      totalGenre: totalGenre,
      GenreData: GenreData,
    });
  } catch (error) {
    console.error("Error in fetching Genre Data from Search Keyword:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createGenre,
  getAllGenre,
  getGenreById,
  updateGenreData,
  deleteGenreImage,
  uploadGenreImage,
  deleteGenre,
  getGenreDataBySearchKeyword,
  getAllPaginatedGenre,
  getGenreDataBySearchKeywordPaginated,
};
