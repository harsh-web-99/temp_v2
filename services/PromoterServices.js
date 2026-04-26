import { Promoter } from "../models/AllModels.js";

const fetchPromoterDetailsFromDbService = async (promoterIds) => {
  const FetchPromoterDetails = await Promise.all(
    promoterIds.map(async (data) => {
      const isPromoterExists = await Promoter.findOne({
        _id: data.promoter_id,
      });
      return !isPromoterExists ? data : null;
    })
  );
  const notFoundPromoters = FetchPromoterDetails.filter(
    (data) => data !== null
  );
  return notFoundPromoters;
};

const createPromoterService = async (promoterData) => {
  try {
    const newPromoter = new Promoter(promoterData);
    await newPromoter.save();
    return newPromoter;
  } catch (error) {
    console.error("Error creating Promoter:", error);
    throw new Error("Failed to create Promoter");
  }
};

const findOnePromoterDataService = async (filterquery) => {
  try {
    const promoterData = await Promoter.findOne(filterquery);
    return promoterData;
  } catch (error) {
    console.error("Error finding One Promoter:", error);
    throw new Error("Failed to Finding One Promoter");
  }
};

const getPromoterDataService = async (filterquery) => {
  try {
    const promotersData = await Promoter.find(filterquery);
    return promotersData;
  } catch (error) {
    console.error("Error finding fetching Promoter Data:", error);
    throw new Error("Failed to Finding fetching Promoter Data");
  }
};

const getPromoterByIdService = async (genre_id) => {
  try {
    const promoterData = await Promoter.findById(genre_id);
    return promoterData;
  } catch (error) {
    console.error("Error finding fetching Promoter Data by Id:", error);
    throw new Error("Failed to Finding fetching Promoter Data by Id");
  }
};

const updatePromoterDataService = async (filterquery, updateQuery) => {
  try {
    const promoterData = await Promoter.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return promoterData;
  } catch (error) {
    console.error("Error updating Promoter Data:", error);
    throw new Error("Failed to update Promoter Data");
  }
};

const deletePromoterByIdService = async (filterQuery) => {
  try {
    const result = await Promoter.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Promoter Data by Id:", error);
    throw new Error("Failed to Deleting Promoter Data by Id:");
  }
};

const getPaginatedPromotersData = async (filterQuery, limit, skip) => {
  try {
    return await Promoter.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Promoter Data:", error);
    throw error;
  }
};

const countPromoters = async (filterQuery) => {
  try {
    return await Promoter.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Promoter Data:", error);
    throw error;
  }
};

export {
  fetchPromoterDetailsFromDbService,
  createPromoterService,
  findOnePromoterDataService,
  getPromoterDataService,
  getPromoterByIdService,
  updatePromoterDataService,
  deletePromoterByIdService,
  getPaginatedPromotersData,
  countPromoters,
};
