import express from "express";
const router = express.Router();

import {
  registerSuperAdmin,
  superAdminLogin,
  getAllSuperAdmins,
  getSuperAdminById,
  updateSuperAdminProfileById,
  superAdminChangePassword,
  getSuperAdminForgotPasswordLink,
  superAdminresetPassword,
} from "../../../controllers/AdminControllers/SuperAdmin/index.js";

router.post("/register", registerSuperAdmin);

router.post("/login", superAdminLogin);

router.get("/getAll", getAllSuperAdmins);

router.post("/getById", getSuperAdminById);

router.post("/updateProfile", updateSuperAdminProfileById);

router.post("/changepassword", superAdminChangePassword);

router.post("/getpasswordresetlink", getSuperAdminForgotPasswordLink);

router.post("/resetPassword/:token", superAdminresetPassword);

export default router;
