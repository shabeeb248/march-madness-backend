const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

router.post("/", transactionController.createTransaction);
router.get("/user/:userId", transactionController.getUserTransactions);

module.exports = router;