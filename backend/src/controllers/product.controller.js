import cloudinary from "../utils/cloudinary.js";
import pool from "../utils/db.js";

export const createProduct = async (req, res) => {
  const adminUser = req.user;
  const { name, price, description, stock, category } = req.body;

  console.log("this is the admin user --->", adminUser);

  try {
    if (adminUser.role === "user") {
      return res.status(401).json({
        message: "access denied only admin can access",
      });
    }
    if (!name || !price || !description || !category || stock === undefined) {
      return res.status(400).json({
        message:
          "All fields (name, price, description, stock, category) must be entered.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required." });
    }

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

    const [cloudinaryResult, categoryResult] = await Promise.all([
      uploadToCloudinary(req.file.buffer),
      pool.query("SELECT id FROM categories WHERE name = $1", [category]), // Get category ID from DB
    ]);

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        message: `Category "${category}" does not exist.`,
      });
    }

    const imageUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;
    const categoryId = categoryResult.rows[0].id;

    const productInsertQuery = `
      INSERT INTO products (name, price, description, stock, image_url, category_id, public_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await pool.query(productInsertQuery, [
      name,
      price,
      description,
      stock,
      imageUrl,
      categoryId,
      publicId,
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

export const updateProduct = async (req, res) => {
  const adminUser = req.user;
  const { id } = req.params;
  const { name, price, description, stock, category } = req.body;

  try {
    if (adminUser.role === "user") {
      return res.status(401).json({
        message: "Access denied. Only admins can perform this action.",
      });
    }

    const query = `
      SELECT p.*, c.id AS category_id
      FROM products p
      LEFT JOIN categories c ON c.name = $2
      WHERE p.id = $1;
    `;

    const { rows } = await pool.query(query, [id, category]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Product or category not found." });
    }

    const existingProduct = rows[0];
    const categoryId = existingProduct.category_id;

    if (!categoryId) {
      return res.status(400).json({
        message: `Category "${category}" does not exist.`,
      });
    }

    let imageUrl = existingProduct.image_url;
    let publicId = existingProduct.public_id;

    if (req.file) {
      const deleteOldImage = publicId
        ? cloudinary.uploader.destroy(publicId)
        : Promise.resolve();

      const uploadNewImage = new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "ecommerce", use_filename: true },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      const [_, cloudinaryResult] = await Promise.all([
        deleteOldImage,
        uploadNewImage,
      ]);

      imageUrl = cloudinaryResult.secure_url;
      publicId = cloudinaryResult.public_id;
    }

    const updateQuery = `
      UPDATE products
      SET name = $1, price = $2, description = $3, stock = $4, category_id = $5, image_url = $6, public_id = $7
      WHERE id = $8
      RETURNING *;
    `;
    const updatedProduct = await pool.query(updateQuery, [
      name,
      price,
      description,
      stock,
      categoryId,
      imageUrl,
      publicId,
      id,
    ]);

    return res.status(200).json({
      message: "Product updated successfully.",
      product: updatedProduct.rows[0],
    });
  } catch (error) {
    console.error("Error updating product:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id;
    `;
    const { rows } = await pool.query(query);

    return res.status(200).json({
      message: "Products retrieved successfully.",
      products: rows,
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1;
    `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      message: "Product retrieved successfully.",
      product: rows[0],
    });
  } catch (error) {
    console.error("Error fetching product:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

export const deleteProduct = async (req, res) => {
  const adminUser = req.user;
  const { id } = req.params;

  try {
    if (adminUser.role === "user") {
      return res.status(401).json({
        message: "Access denied. Only admins can perform this action.",
      });
    }

    const fetchQuery = `
      SELECT public_id 
      FROM products 
      WHERE id = $1;
    `;
    const { rows: productRows } = await pool.query(fetchQuery, [id]);

    if (productRows.length === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const publicId = productRows[0].public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error.message);
        return res.status(500).json({
          message: "Failed to delete product image.",
        });
      }
    }
    const deleteQuery = `
      DELETE FROM products 
      WHERE id = $1 
      RETURNING *;
    `;
    const { rows: deletedRows } = await pool.query(deleteQuery, [id]);

    if (deletedRows.length === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully.",
      product: deletedRows[0],
    });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
