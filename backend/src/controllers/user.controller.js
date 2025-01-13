import bcrypt from "bcryptjs";
import pool from "../utils/db.js";
import { validateUserInput } from "../utils/validator.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const { user_name, email, password } = req.body;

  try {
    if (!user_name || !email || !password) {
      return res.status(400).json({
        message: "all field must be entered!",
      });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    console.log("this is the exiting user-->", existingUser.rows[0]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const { error, value } = validateUserInput({
      user_name,
      email,
      password,
    });

    if (error) {
      const errorMessages = error.details.map((err) => err.message);
    }
    console.log("this are the valid values", value);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [user_name, email, hashedPassword]
    );

    return res
      .status(201)
      .json({ message: "User registered successfully", user: newUser.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // valida user input
  if (!email || !password) {
    return res.status(400).json({
      message: "all field must be entered!",
    });
  }
  const { error, value } = validateUserInput({ email, password });

  if (error) {
    const errorMessages = error.details.map((err) => err.message);
  }
  console.log("this are the valid values", value);

  try {
    const result = await pool.query(
      "SELECT id, user_name, email, password FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not registered",
      });
    }

    const user = result.rows[0];
    console.log("this is the valid user -->", user);

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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
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

//Google authentication
