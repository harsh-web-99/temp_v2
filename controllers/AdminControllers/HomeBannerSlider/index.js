import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import fs from "fs";
import path from "path";
import { ImagesPath } from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import { findOneEventDataService } from "../../../services/EventServices.js";
import {
  createHomePageBannerSliderService,
  findOneHomePageBannerSliderDataService,
  getHomePageBannerSliderDataService,
  getPaginatedHomeBannerSlidersData,
  countHomeBannerSliders,
} from "../../../services/HomeBannerSliderServices.js";
import { HomeBannerSlider } from "../../../models/AllModels.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

const handleMulterError = (err, res) => {
  console.error("Multer Error:", err.message);
  return sendResponse(res, 500, true, "Multer Error", err.message);
};

const createHomePageBannerSlider = async (req, res) => {
  try {
    const fieldsConfig = [
      { name: "DesktopbannerImage", maxCount: 1 },
      { name: "MobilebannerImage", maxCount: 1 },
    ];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      console.log("Create HomePageBanner Slider Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      const { Event_id } = req.body;

      if (!req.files || !req.files.DesktopbannerImage) {
        return sendResponse(res, 404, true, `Desktopbanner Image Not Provided`);
      }

      if (!req.files || !req.files.MobilebannerImage) {
        return sendResponse(res, 404, true, `Mobilebanner Image Not Provided`);
      }

      if (Event_id) {
        const isEventExists = await findOneEventDataService({
          _id: Event_id,
        });

        if (!isEventExists) {
          return sendResponse(res, 404, true, "Event not found");
        }
      }

      const DesktopHomeBannerFolderPath =
        ImagesPath.DesktopHomeBannerSliderImagePath;

      if (!fs.existsSync(DesktopHomeBannerFolderPath)) {
        fs.mkdirSync(DesktopHomeBannerFolderPath, { recursive: true });
      }

      const MobileHomeBannerFolderPath =
        ImagesPath.MobileHomeBannerSliderImagePath;

      if (!fs.existsSync(MobileHomeBannerFolderPath)) {
        fs.mkdirSync(MobileHomeBannerFolderPath, { recursive: true });
      }
      const updatedDesktopBannerImagefilename = sanitizeFileName(
        req.files.DesktopbannerImage[0].originalname
      );

      const updatedMobileBannerImagefilename = sanitizeFileName(
        req.files.MobilebannerImage[0].originalname
      );

      const DesktopBannerImagePath = `${DesktopHomeBannerFolderPath}${Date.now()}-${updatedDesktopBannerImagefilename}`;
      fs.writeFileSync(
        DesktopBannerImagePath,
        req.files.DesktopbannerImage[0].buffer
      );

      const MobileBannerImagePath = `${MobileHomeBannerFolderPath}${Date.now()}-${updatedMobileBannerImagefilename}`;
      fs.writeFileSync(
        MobileBannerImagePath,
        req.files.MobilebannerImage[0].buffer
      );

      const HomeBannerSliderObj = {
        _id: uuidv4(),
        DesktopbannerImage: DesktopBannerImagePath,
        MobilebannerImage: MobileBannerImagePath,
        Event_id: Event_id ? Event_id : null,
        createdAt: getCurrentDateTime(),
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      };

      const newHomePageBannerSlider = await createHomePageBannerSliderService(
        HomeBannerSliderObj
      );

      return sendResponse(
        res,
        200,
        false,
        "Home Page BannerSlider Created Successfully",
        newHomePageBannerSlider
      );
    });
  } catch (error) {
    console.error("Creating the HomePage Banner Slider Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllHomepageBannerSliderData = async (req, res) => {
  try {
    console.log("Get All HomePage Banner Slider Data API Called");
    const filterQuery = {
      status: 1,
    };

    const BannerSliderData = await getHomePageBannerSliderDataService({});

    if (!BannerSliderData || BannerSliderData.length == 0) {
      return sendResponse(res, 404, true, "HomePage Banner Slider not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Banner Slider fetched successfully",
      BannerSliderData
    );
  } catch (error) {
    console.error("Error in fetching HomePage Banner Slider Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getHomePageBannerSliderDatabyId = async (req, res) => {
  try {
    console.log("Get HomePage Banner Slider By Id Api Called");
    console.log(
      "Banner Slider Id:-----> " + JSON.stringify(req.body.BannerSlider_id)
    );

    const { BannerSlider_id } = req.body;

    if (!BannerSlider_id) {
      return sendResponse(res, 404, true, "BannerSlider Id Not Provided");
    }

    const filterQuery = {
      _id: BannerSlider_id,
    };

    let IsHomePageBannerExists = await findOneHomePageBannerSliderDataService(
      filterQuery
    );

    if (!IsHomePageBannerExists) {
      return sendResponse(res, 404, true, "HomePage Banner Slider not found");
    }

    return sendResponse(
      res,
      201,
      false,
      "Home Page Banner Slider Fetched successfully",
      IsHomePageBannerExists
    );
  } catch (error) {
    console.error("Get Home Page BannerSlider By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateHomepageBannerSliderData = async (req, res) => {
  try {
    const fieldsConfig = [
      { name: "DesktopbannerImage", maxCount: 1 },
      { name: "MobilebannerImage", maxCount: 1 },
    ];
    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      console.log("Update HomePage Banner Slider Data Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      const { Event_id, BannerSlider_id } = req.body;

      if (!BannerSlider_id) {
        return sendResponse(res, 404, true, "Banner SliderId not found");
      }

      const BannerSliderData = await findOneHomePageBannerSliderDataService({
        _id: BannerSlider_id,
      });

      if (!BannerSliderData) {
        return sendResponse(res, 404, true, "HomePage Banner Slider not found");
      }

      if (Event_id) {
        const isEventExists = await findOneEventDataService({
          _id: Event_id,
        });

        if (!isEventExists) {
          return sendResponse(res, 404, true, "Event not found");
        }
        BannerSliderData.Event_id = Event_id;
      }

      if (req.files && req.files.DesktopbannerImage) {
        const DesktopBannerImageFolderPath =
          ImagesPath.DesktopHomeBannerSliderImagePath;

        const updatedDesktopBannerImagefilename = sanitizeFileName(
          req.files.DesktopbannerImage[0].originalname
        );

        const DesktopBannerImagePath = `${DesktopBannerImageFolderPath}${Date.now()}-${updatedDesktopBannerImagefilename}`;
        fs.writeFileSync(
          DesktopBannerImagePath,
          req.files.DesktopbannerImage[0].buffer
        );

        fs.unlinkSync(BannerSliderData.DesktopbannerImage);
        BannerSliderData.DesktopbannerImage = DesktopBannerImagePath;
      }

      if (req.files && req.files.MobilebannerImage) {
        const MobileBannerImageFolderPath =
          ImagesPath.DesktopHomeBannerSliderImagePath;

        const updatedMobileBannerImagefilename = sanitizeFileName(
          req.files.MobilebannerImage[0].originalname
        );

        const MobileBannerImagePath = `${MobileBannerImageFolderPath}${Date.now()}-${updatedMobileBannerImagefilename}`;
        fs.writeFileSync(
          MobileBannerImagePath,
          req.files.MobilebannerImage[0].buffer
        );

        fs.unlinkSync(BannerSliderData.MobilebannerImage);
        BannerSliderData.MobilebannerImage = MobileBannerImagePath;
      }

      await BannerSliderData.save();
      return sendResponse(
        res,
        200,
        false,
        "Banner Details Updated SuccessFully"
      );
    });
  } catch (error) {
    console.error("Update Banner Slider Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteHomePageBannerSlider = async (req, res) => {
  try {
    console.log("Delete HomePage Banner Slider By Id Api Called");
    console.log(
      "Banner Slider Id:-----> " + JSON.stringify(req.body.BannerSlider_id)
    );

    const { BannerSlider_id } = req.body;

    if (!BannerSlider_id) {
      return sendResponse(res, 404, true, "BannerSlider Id Not Provided");
    }

    const deletefilterQuery = {
      _id: BannerSlider_id,
    };

    let isBannerExists = await findOneHomePageBannerSliderDataService(
      deletefilterQuery
    );

    const filterQuery = {
      status: 1,
    };

    const TotalBannerSliderData = await getHomePageBannerSliderDataService(
      filterQuery
    );

    if (TotalBannerSliderData <= 1) {
      return sendResponse(res, 409, true, "1 BannerSlider should exist");
    }

    if (!isBannerExists) {
      return sendResponse(res, 404, true, "HomePage Banner Slider Not Found");
    } else {
      let IsSliderDeleted = await HomeBannerSlider.deleteOne(filterQuery);
      if (IsSliderDeleted.deletedCount == 1) {
        const HomePageSliderDesktopbannerImage =
          isBannerExists.DesktopbannerImage;
        const HomePageSliderMobilebannerImage =
          isBannerExists.MobilebannerImage;
        await fs.promises.unlink(path.join(HomePageSliderDesktopbannerImage));
        await fs.promises.unlink(path.join(HomePageSliderMobilebannerImage));

        return sendResponse(
          res,
          200,
          false,
          "HomePage Banner Slider Deleted SuccessFully"
        );
      } else {
        return sendResponse(
          res,
          409,
          true,
          "Failed to delete HomePage Banner Slider"
        );
      }
    }
  } catch (error) {
    console.error("Delete HomePageBannerSlider Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedHomePageSliderData = async (req, res) => {
  try {
    console.log("Get All Home Page Banner Slider API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const filterQuery = { status: 1 };

    const BannerSliderData = await getPaginatedHomeBannerSlidersData(
      {},
      limit,
      skip
    );

    if (!BannerSliderData.length) {
      return sendResponse(res, 404, true, "Banner Sliders not found");
    }

    const totalBannerSliderData = await countHomeBannerSliders({});

    return sendResponse(
      res,
      200,
      false,
      "Home Page Banner fetched successfully",
      {
        totalPages: Math.ceil(totalBannerSliderData / limit),
        currentPage: page,
        totalBannerSliderData: totalBannerSliderData,
        BannerSliderData: BannerSliderData,
      }
    );
  } catch (error) {
    console.error("Error in fetching Home Page Banner Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createHomePageBannerSlider,
  getAllHomepageBannerSliderData,
  getHomePageBannerSliderDatabyId,
  updateHomepageBannerSliderData,
  deleteHomePageBannerSlider,
  getAllPaginatedHomePageSliderData,
};
