import express from "express";
import { createProduct } from "../controllers/product.controller.js";
import upload from "../utils/multer.config.js";
const productRouter = express.Router();

productRouter.post("/create", upload, createProduct);

export default productRouter;
