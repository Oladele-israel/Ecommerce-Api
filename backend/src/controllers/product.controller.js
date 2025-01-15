import cloudinary from "../utils/cloudinary.js";
import pool from "../utils/db.js";

export const createProduct = async (req, res) => {
  const { name, price, description, stock, category } = req.body;

  try {
    // Check if required fields are provided
    if (!name || !price || !description || !category || stock === undefined) {
      return res.status(400).json({
        message:
          "All fields (name, price, description, stock, category) must be entered.",
      });
    }

    // Check if image file is provided
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required." });
    }

    // Using Cloudinary's upload_stream to upload buffer directly
    const uploadToCloudinary = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "ecommerce", use_filename: true },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.end(buffer);
      });
    };

    // Step 1: Perform image upload and category query in parallel
    const [cloudinaryResult, categoryResult] = await Promise.all([
      uploadToCloudinary(req.file.buffer), // Upload the image to Cloudinary
      pool.query("SELECT id FROM categories WHERE name = $1", [category]), // Get category ID from DB
    ]);

    // Ensure category exists
    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        message: `Category "${category}" does not exist.`,
      });
    }

    const imageUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;
    const categoryId = categoryResult.rows[0].id;

    const productInsertQuery = `
      INSERT INTO products (name, price, description, stock, image_url, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await pool.query(productInsertQuery, [
      name,
      price,
      description,
      stock,
      imageUrl,
      categoryId,
    ]);

    const newProduct = rows[0];

    return res.status(201).json({
      message: "Product created successfully.",
      product: newProduct,
    });
  } catch (error) {
    console.error("Product creation error:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
