const userService = require("../services/userService");
const jwt = require("jsonwebtoken");
const Wallet = require("../models/Wallet");

class UserController {
  // Register
  async register(req, res) {
    try {
      const { name, email, mobile, password } = req.body;

      if (!password || (!email && !mobile)) {
        return res
          .status(400)
          .json({ message: "Email or mobile and password required" });
      }

      const existingUser = await userService.findByLogin(email || mobile);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // 1️⃣ Create user
      const user = await userService.createUser({
        name,
        email,
        mobile,
        password,
      });

      // 2️⃣ Create wallet with default 500 balance
      await Wallet.create({ user: user._id, balance: 500 });

      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
  // Login
  async login(req, res) {
    try {
      const { identifier, password } = req.body; // identifier can be email or mobile

      if (!identifier || !password) {
        return res
          .status(400)
          .json({ message: "Identifier and password required" });
      }

      const user = await userService.findByLogin(identifier);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validPassword = await userService.verifyPassword(user, password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email }, // payload
        process.env.JWT_SECRET, // secret key from .env
        { expiresIn: "1d" }, // token expiry
      );

      res.status(200).json({ message: "Login successful", user, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = new UserController();
