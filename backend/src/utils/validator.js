import Joi from "joi";

export const validateUserInput = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(30).messages({
      "string.empty": "User name is required.",
      "string.min": "User name must be at least 3 characters.",
      "string.max": "User name must not exceed 30 characters.",
      "any.required": "User name is required.",
    }),
    email: Joi.string().email().required().messages({
      "string.empty": "Email is required.",
      "string.email": "Please provide a valid email address.",
      "any.required": "Email is required.",
    }),
    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters long.",
      "any.required": "Password is required.",
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

export const validateProductInput = (data) => {
  const schema = Joi.object({
    id: Joi.string()
      .guid({ version: ["uuidv4"] })
      .optional()
      .messages({
        "string.guid": "Product ID must be a valid UUID.",
      }),
    name: Joi.string().max(150).required().messages({
      "string.empty": "Product name is required.",
      "string.max": "Product name must not exceed 150 characters.",
      "any.required": "Product name is required.",
    }),
    description: Joi.string().required().messages({
      "string.empty": "Product description is required.",
      "any.required": "Product description is required.",
    }),
    price: Joi.number().min(0).precision(2).required().messages({
      "number.base": "Price must be a valid number.",
      "number.min": "Price must be a non-negative value.",
      "any.required": "Price is required.",
    }),
    category_id: Joi.number().integer().required().messages({
      "number.base": "Category ID must be a valid integer.",
      "any.required": "Category ID is required.",
    }),
    image_url: Joi.string().uri().optional().messages({
      "string.uri": "Image URL must be a valid URI.",
    }),
    stock: Joi.number().min(0).precision(2).default(0).optional().messages({
      "number.base": "Stock must be a valid number.",
      "number.min": "Stock must be a non-negative value.",
    }),
    created_at: Joi.date().optional().messages({
      "date.base": "Created at must be a valid date.",
    }),
    updated_at: Joi.date().optional().messages({
      "date.base": "Updated at must be a valid date.",
    }),
  });

  return schema.validate(data, { abortEarly: false });
};
