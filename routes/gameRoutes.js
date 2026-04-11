const express = require("express");
const router = express.Router();
const controller = require("../controllers/gameController");
const { auth, isAdmin } = require("../middlewares/authMiddleware");

// Admin routes
router.post("/create", auth, isAdmin, controller.createGame);
router.post("/start/:gameId", auth, isAdmin, controller.startGame);
router.post("/update-score", auth, isAdmin, controller.updateScore);

// User
router.post("/join/:gameId", auth, controller.joinGame);

// Public
router.get("/all", controller.getAllGames);
router.get("/upcoming", controller.getUpcomingGames);
router.get("/live", controller.getLiveGames);
router.get("/:gameId", controller.getGame);

module.exports = router;
