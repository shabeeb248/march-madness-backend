const cron = require("node-cron");
const Game = require("../models/Game");
const Checkpoint = require("../models/CheckPoint");
const GameService = require("../services/gameService");

function startGameScheduler() {
  console.log("🟢 Game Scheduler Initialized");

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    console.log("⏱️ Cron triggered at:", now.toISOString());

    // ===============================
    // 1. START UPCOMING GAMES
    // ===============================
    const upcomingGames = await Game.find({
      status: "upcoming",
      startTime: { $lte: now },
    });

    for (const game of upcomingGames) {
      try {
        console.log(`🚀 Starting Game: ${game._id}`);
        await GameService.startGame(game._id);
      } catch (err) {
        console.log(`❌ Error starting game ${game._id}:`, err.message);
      }
    }

    // ===============================
    // 2. COMPLETE LIVE GAMES
    // ===============================
    const liveGames = await Game.find({
      status: "live",
    });

    for (const game of liveGames) {
      try {
        // ✅ CONDITION 1: End time reached
        if (game.endTime && game.endTime <= now) {
          console.log(`🏁 Completing Game (endTime): ${game._id}`);
          await GameService.completeGame(game._id);
          continue;
        }

        // ✅ CONDITION 2: All checkpoints completed
        const pendingCheckpoint = await Checkpoint.findOne({
          gameId: game._id,
          status: "pending",
        });

        if (!pendingCheckpoint) {
          console.log(`🏁 Completing Game (all checkpoints done): ${game._id}`);
          await GameService.completeGame(game._id);
        }
      } catch (err) {
        console.log(`❌ Error completing game ${game._id}:`, err.message);
      }
    }
  });
}

module.exports = startGameScheduler;
