import multer from "multer";

const storage = multer.memoryStorage(); // Store the file in memory (buffer)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB size limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
}).single("image"); // 'image' is the field name that will be used in Postman

export default upload;
