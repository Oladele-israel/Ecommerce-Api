import express from "express";
import {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
} from "../controllers/product.controller.js";
import { checkAndRenewToken } from "../middleware/validateToken.js";
import upload from "../utils/multer.config.js";
const productRouter = express.Router();

productRouter.post("/create", checkAndRenewToken, upload, createProduct);
productRouter.put("/update/:id", checkAndRenewToken, upload, updateProduct);
productRouter.get("/", checkAndRenewToken, getAllProducts);
productRouter.get("/:id", checkAndRenewToken, getProductById);
productRouter.delete("/:id", checkAndRenewToken, deleteProduct);

export default productRouter;
