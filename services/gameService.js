const Game = require("../models/Game");
const GameEntry = require("../models/Entry");
const Checkpoint = require("../models/CheckPoint");
const Score = require("../models/Score");

class GameService {
  // ===============================
  // ✅ Create Game + Checkpoints
  // ===============================
  async createGame(data) {
    const {
      title,
      teamAName,
      teamBName,
      league,
      entryFee,
      totalSlots = 10,
      startTime,
      endTime,
      status = "upcoming",
      teamAScore = 0,
      teamBScore = 0,
    } = data;

    // ✅ Validation
    if (!title || !entryFee) {
      throw new Error("Title and Entry Fee are required");
    }

    // ✅ Always calculate on backend (never trust frontend)
    const potAmount = Number(entryFee) * Number(totalSlots);

    const game = await Game.create({
      title,
      teamAName,
      teamBName,
      league,
      entryFee: Number(entryFee),
      totalSlots: Number(totalSlots),
      potAmount,
      startTime,
      endTime,
      status,
      teamAScore,
      teamBScore,
    });

    await this.createCheckpoints(game._id);

    return game;
  }

  async createCheckpoints(gameId) {
    const checkpoints = [];

    for (let i = 1; i <= 8; i++) {
      checkpoints.push({
        gameId,
        type: "timeout",
        sequence: i,
        rewardAmount: 10,
      });
    }

    checkpoints.push({
      gameId,
      type: "halftime",
      sequence: 9,
      rewardAmount: 10,
    });

    checkpoints.push({
      gameId,
      type: "final",
      sequence: 10,
      rewardAmount: 20,
    });

    await Checkpoint.insertMany(checkpoints);
  }

  // ===============================
  // ✅ Join Game
  // ===============================
  async joinGame(gameId, userId) {
    const existing = await GameEntry.findOne({ gameId, userId });
    if (existing) return existing;

    const count = await GameEntry.countDocuments({ gameId });
    if (count >= 10) {
      throw new Error("Game full");
    }

    const entries = await GameEntry.find({ gameId });
    const usedNumbers = entries.map((e) => e.assignedNumber);

    let assignedNumber = null;
    for (let i = 0; i < 10; i++) {
      if (!usedNumbers.includes(i)) {
        assignedNumber = i;
        break;
      }
    }

    return await GameEntry.create({
      gameId,
      userId,
      assignedNumber,
    });
  }

  // ===============================
  // ✅ Start Game
  // ===============================
  async startGame(gameId) {
    const game = await Game.findById(gameId);

    const count = await GameEntry.countDocuments({ gameId });
    if (count < 10) {
      throw new Error("Game needs 10 entries");
    }

    game.status = "live";
    await game.save();

    return game;
  }

  // ===============================
  // ✅ Update Score
  // ===============================
  async updateScore(gameId, teamAScore, teamBScore) {
    const checkpoint = await Checkpoint.findOne({
      gameId,
      status: "pending",
    }).sort({ sequence: 1 });

    if (!checkpoint) {
      throw new Error("All checkpoints completed");
    }

    const combinedScore = teamAScore + teamBScore;
    const winningNumber = combinedScore % 10;

    const winnerEntry = await GameEntry.findOne({
      gameId,
      assignedNumber: winningNumber,
    });

    const score = await Score.create({
      gameId,
      checkpointId: checkpoint._id,
      teamAScore,
      teamBScore,
      combinedScore,
      winningNumber,
    });

    checkpoint.status = "completed";
    checkpoint.winningNumber = winningNumber;
    checkpoint.winningEntryId = winnerEntry?._id;
    await checkpoint.save();

    return {
      score,
      checkpoint,
      winningNumber,
      winnerEntry,
    };
  }

  // ===============================
  // ✅ Get Game Details
  // ===============================
  async getGame(gameId) {
    const game = await Game.findById(gameId);
    const entries = await GameEntry.find({ gameId });
    const checkpoints = await Checkpoint.find({ gameId }).sort({ sequence: 1 });

    return {
      game,
      entries,
      checkpoints,
    };
  }

  // ===============================
  // ✅ Get All Games
  // ===============================
  async getAllGames() {
    return await Game.find().sort({ createdAt: -1 });
  }

  // ===============================
  // ✅ Get Upcoming Games
  // ===============================
  async getUpcomingGames() {
    return await Game.find({
      status: "upcoming",
    }).sort({ createdAt: -1 });
  }

  // ===============================
  // ✅ Get Live Games
  // ===============================
  async getLiveGames() {
    return await Game.find({
      status: "live",
    }).sort({ createdAt: -1 });
  }
}

module.exports = new GameService();
