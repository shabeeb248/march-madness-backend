const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");

router.post("/", historyController.createHistory);
router.get("/game/:gameId", historyController.getHistoryByGame);

module.exports = router;