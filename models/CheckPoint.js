const mongoose = require("mongoose");

const checkpointSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
    type: {
      type: String,
      enum: ["timeout", "halftime", "final"],
    },
    sequence: Number, // 1–10
    rewardAmount: Number,
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    winningNumber: Number,
    winningEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "GameEntry" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Checkpoint", checkpointSchema);
