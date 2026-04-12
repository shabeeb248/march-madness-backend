const History = require("../models/History");

exports.getUserGameHistory = async (userId) => {
  const histories = await History.find({ user: userId })
    .populate({
      path: "gameId",
      select: "teamA teamB scoreA scoreB startTime status",
    })
    .populate({
      path: "entries",
      select: "checkpoint type amount status",
    })
    .sort({ createdAt: -1 });

  const grouped = {};

  histories.forEach((h) => {
    if (!h.gameId) return;

    const gameId = h.gameId._id.toString();

    // INIT GAME GROUP
    if (!grouped[gameId]) {
      grouped[gameId] = {
        _id: gameId,

        game: {
          teamA: h.gameId.teamA,
          teamB: h.gameId.teamB,
          scoreA: h.gameId.scoreA || 0,
          scoreB: h.gameId.scoreB || 0,
          startTime: h.gameId.startTime,
          status: h.gameId.status,
        },

        entryFee: 0,
        totalWin: 0,
        userNumber: h.assignedNumber || null,

        checkpoints: [],

        createdAt: h.createdAt,
      };
    }

    // ENTRY (JOINED)
    if (h.action === "joined") {
      grouped[gameId].entryFee += h.amount || 0;
    }

    // WIN
    if (h.action === "win") {
      grouped[gameId].totalWin += h.amount || 0;

      grouped[gameId].checkpoints.push({
        type: "Win",
        status: "won",
        amount: h.amount || 0,
      });
    }

    // REFUND
    if (h.action === "refund") {
      grouped[gameId].checkpoints.push({
        type: "Refund",
        status: "lost",
        amount: 0,
      });
    }

    // OPTIONAL: if entries exist → better checkpoint details
    if (h.entries && h.entries.length > 0) {
      h.entries.forEach((entry) => {
        grouped[gameId].checkpoints.push({
          type: entry.type || "Checkpoint",
          status: entry.status === "won" ? "won" : "lost",
          amount: entry.status === "won" ? entry.amount : 0,
        });
      });
    }
  });

  // CONVERT TO ARRAY
  let result = Object.values(grouped);

  // SORT BY LATEST GAME
  result = result.sort(
    (a, b) => new Date(b.game.startTime) - new Date(a.game.startTime)
  );

  return result;
};