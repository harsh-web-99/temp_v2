import { Promocode } from "../models/AllModels.js";

const fetchPromocodeDetailsFromDbService = async (promocodeIds) => {
  const FetchPromocodeDetails = await Promise.all(
    promocodeIds.map(async (data) => {
      const isPromocodeExists = await Promocode.findOne({
        _id: data.genre_id,
      });
      return !isPromocodeExists ? data : null;
    })
  );
  const notFoundPromocode = FetchPromocodeDetails.filter(
    (data) => data !== null
  );
  return notFoundPromocode;
};

const createPromocodeService = async (genreData) => {
  try {
    const newPromocode = new Promocode(genreData);
    await newPromocode.save();
    return newPromocode;
  } catch (error) {
    console.error("Error creating Promocode:", error);
    throw new Error("Failed to create Promocode");
  }
};

const findOnePromocodeDataService = async (filterquery) => {
  try {
    const PromocodeData = await Promocode.findOne(filterquery);
    return PromocodeData;
  } catch (error) {
    console.error("Error finding One Promocode:", error);
    throw new Error("Failed to Finding One Promocode");
  }
};

const getPromocodeDataService = async (filterquery) => {
  try {
    const PromocodesData = await Promocode.find(filterquery);
    return PromocodesData;
  } catch (error) {
    console.error("Error finding fetching Promocode Data:", error);
    throw new Error("Failed to Finding fetching Promocode Data");
  }
};

const getPromocodeByIdService = async (promocode_id) => {
  try {
    const promocodeData = await Promocode.findById(promocode_id);
    return promocodeData;
  } catch (error) {
    console.error("Error finding fetching Promocode Data by Id:", error);
    throw new Error("Failed to Finding fetching Promocode Data by Id");
  }
};

const deletePromocodeByIdService = async (filterQuery) => {
  try {
    const result = await Promocode.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Promocode Data by Id:", error);
    throw new Error("Failed to Deleting Promocode Data by Id:");
  }
};

const updatePromocodeDataService = async (filterquery, updateQuery) => {
  try {
    const PromocodeData = await Promocode.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return PromocodeData;
  } catch (error) {
    console.error("Error updating Promocode Data:", error);
    throw new Error("Failed to update Promocode Data");
  }
};

const getPaginatedPromocodeData = async (filterQuery, limit, skip) => {
  try {
    return await Promocode.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Promocode Data:", error);
    throw error;
  }
};

const countPromocodes = async (filterQuery) => {
  try {
    return await Promocode.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Promocode Data:", error);
    throw error;
  }
};

export {
  fetchPromocodeDetailsFromDbService,
  createPromocodeService,
  findOnePromocodeDataService,
  getPromocodeDataService,
  getPromocodeByIdService,
  deletePromocodeByIdService,
  updatePromocodeDataService,
  getPaginatedPromocodeData,
  countPromocodes,
};
