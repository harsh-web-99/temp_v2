import { Organizer } from "../models/AllModels.js";

const fetchOrganizerDetailsFromDbService = async (organizerIds) => {
  const FetchOrganizerDetails = await Promise.all(
    organizerIds.map(async (data) => {
      const isOrganizerExists = await Organizer.findOne({
        _id: data.organizer_id,
      });
      return !isOrganizerExists ? data : null;
    })
  );
  const notFoundOrganizers = FetchOrganizerDetails.filter(
    (data) => data !== null
  );
  return notFoundOrganizers;
};

const createOrganizerService = async (organizerData) => {
  try {
    const newOrganizer = new Organizer(organizerData);
    await newOrganizer.save();
    return newOrganizer;
  } catch (error) {
    console.error("Error creating oragnizer:", error);
    throw new Error("Failed to create oragnizer");
  }
};

const findOneOrganizerDataService = async (filterquery) => {
  try {
    const organizerData = await Organizer.findOne(filterquery);
    return organizerData;
  } catch (error) {
    console.error("Error finding One Organizer:", error);
    throw new Error("Failed to Finding One Organizer");
  }
};

const getOrganizerDataService = async (filterquery) => {
  try {
    const organizersData = await Organizer.find(filterquery);
    return organizersData;
  } catch (error) {
    console.error("Error finding fetching Organizer Data:", error);
    throw new Error("Failed to Finding fetching Organizer Data");
  }
};

const getOrganizerByIdService = async (genre_id) => {
  try {
    const organizerData = await Organizer.findById(genre_id);
    return organizerData;
  } catch (error) {
    console.error("Error finding fetching Organizer Data by Id:", error);
    throw new Error("Failed to Finding fetching Organizer Data by Id");
  }
};

const updateOrganizerDataService = async (filterquery, updateQuery) => {
  try {
    const organizerData = await Organizer.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return organizerData;
  } catch (error) {
    console.error("Error updating Organizer Data:", error);
    throw new Error("Failed to update Organizer Data");
  }
};

const deleteOrganizerByIdService = async (filterQuery) => {
  try {
    const result = await Organizer.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Organizer Data by Id:", error);
    throw new Error("Failed to Deleting Organizer Data by Id:");
  }
};

const getPaginatedOrganizersData = async (filterQuery, limit, skip) => {
  try {
    return await Organizer.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Organizer Data:", error);
    throw error;
  }
};

const countOrganizers = async (filterQuery) => {
  try {
    return await Organizer.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Organizer Data:", error);
    throw error;
  }
};

export {
  fetchOrganizerDetailsFromDbService,
  createOrganizerService,
  findOneOrganizerDataService,
  getOrganizerDataService,
  getOrganizerByIdService,
  updateOrganizerDataService,
  deleteOrganizerByIdService,
  getPaginatedOrganizersData,
  countOrganizers,
};
