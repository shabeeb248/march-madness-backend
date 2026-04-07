const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");

router.post("/", gameController.createGame);
router.get("/", gameController.getGames);
router.put("/:id", gameController.updateGame);

module.exports = router;