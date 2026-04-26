import { SuperAdmin } from "../models/AllModels.js";

const fetchSuperAdminDetailsFromDbService = async (superAdminIds) => {
  const FetchSuperAdminDetails = await Promise.all(
    superAdminIds.map(async (data) => {
      const isSuperAdminExists = await SuperAdmin.findOne({
        _id: data.user_id,
      });
      return !isSuperAdminExists ? data : null;
    })
  );
  const notFoundSuperAdmins = FetchSuperAdminDetails.filter(
    (data) => data !== null
  );
  return notFoundSuperAdmins;
};

const createSuperAdminService = async (superAdmin) => {
  try {
    const newSuperAdmin = new SuperAdmin(superAdmin);
    await newSuperAdmin.save();
    return newSuperAdmin;
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
    throw new Error("Failed to create SuperAdmin");
  }
};

const findOneSuperAdminDataService = async (filterquery) => {
  try {
    const superAdminData = await SuperAdmin.findOne(filterquery);
    return superAdminData;
  } catch (error) {
    console.error("Error finding One SuperAdmin:", error);
    throw new Error("Failed to Finding One SuperAdmin");
  }
};

const getSuperAdminDataService = async (filterquery) => {
  try {
    const superAdminsData = await SuperAdmin.find(filterquery);
    return superAdminsData;
  } catch (error) {
    console.error("Error finding fetching SuperAdmin Data:", error);
    throw new Error("Failed to Finding fetching SuperAdmin Data");
  }
};

const getSuperAdminByIdService = async (genre_id) => {
  try {
    const superAdminData = await SuperAdmin.findById(genre_id);
    return superAdminData;
  } catch (error) {
    console.error("Error finding fetching SuperAdmin Data by Id:", error);
    throw new Error("Failed to Finding fetching SuperAdmin Data by Id");
  }
};

const updateSuperAdminDataService = async (filterquery, updateQuery) => {
  try {
    const superAdminData = await SuperAdmin.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return superAdminData;
  } catch (error) {
    console.error("Error updating SuperAdmin Data:", error);
    throw new Error("Failed to update SuperAdmin Data");
  }
};

const deleteSuperAdminByIdService = async (filterQuery) => {
  try {
    const result = await SuperAdmin.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting SuperAdmin Data by Id:", error);
    throw new Error("Failed to Deleting SuperAdmin Data by Id:");
  }
};

const getPaginatedSuperAdminsData = async (filterQuery, limit, skip) => {
  try {
    return await SuperAdmin.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated SuperAdmin Data:", error);
    throw error;
  }
};

const countSuperAdmins = async (filterQuery) => {
  try {
    return await SuperAdmin.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting SuperAdmin Data:", error);
    throw error;
  }
};

export {
  fetchSuperAdminDetailsFromDbService,
  createSuperAdminService,
  findOneSuperAdminDataService,
  getSuperAdminDataService,
  getSuperAdminByIdService,
  updateSuperAdminDataService,
  deleteSuperAdminByIdService,
  getPaginatedSuperAdminsData,
  countSuperAdmins,
};
