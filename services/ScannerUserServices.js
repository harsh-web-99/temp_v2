import { ScannerUser } from "../models/AllModels.js";

const fetchScannerDetailsFromDbService = async (scannerIds) => {
  const FetchScannerDetails = await Promise.all(
    scannerIds.map(async (data) => {
      const isScannerUserExists = await ScannerUser.findOne({
        _id: data.scanneruser_id,
      });
      return !isScannerUserExists ? data : null;
    })
  );
  const notFoundScannerUsers = FetchScannerDetails.filter(
    (data) => data !== null
  );
  return notFoundScannerUsers;
};

const createScannerUserService = async (scannerUserData) => {
  try {
    const newScannerUser = new ScannerUser(scannerUserData);
    await newScannerUser.save();
    return newScannerUser;
  } catch (error) {
    console.error("Error creating ScannerUser:", error);
    throw new Error("Failed to create ScannerUser");
  }
};

const findOneScannerUserDataService = async (filterquery) => {
  try {
    const scannerUserData = await ScannerUser.findOne(filterquery);
    return scannerUserData;
  } catch (error) {
    console.error("Error finding One scannerUser:", error);
    throw new Error("Failed to Finding One scannerUser");
  }
};

const getScannerUserDataService = async (filterquery) => {
  try {
    const scannerUserData = await ScannerUser.find(filterquery);
    return scannerUserData;
  } catch (error) {
    console.error("Error finding fetching ScannerUser Data:", error);
    throw new Error("Failed to Finding fetching ScannerUser Data");
  }
};

const getScannerUserByIdService = async (scanneruser_id) => {
  try {
    const ScannerUserData = await ScannerUser.findById(scanneruser_id);
    return ScannerUserData;
  } catch (error) {
    console.error("Error finding fetching ScannerUser Data by Id:", error);
    throw new Error("Failed to Finding fetching ScannerUser Data by Id");
  }
};

const updateScannerUserDataService = async (filterquery, updateQuery) => {
  try {
    const ScannerUserData = await ScannerUser.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return ScannerUserData;
  } catch (error) {
    console.error("Error updating ScannerUser Data:", error);
    throw new Error("Failed to update ScannerUser Data");
  }
};

const deleteScannerUserByIdService = async (filterQuery) => {
  try {
    const result = await ScannerUser.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting ScannerUser Data by Id:", error);
    throw new Error("Failed to Deleting ScannerUser Data by Id:");
  }
};

const getPaginatedScannerUsersData = async (filterQuery, limit, skip) => {
  try {
    return await ScannerUser.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated ScannerUser Data:", error);
    throw error;
  }
};

const countScannerUsers = async (filterQuery) => {
  try {
    return await ScannerUser.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting ScannerUser Data:", error);
    throw error;
  }
};

export {
  fetchScannerDetailsFromDbService,
  createScannerUserService,
  findOneScannerUserDataService,
  getScannerUserDataService,
  getScannerUserByIdService,
  updateScannerUserDataService,
  deleteScannerUserByIdService,
  getPaginatedScannerUsersData,
  countScannerUsers,
};
