import { HomeBannerSlider } from "../models/AllModels.js";

const createHomePageBannerSliderService = async (artistData) => {
  try {
    const newBannerSliderData = new HomeBannerSlider(artistData);
    await newBannerSliderData.save();
    return newBannerSliderData;
  } catch (error) {
    console.error("Error creating HomePage Banner Slider:", error);
    throw new Error("Failed to create HomePage Banner Slider");
  }
};

const findOneHomePageBannerSliderDataService = async (filterquery) => {
  try {
    const BannerSliderData = await HomeBannerSlider.findOne(filterquery);
    return BannerSliderData;
  } catch (error) {
    console.error("Error finding One HomePage Banner Slider Data:", error);
    throw new Error("Failed to Finding One HomePage Banner Slider Data");
  }
};

const getHomePageBannerSliderDataService = async (filterquery) => {
  try {
    const BannerSliderData = await HomeBannerSlider.find(filterquery);
    return BannerSliderData;
  } catch (error) {
    console.error("Error finding fetching HomePage Banner Slider Data:", error);
    throw new Error("Failed to Finding fetching HomePage Banner Slider Data");
  }
};

const getPaginatedHomeBannerSlidersData = async (filterQuery, limit, skip) => {
  try {
    return await HomeBannerSlider.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated HomeBannerSlider Data:", error);
    throw error;
  }
};

const countHomeBannerSliders = async (filterQuery) => {
  try {
    return await HomeBannerSlider.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting HomeBannerSlider Data:", error);
    throw error;
  }
};

export {
  createHomePageBannerSliderService,
  findOneHomePageBannerSliderDataService,
  getHomePageBannerSliderDataService,
  getPaginatedHomeBannerSlidersData,
  countHomeBannerSliders,
};
