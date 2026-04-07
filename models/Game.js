const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startTime: Date,
  endTime: Date,
  status: { type: String, enum: ["upcoming", "live", "completed"], default: "upcoming" },
  result: String, // optional, store game result
}, { timestamps: true });

module.exports = mongoose.model("Game", gameSchema);