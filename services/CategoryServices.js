import { Category } from "../models/AllModels.js";

const fetchCategoryDetailsFromDbService = async (categoryIds) => {
  const FetchCategoryDetails = await Promise.all(
    categoryIds.map(async (data) => {
      const isCategoryExist = await Category.findOne({
        _id: data.category_id,
      });
      return !isCategoryExist ? data : null;
    })
  );
  const notFoundCategory = FetchCategoryDetails.filter((data) => data !== null);
  return notFoundCategory;
};

const createCategoryService = async (categoryData) => {
  try {
    const newCategory = new Category(categoryData);
    await newCategory.save();
    return newCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
};

const findOneCategoryDataService = async (filterquery) => {
  try {
    const categoryData = await Category.findOne(filterquery);
    return categoryData;
  } catch (error) {
    console.error("Error finding One category Data:", error);
    throw new Error("Failed to Finding One category Data");
  }
};

const getCategoryDataService = async (filterquery) => {
  try {
    const categoryData = await Category.find(filterquery);
    return categoryData;
  } catch (error) {
    console.error("Error finding fetching category Data:", error);
    throw new Error("Failed to Finding fetching category Data");
  }
};

const getCategoryByIdService = async (category_id) => {
  try {
    const categoryData = await Category.findById(category_id);
    return categoryData;
  } catch (error) {
    console.error("Error finding fetching category Data by Id:", error);
    throw new Error("Failed to Finding fetching category Data by Id");
  }
};

const updateCategoryDataService = async (filterquery, updateQuery) => {
  try {
    const categoryData = await Category.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return categoryData;
  } catch (error) {
    console.error("Error Updating Category Data:", error);
    throw new Error("Failed to Update Category Data");
  }
};

const deleteCategoryByIdService = async (filterQuery) => {
  try {
    const result = await Category.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting category Data by Id:", error);
    throw new Error("Failed to Deleting category Data by Id:");
  }
};

const getPaginatedCategoryData = async (filterQuery, limit, skip) => {
  try {
    return await Category.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Category Data:", error);
    throw error;
  }
};

const countCategories = async (filterQuery) => {
  try {
    return await Category.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Category Data:", error);
    throw error;
  }
};

export {
  fetchCategoryDetailsFromDbService,
  createCategoryService,
  findOneCategoryDataService,
  getCategoryDataService,
  getCategoryByIdService,
  updateCategoryDataService,
  deleteCategoryByIdService,
  getPaginatedCategoryData,
  countCategories,
};
