import bcrypt from "bcryptjs";
import pool from "../utils/db.js";
import { validateUserInput } from "../utils/validator.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields must be entered!",
      });
    }

    const existingUserResult = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)",
      [email]
    );

    if (existingUserResult.rows[0].exists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const { error, value } = validateUserInput({ name, email, password });
    if (error) {
      const errorMessages = error.details.map((err) => err.message);
      return res.status(400).json({
        message: "Validation errors",
        errors: errorMessages,
      });
    }

    const role = name.trim().toLowerCase() === "admin" ? "Admin" : "user";

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserResult = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, hashedPassword, role]
    );

    const newUser = newUserResult.rows[0];

    return res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "all field must be entered!",
    });
  }
  const { error, value } = validateUserInput({ email, password });

  if (error) {
    const errorMessages = error.details.map((err) => err.message);
    return res.status(400).json({
      message: "Validation errors",
      errors: errorMessages,
    });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not registered",
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password!",
      });
    }

    const accessToken = jwt.sign(
      {
        access1: user.name,
        access2: user.id,
        access3: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      {
        access1: user.name,
        access2: user.id,
        access3: user.role,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("Juice", accessToken, {
      httpOnly: true,
      sameSite: "none",
      maxAge: 10 * 60 * 1000,
      // secure: true,
    });
    res.cookie("Sauce", refreshToken, {
      httpOnly: true,
      // secure: true,
      sameSite: "none",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "user logged in successfully",
      user: user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("Juice");
    res.clearCookie("Sauce");
    console.log("user logout successfully");
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const validateToken = (req, res) => {
  const authUser = req.user;
  res.status(200).json({
    success: true,
    message: "Authorized",
    authUser: authUser,
  });
};
