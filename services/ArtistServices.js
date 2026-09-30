import { Artist } from "../models/AllModels.js";

const fetchArtistDetailsFromDbService = async (artistIds) => {
  const FetchArtistDetails = await Promise.all(
    artistIds.map(async (data) => {
      const isArtistExists = await Artist.findOne({
        _id: data.artist_id,
      });
      return !isArtistExists ? data : null;
    })
  );
  const notFoundArtists = FetchArtistDetails.filter((data) => data !== null);
  return notFoundArtists;
};

const createArtistService = async (artistData) => {
  try {
    const newArtist = new Artist(artistData);
    await newArtist.save();
    return newArtist;
  } catch (error) {
    console.error("Error creating artist:", error);
    throw new Error("Failed to create artist");
  }
};

const findOneArtistDataService = async (filterquery) => {
  try {
    const ArtistData = await Artist.findOne(filterquery);
    return ArtistData;
  } catch (error) {
    console.error("Error finding One artist Data:", error);
    throw new Error("Failed to Finding One artist Data");
  }
};

const getOtherArtistsService = async (currentArtistId) => {
  try {
    return await Artist.find({ _id: { $ne: currentArtistId } });
  } catch (error) {
    console.error("Error finding One artist Data:", error);
    throw new Error("Failed to Finding One artist Data");
  }
};

const getArtistDataService = async (filterquery) => {
  try {
    const ArtistData = await Artist.find(filterquery);
    return ArtistData;
  } catch (error) {
    console.error("Error finding fetching artist Data:", error);
    throw new Error("Failed to Finding fetching artist Data");
  }
};

const getArtistByIdService = async (artist_id) => {
  try {
    const ArtistData = await Artist.findById(artist_id);
    return ArtistData;
  } catch (error) {
    console.error("Error finding fetching artist Data by Id:", error);
    throw new Error("Failed to Finding fetching artist Data by Id");
  }
};

const updateArtistDataService = async (filterquery, updateQuery) => {
  try {
    const ArtistData = await Artist.findByIdAndUpdate(filterquery, updateQuery);
    return ArtistData;
  } catch (error) {
    console.error("Error finding fetching artist Data:", error);
    throw new Error("Failed to Finding fetching artist Data");
  }
};

const deleteArtistByIdService = async (filterQuery) => {
  try {
    const result = await Artist.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting artist Data by Id:", error);
    throw new Error("Failed to deleting artist Data by Id");
  }
};

const getPaginatedArtistData = async (filterQuery, limit, skip) => {
  try {
    return await Artist.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Artist Data:", error);
    throw error;
  }
};

const countArtists = async (filterQuery) => {
  try {
    return await Artist.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Artist Data:", error);
    throw error;
  }
};

export {
  fetchArtistDetailsFromDbService,
  createArtistService,
  findOneArtistDataService,
  getOtherArtistsService,
  getArtistDataService,
  getArtistByIdService,
  updateArtistDataService,
  deleteArtistByIdService,
  getPaginatedArtistData,
  countArtists,
};
