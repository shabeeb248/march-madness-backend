const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected route example
router.get("/profile", authMiddleware, (req, res) => {
  res.status(200).json({ message: "Profile fetched", user: req.user });
});

module.exports = router;