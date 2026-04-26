import express from "express";
const router = express.Router();

import {
  registerScannerUser,
  scannerUserLogin,
  getAllScannerUsers,
  getScannerUsersDetailsbyId,
  updateScannerUserDetailsbyId,
  EnableScannerUser,
  DisableScanerUser,
  scannerUserUpdatePassword,
  getScannerUsersEventsbyId,
  scanQrCode,
} from "../../../controllers/AdminControllers/ScannerUser/index.js";

router.post("/register", registerScannerUser);

router.post("/login", scannerUserLogin);

router.get("/getAll", getAllScannerUsers);

router.post("/getById", getScannerUsersDetailsbyId);

router.post("/updateScannerUserDetailsbyId", updateScannerUserDetailsbyId);

router.post("/enable", EnableScannerUser);

router.post("/disable", DisableScanerUser);

router.post("/updatePassword", scannerUserUpdatePassword);

router.post("/getEventsbyId", getScannerUsersEventsbyId);

router.post("/scanQrCode", scanQrCode);

export default router;
