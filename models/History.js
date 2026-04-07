const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  result: { type: String, required: true },
  entries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Entry" }],
}, { timestamps: true });

module.exports = mongoose.model("History", historySchema);