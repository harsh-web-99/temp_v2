import multer from "multer";

const configureMulter = (fieldsConfig) => {
  const storage = multer.memoryStorage();
  const limits = {
    fileSize: 1 * 1024 * 1024,
  };

  const fileFilter = (req, file, cb) => {
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"), false);
    }
  };

  return multer({
    storage: storage,
    limits: limits,
    fileFilter: fileFilter,
  }).fields(fieldsConfig);
};

export { configureMulter };
