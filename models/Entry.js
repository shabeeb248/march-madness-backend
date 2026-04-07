const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  prediction: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "won", "lost"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Entry", entrySchema);