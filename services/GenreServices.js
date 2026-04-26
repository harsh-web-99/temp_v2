import { Genre } from "../models/AllModels.js";

const fetchGenreDetailsFromDbService = async (genreIds) => {
  const FetchGenreDetails = await Promise.all(
    genreIds.map(async (data) => {
      const isGenreExists = await Genre.findOne({
        _id: data.genre_id,
      });
      return !isGenreExists ? data : null;
    })
  );
  const notFoundGenre = FetchGenreDetails.filter((data) => data !== null);
  return notFoundGenre;
};

const createGenreService = async (genreData) => {
  try {
    const newGenre = new Genre(genreData);
    await newGenre.save();
    return newGenre;
  } catch (error) {
    console.error("Error creating Genre:", error);
    throw new Error("Failed to create Genre");
  }
};

const findOneGenreDataService = async (filterquery) => {
  try {
    const GenreData = await Genre.findOne(filterquery);
    return GenreData;
  } catch (error) {
    console.error("Error finding One Genre:", error);
    throw new Error("Failed to Finding One Genre");
  }
};

const getGenreDataService = async (filterquery) => {
  try {
    const GenresData = await Genre.find(filterquery);
    return GenresData;
  } catch (error) {
    console.error("Error finding fetching Genre Data:", error);
    throw new Error("Failed to Finding fetching Genre Data");
  }
};

const getGenreByIdService = async (genre_id) => {
  try {
    const genreData = await Genre.findById(genre_id);
    return genreData;
  } catch (error) {
    console.error("Error finding fetching Genre Data by Id:", error);
    throw new Error("Failed to Finding fetching Genre Data by Id");
  }
};

const deleteGenreByIdService = async (filterQuery) => {
  try {
    const result = await Genre.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Genre Data by Id:", error);
    throw new Error("Failed to Deleting Genre Data by Id:");
  }
};

const updateGenreDataService = async (filterquery, updateQuery) => {
  try {
    const genreData = await Genre.findByIdAndUpdate(filterquery, updateQuery);
    return genreData;
  } catch (error) {
    console.error("Error updating Genre Data:", error);
    throw new Error("Failed to update Genre Data");
  }
};

const getPaginatedGenresData = async (filterQuery, limit, skip) => {
  try {
    return await Genre.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Genre Data:", error);
    throw error;
  }
};

const countGenres = async (filterQuery) => {
  try {
    return await Genre.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Genre Data:", error);
    throw error;
  }
};

export {
  fetchGenreDetailsFromDbService,
  createGenreService,
  findOneGenreDataService,
  getGenreDataService,
  getGenreByIdService,
  deleteGenreByIdService,
  updateGenreDataService,
  getPaginatedGenresData,
  countGenres,
};
