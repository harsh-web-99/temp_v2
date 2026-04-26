import {
  validateCategoryCreation,
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
import { ImagesPath } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  fetchCategoryDetailsFromDbService,
  createCategoryService,
  findOneCategoryDataService,
  getCategoryDataService,
  getCategoryByIdService,
  updateCategoryDataService,
  deleteCategoryByIdService,
  getPaginatedCategoryData,
  countCategories,
} from "../../../services/CategoryServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const handleMulterError = (err, res) => {
  console.error("Multer Error:", err.message);
  return sendResponse(res, 500, true, "Multer Error", err.message);
};

const createCategory = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "CategoryImages", maxCount: 5 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      console.log("Create Category Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      const { Name, Description, Priority } = req.body;

      // Validate Category Name
      if (!Name || !Name.trim()) {
        return sendResponse(res, 400, true, "Category Name is required");
      }

      // Validate Category Images
      if (!req.files.CategoryImages || !req.files.CategoryImages.length) {
        return sendResponse(res, 400, true, "Category Image is required");
      }

      // Trim Name and normalize Description (optional)
      const trimmedName = Name.trim();
      const description = Description ? Description.trim() : null;

      // Check if Category with the same name exists
      const nameRegex = new RegExp("^" + trimmedName + "$", "i");
      const filterQuery = {
        Name: nameRegex,
      };

      const isExistingCategorywithSameName = await findOneCategoryDataService(
        filterQuery
      );

      if (isExistingCategorywithSameName) {
        return sendResponse(res, 409, true, "Category Name Already Exists");
      }

      // Process Category Images
      const CategoryImages = await Promise.all(
        req.files.CategoryImages.map(async (file) => {
          const CategoryImageFolderPath = ImagesPath.CategoryImageFolderPath;
          await fs.mkdir(CategoryImageFolderPath, { recursive: true });
          const updatedfilename = sanitizeFileName(file.originalname);
          const CategoryImagePath = path.join(
            CategoryImageFolderPath,
            `${Date.now()}-${updatedfilename}`
          );
          await fs.writeFile(CategoryImagePath, file.buffer);
          return { image_path: CategoryImagePath };
        })
      );

      // Create Category Object
      const categoryObj = {
        _id: uuidv4(),
        Name: trimmedName,
        Description: Description ? description : null,
        Images: CategoryImages,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        Priority,
      };

      // Save the new category
      const newCategory = await createCategoryService(categoryObj);

      return sendResponse(
        res,
        201,
        false,
        "Category Created successfully",
        newCategory
      );
    });
  } catch (error) {
    console.error("Create Category Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllCategory = async (req, res) => {
  try {
    console.log("Get All Category API Called");

    const CategoryData = await getCategoryDataService({});

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Category fetched successfully",
      CategoryData
    );
  } catch (error) {
    console.error("Error in fetching Category Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCategoryById = async (req, res) => {
  try {
    console.log("Get Category By Id Api Called");
    console.log("Category Id:-----> " + JSON.stringify(req.body.category_id));

    const { category_id } = req.body;

    if (!category_id) {
      return sendResponse(res, 404, true, "Category Id Not Provided");
    }

    const category = await getCategoryByIdService(category_id);

    if (!category) {
      return sendResponse(res, 404, true, "Category not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Category fetched successfully",
      category
    );
  } catch (error) {
    console.error("Get Category By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateCategoryData = async (req, res) => {
  try {
    console.log("Update Category Data Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    let { Name, Description, category_id, Priority } = req.body;
    Description = Description ? Description.trim() : null;

    const category = await getCategoryByIdService(category_id);

    if (!category) {
      return sendResponse(res, 404, true, "Category not found");
    }

    if (Name) {
      const trimmedName = Name.trim();
      const filterQuery = {
        _id: { $ne: category_id },
        Name: { $regex: new RegExp("^" + trimmedName + "$", "i") },
      };
      const existingNameCategory = await findOneCategoryDataService(
        filterQuery
      );

      if (existingNameCategory) {
        return sendResponse(res, 409, true, "Category Name Already Exists");
      }

      category.Name = trimmedName;
    }

    if (Description) {
      category.Description = Description;
    } else {
      category.Description = null;
    }

    category.Priority = Priority;

    await category.save();
    return sendResponse(
      res,
      200,
      false,
      "Category updated successfully",
      category
    );
  } catch (error) {
    console.error("Update Category Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteCategoryImage = async (req, res) => {
  try {
    const { category_id, image_id } = req.body;
    const validationResponse = await validateCategoryImageDelete(req.body);

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    console.log("Delete Category Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const isCategoryExists = await getCategoryByIdService(category_id);

    if (!isCategoryExists) {
      return sendResponse(res, 404, true, "Category not found");
    }

    const categoryImagesArray = isCategoryExists.Images;

    const ImagesFoundwithId = categoryImagesArray.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Category Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = categoryImagesArray.filter((data) => {
      return data._id != image_id;
    });

    const filterQuery = {
      _id: category_id,
    };

    const updateQuery = {
      Images: UpdatedImagesAfterDeletion,
    };

    await updateCategoryDataService(filterQuery, updateQuery);

    return sendResponse(res, 200, false, "Category Image Deleted Successfully");
  } catch (error) {
    console.error("Delete Category Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadCategoryImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "Image", maxCount: 1 }];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const { category_id } = req.body;
      const validationResponse = await validateCategoryImageUpload(req.body);

      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      console.log("Upload Category Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.Image) {
        return sendResponse(res, 404, true, "Category Image not Provided");
      }

      const category = await getCategoryByIdService(category_id);

      if (!category) {
        return sendResponse(res, 404, true, "Category Not Found!!");
      }

      const [SingleCategoryImage] = req.files.Image;
      const CategoryImageFolderPath = ImagesPath.CategoryImageFolderPath;
      await fs.mkdir(CategoryImageFolderPath, { recursive: true });
      const updatedfilename = sanitizeFileName(
        SingleCategoryImage.originalname
      );

      const CategoryImagePath = path.join(
        CategoryImageFolderPath,
        `${Date.now()}-${updatedfilename}`
      );
      await fs.writeFile(CategoryImagePath, SingleCategoryImage.buffer);

      const NewImagePathObject = {
        image_path: CategoryImagePath,
      };
      category.Images.push(NewImagePathObject);

      await category.save();
      return sendResponse(
        res,
        201,
        false,
        "Category Image Uploaded successfully",
        category.Images
      );
    });
  } catch (error) {
    console.error("Upload Category Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteCategory = async (req, res) => {
  try {
    console.log("Delete Category Api Called");
    console.log("Category Id:-----> " + JSON.stringify(req.body.category_id));

    const { category_id } = req.body;

    if (!category_id) {
      return sendResponse(res, 404, true, "Category Id Not Provided");
    }

    const category = await getCategoryByIdService(category_id);

    if (!category) {
      return sendResponse(res, 404, true, "Category not found");
    }

    await Promise.all(
      category.Images.map(async (image) => {
        await fs.unlink(image.image_path);
      })
    );

    const deleteQuery = {
      _id: category_id,
    };
    const result = await deleteCategoryByIdService(deleteQuery);

    if (result.deletedCount == 1) {
      return sendResponse(res, 200, false, "Category Deleted Successfully");
    } else {
      return sendResponse(res, 409, false, "Failed to Delete Category");
    }
  } catch (error) {
    console.error("Delete Category Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCategoryDataBySearchKeyword = async (req, res) => {
  try {
    console.log("Search Get Category Data by Search Keyword  API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { search_keyword } = req.body;
    const validationResponse = await validateSearchQuery(req.body);

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const trimmedSearchKeyWord = search_keyword.trim();
    const filterQuery = {
      Name: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
    };

    const CategoryData = await getCategoryDataService(filterQuery);

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Category fetched successfully",
      CategoryData
    );
  } catch (error) {
    console.error(
      "Error in fetching Category Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedCategory = async (req, res) => {
  try {
    console.log("Get All Paginated Category API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const CategoryData = await getPaginatedCategoryData({}, limit, skip);

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }

    const totalCategories = await countCategories({});

    return sendResponse(res, 200, false, "Categories fetched successfully", {
      totalPages: Math.ceil(totalCategories / limit),
      currentPage: page,
      totalCategories,
      CategoryData: CategoryData,
    });
  } catch (error) {
    console.error("Error in fetching Category Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCategoryDataBySearchKeywordPaginated = async (req, res) => {
  try {
    console.log(
      "Search Get Category Paginated Data by Search Keyword API Called"
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

    const CategoryData = await getPaginatedCategoryData(
      filterQuery,
      limit,
      skip
    );

    if (!CategoryData.length) {
      return sendResponse(res, 404, true, "Category not found");
    }

    const totalCategories = await countCategories(filterQuery);

    return sendResponse(res, 200, false, "Category fetched successfully", {
      totalPages: Math.ceil(totalCategories / limit),
      currentPage: page,
      totalCategories: totalCategories,
      CategoryData: CategoryData,
    });
  } catch (error) {
    console.error(
      "Error in fetching Catgeory Data from Search Keyword:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createCategory,
  getAllCategory,
  getCategoryById,
  updateCategoryData,
  deleteCategoryImage,
  uploadCategoryImage,
  deleteCategory,
  getCategoryDataBySearchKeyword,
  getAllPaginatedCategory,
  getCategoryDataBySearchKeywordPaginated,
};
