const History = require("../models/History");

const getUserGameHistory = async (userId) => {
  const histories = await History.find({ user: userId })
    .populate({
      path: "gameId",
      select:
        "teamAName teamBName teamAScore teamBScore startTime status",
    })
    .populate({
      path: "entries",
      select: "assignedNumber",
    })
    .sort({ createdAt: -1 });

  const grouped = {};

  histories.forEach((h) => {
    if (!h.gameId) return;

    const gameId = h.gameId._id.toString();

    if (!grouped[gameId]) {
      grouped[gameId] = {
        teamA: h.gameId.teamAName,
        teamB: h.gameId.teamBName,

        score: `${h.gameId.teamAScore || 0}-${
          h.gameId.teamBScore || 0
        }`,

        startTime: h.gameId.startTime,

        yourNumber: h.assignedNumber || null,

        entry: 0,
        amount: 0,

        checkpoints: [],
      };
    }

    // ENTRY
    if (h.action === "joined") {
      grouped[gameId].entry += h.amount || 0;
    }

    // WIN
    if (h.action === "win") {
      grouped[gameId].amount += h.amount || 0;
    }
  });

  let games = Object.values(grouped).map((g) => {
    const date = new Date(g.startTime);

    return {
      ...g,
      month: date.toLocaleString("en-US", { month: "short" }),
      day: date.getDate(),

      win: g.amount > 0,

      checkpointsWon: 0,
      totalCheckpoints: 0,
    };
  });

  // SORT
  games.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  // SUMMARY
  const totalWinnings = games.reduce((sum, g) => sum + g.amount, 0);
  const gamesPlayed = games.length;
  const wins = games.filter((g) => g.win).length;

  const winRate = gamesPlayed
    ? Math.round((wins / gamesPlayed) * 100)
    : 0;

  const bestHit = Math.max(...games.map((g) => g.amount), 0);

  return {
    summary: {
      totalWinnings,
      gamesPlayed,
      winRate,
      bestHit,
    },
    games,
  };
};

module.exports = {
  getUserGameHistory,
};