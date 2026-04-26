import { CheckIn } from "../models/AllModels.js";

const fetchCheckInDetailsFromDbService = async (checkInIds) => {
  const FetchCheckInDetails = await Promise.all(
    checkInIds.map(async (data) => {
      const isCheckInDataExists = await CheckIn.findOne({
        _id: data._id,
      });
      return !isCheckInDataExists ? data : null;
    })
  );
  const notFoundCheckInDetails = FetchCheckInDetails.filter(
    (data) => data !== null
  );
  return notFoundCheckInDetails;
};

const createCheckInService = async (checkInData) => {
  try {
    const newCheckIn = new CheckIn(checkInData);
    await newCheckIn.save();
    return newCheckIn;
  } catch (error) {
    console.error("Error creating CheckIn:", error);
    throw new Error("Failed to create CheckIn");
  }
};

const createBulkCheckInService = async (checkInData) => {
  try {
    const newCheckInData = await CheckIn.insertMany(checkInData);
    return newCheckInData;
  } catch (error) {
    console.error("Error creating BulkCheckIn:", error);
    throw new Error("Failed to create BulkCheckIn");
  }
};

const findOneCheckInDataService = async (filterquery) => {
  try {
    const CheckInData = await CheckIn.findOne(filterquery);
    return CheckInData;
  } catch (error) {
    console.error("Error finding One CheckIn:", error);
    throw new Error("Failed to Finding One CheckIn");
  }
};

const getCheckInDataService = async (filterquery) => {
  try {
    const CheckInData = await CheckIn.find(filterquery);
    return CheckInData;
  } catch (error) {
    console.error("Error finding fetching CheckIn Data:", error);
    throw new Error("Failed to Finding fetching CheckIn Data");
  }
};

const getCheckInByIdService = async (check_id) => {
  try {
    const CheckInData = await CheckIn.findById(genre_id);
    return CheckInData;
  } catch (error) {
    console.error("Error finding fetching CheckIn Data by Id:", error);
    throw new Error("Failed to Finding fetching CheckIn Data by Id");
  }
};

const updateCheckInDataService = async (filterquery, updateQuery) => {
  try {
    const CheckInData = await CheckIn.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return CheckInData;
  } catch (error) {
    console.error("Error updating CheckIn Data:", error);
    throw new Error("Failed to update CheckIn Data");
  }
};

const deleteCheckInByIdService = async (filterQuery) => {
  try {
    const result = await CheckIn.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting CheckIn Data by Id:", error);
    throw new Error("Failed to Deleting CheckIn Data by Id:");
  }
};

const getPaginatedCheckInData = async (filterQuery, limit, skip) => {
  try {
    return await CheckIn.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated CheckIn Data:", error);
    throw error;
  }
};

const countCheckIn = async (filterQuery) => {
  try {
    return await CheckIn.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting CheckIn Data:", error);
    throw error;
  }
};

export {
  fetchCheckInDetailsFromDbService,
  createCheckInService,
  createBulkCheckInService,
  findOneCheckInDataService,
  getCheckInDataService,
  getCheckInByIdService,
  updateCheckInDataService,
  deleteCheckInByIdService,
  getPaginatedCheckInData,
  countCheckIn,
};
