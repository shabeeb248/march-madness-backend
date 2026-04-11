const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
    title: String,
    teamAName: String,
    teamBName: String,
    league: String,

    entryFee: Number,
    totalSlots: { type: Number, default: 10 },
    potAmount: Number,

    startTime: Date,
    endTime: Date,

    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },

    // Optional live score
    teamAScore: { type: Number, default: 0 },
    teamBScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Game", gameSchema);
