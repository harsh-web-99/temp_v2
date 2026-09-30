import { Venue } from "../models/AllModels.js";

const fetchVenueDetailsFromDbService = async (venueIds) => {
  const FetchVenueDetails = await Promise.all(
    venueIds.map(async (data) => {
      const isVenueExists = await Venue.findOne({
        _id: data.venue_id,
      });
      return !isVenueExists ? data : null;
    })
  );
  const notFoundVenues = FetchVenueDetails.filter((data) => data !== null);
  return notFoundVenues;
};

const createVenueService = async (venueData) => {
  try {
    const newVenue = new Venue(venueData);
    await newVenue.save();
    return newVenue;
  } catch (error) {
    console.error("Error creating Venue:", error);
    throw new Error("Failed to create Venue");
  }
};

const findOneVenueDataService = async (filterquery) => {
  try {
    const VenueData = await Venue.findOne(filterquery);
    return VenueData;
  } catch (error) {
    console.error("Error finding One Venue:", error);
    throw new Error("Failed to Finding One Venue");
  }
};

const getVenueDataService = async (filterquery) => {
  try {
    const VenuesData = await Venue.find(filterquery);
    return VenuesData;
  } catch (error) {
    console.error("Error finding fetching Venue Data:", error);
    throw new Error("Failed to Finding fetching Venue Data");
  }
};

const getVenueByIdService = async (venue_id) => {
  try {
    const venueData = await Venue.findById(venue_id);
    return venueData;
  } catch (error) {
    console.error("Error finding fetching Venue Data by Id:", error);
    throw new Error("Failed to Finding fetching Venue Data by Id");
  }
};

const deleteVenueByIdService = async (filterQuery) => {
  try {
    const result = await Venue.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Venue Data by Id:", error);
    throw new Error("Failed to Deleting Venue Data by Id:");
  }
};

const updateVenueDataService = async (filterquery, updateQuery) => {
  try {
    const venueData = await Venue.findByIdAndUpdate(filterquery, updateQuery);
    return venueData;
  } catch (error) {
    console.error("Error updating Venue Data:", error);
    throw new Error("Failed to update Venue Data");
  }
};

const getPaginatedVenuesData = async (filterQuery, limit, skip) => {
  try {
    return await Venue.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Venue Data:", error);
    throw error;
  }
};

const countVenues = async (filterQuery) => {
  try {
    return await Venue.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Venue Data:", error);
    throw error;
  }
};

export {
  fetchVenueDetailsFromDbService,
  createVenueService,
  findOneVenueDataService,
  getVenueDataService,
  getVenueByIdService,
  deleteVenueByIdService,
  updateVenueDataService,
  getPaginatedVenuesData,
  countVenues,
};
