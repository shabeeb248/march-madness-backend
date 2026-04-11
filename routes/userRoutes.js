const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middlewares/authMiddleware");

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected route example
router.get("/profile", auth, (req, res) => {
  res.status(200).json({ message: "Profile fetched", user: req.user });
});

module.exports = router;