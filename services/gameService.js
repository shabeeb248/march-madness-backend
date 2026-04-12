const Game = require("../models/Game");
const GameEntry = require("../models/Entry");
const Checkpoint = require("../models/CheckPoint");
const History = require("../models/History");
const Score = require("../models/Score");
const WalletService = require("./walletService");

class GameService {
  constructor() {
    this.runningGames = new Map();
  }

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
      status = "upcoming",
      scores = [],
    } = data;

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
      status,
    });

    await this.createCheckpoints(game._id, totalSlots);

    // ✅ preload scores
    if (scores.length) {
      const checkpointDocs = await Checkpoint.find({ gameId: game._id });

      const scoreDocs = scores
        .map((s) => {
          const cp = checkpointDocs.find((c) => c.sequence === s.sequence);
          if (!cp) return null;

          return {
            gameId: game._id,
            checkpointId: cp._id,
            teamAScore: s.teamAScore,
            teamBScore: s.teamBScore,
          };
        })
        .filter(Boolean);

      await Score.insertMany(scoreDocs);
    }

    return game;
  }

  async createCheckpoints(gameId, totalSlots) {
    const checkpoints = [];
    const halfIndex = Math.floor(totalSlots / 2);

    for (let i = 1; i <= totalSlots; i++) {
      let type = "timeout";
      let rewardAmount = 10;

      if (i === halfIndex) type = "halftime";
      if (i === totalSlots) {
        type = "final";
        rewardAmount = 20;
      }

      checkpoints.push({
        gameId,
        type,
        sequence: i,
        rewardAmount,
        status: "pending",
      });
    }

    await Checkpoint.insertMany(checkpoints);
  }

  // ===============================
  // ✅ Join Game
  // ===============================
  async joinGame(gameId, userId) {
    const existing = await GameEntry.findOne({ gameId, userId });
    if (existing) return existing;

    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    const count = await GameEntry.countDocuments({ gameId });
    if (count >= game.totalSlots) throw new Error("Game full");

    const wallet = await WalletService.gameEntry(
      userId,
      game.entryFee,
      `${game.teamAName} vs ${game.teamBName}`,
    );

    const entries = await GameEntry.find({ gameId });
    const usedNumbers = entries.map((e) => e.assignedNumber);

    let assignedNumber = null;
    for (let i = 0; i < 10; i++) {
      if (!usedNumbers.includes(i)) {
        assignedNumber = i;
        break;
      }
    }

    const entry = await GameEntry.create({
      gameId,
      userId,
      assignedNumber,
    });

    await History.create({
      gameId,
      entries: [entry._id],
      action: "joined",
      user: userId,
      amount: game.entryFee,
      balanceAfter: wallet.balance,
      assignedNumber,
    });

    return entry;
  }

  // ===============================
  // ✅ Start Game
  // ===============================
  async startGame(gameId) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    game.status = "live";
    await game.save();

    this.runGameLoop(gameId);

    return game;
  }

  // ===============================
  // ✅ GAME LOOP
  // ===============================
  runGameLoop(gameId) {
    if (this.runningGames.has(gameId)) return;

    console.log(`🎯 Game loop STARTED: ${gameId}`);

    const interval = setInterval(async () => {
      try {
        const checkpoint = await Checkpoint.findOne({
          gameId,
          status: "pending",
        }).sort({ sequence: 1 });

        if (!checkpoint) {
          clearInterval(interval);
          this.runningGames.delete(gameId);
          return;
        }

        // ✅ INIT TIMER
        if (!checkpoint.startTime) {
          const now = new Date();

          checkpoint.startTime = now;
          checkpoint.duration = 240;
          checkpoint.endTime = new Date(now.getTime() + 240 * 1000);

          await checkpoint.save();
        }

        const score = await Score.findOne({
          gameId,
          checkpointId: checkpoint._id,
        });

        if (!score) {
          checkpoint.status = "completed";
          await checkpoint.save();
          return;
        }

        await this.processCheckpoint(gameId, checkpoint, score);
      } catch (err) {
        console.error(err);
      }
    }, 4000); // faster check

    this.runningGames.set(gameId, interval);
  }

  // ===============================
  // ✅ PROCESS CHECKPOINT
  // ===============================
  async processCheckpoint(gameId, checkpoint, score) {
    const total = score.teamAScore + score.teamBScore;
    const winningNumber = total % 10;

    const winnerEntry = await GameEntry.findOne({
      gameId,
      assignedNumber: winningNumber,
    });

    const game = await Game.findById(gameId);

    if (winnerEntry) {
      await WalletService.addWinning(
        winnerEntry.userId,
        checkpoint.rewardAmount,
        `${game.teamAName} vs ${game.teamBName}`,
        checkpoint.type === "final",
      );
    }

    checkpoint.status = "completed";
    checkpoint.winningNumber = winningNumber;
    checkpoint.winningEntryId = winnerEntry?._id;

    await checkpoint.save();
  }

  // ===============================
  // ✅ ADMIN SET SCORE
  // ===============================
  async setCheckpointScore(gameId, sequence, teamAScore, teamBScore) {
    const checkpoint = await Checkpoint.findOne({ gameId, sequence });

    if (!checkpoint) throw new Error("Checkpoint not found");

    return await Score.findOneAndUpdate(
      { gameId, checkpointId: checkpoint._id },
      {
        gameId,
        checkpointId: checkpoint._id,
        teamAScore,
        teamBScore,
      },
      { upsert: true, new: true },
    );
  }

  // ===============================
  // ✅ AUTO START
  // ===============================
  async autoStartGames() {
    const now = new Date();

    const games = await Game.find({
      status: "upcoming",
      startTime: { $lte: now },
    });

    for (const game of games) {
      try {
        await this.startGame(game._id);
      } catch (err) {
        console.log(err.message);
      }
    }
  }

    // ===============================
  // ✅ GET GAME DETAILS (Details)
  // ===============================
  async getGame(gameId) {
    const game = await Game.findById(gameId).lean();
    if (!game) throw new Error("Game not found");

    const teamAScore = lastScore.teamAScore;
    const teamBScore = lastScore.teamBScore;

    const totalScore = teamAScore + teamBScore;
    const winningNumber = totalScore % 10;

    return {
      game: {
        _id: game._id,
        teamAName: game.teamAName,
        teamBName: game.teamBName,
        league: game.league,
        entryFee: game.entryFee,
        totalSlots: game.totalSlots,
        potAmount: game.potAmount,

        teamAScore,
        scoreB: teamBScore,
        totalScore,
        winningNumber,

        userEntryNumber: userEntry?.assignedNumber ?? null,

        status: game.status,
        startTime: game.startTime,

        quarter: getQuarterFromSequence(currentCheckpoint?.sequence),
      },
    };
  }

  // ===============================
  // ✅ GET GAME DETAILS (FINAL)
  // ===============================
  async getGameDetails(gameId, userId) {
    const game = await Game.findById(gameId).lean();
    if (!game) throw new Error("Game not found");

    const entries = await GameEntry.find({ gameId }).lean();
    const checkpoints = await Checkpoint.find({ gameId })
      .sort({ sequence: 1 })
      .lean();
    const scores = await Score.find({ gameId }).lean();

    const lastScore = scores[scores.length - 1] || {
      teamAScore: 0,
      teamBScore: 0,
    };

    const teamAScore = lastScore.teamAScore;
    const teamBScore = lastScore.teamBScore;

    const totalScore = teamAScore + teamBScore;
    const winningNumber = totalScore % 10;

    const userEntry = entries.find(
      (e) => e.userId && e.userId.toString() === userId?.toString(),
    );

    const currentCheckpoint =
      checkpoints.find((c) => c.status === "pending") || null;

    // ✅ TIMER
    let timeLeft = 0;
    let progress = 0;

    if (currentCheckpoint?.endTime && currentCheckpoint?.startTime) {
      const now = Date.now();
      const end = new Date(currentCheckpoint.endTime).getTime();
      const start = new Date(currentCheckpoint.startTime).getTime();

      timeLeft = Math.max(0, Math.floor((end - now) / 1000));

      const total = (end - start) / 1000;
      progress = total ? ((total - timeLeft) / total) * 100 : 0;
    }

    const enrichedCheckpoints = checkpoints.map((cp) => {
      const score = scores.find(
        (s) =>
          s.checkpointId && s.checkpointId.toString() === cp._id.toString(),
      );

      return {
        _id: cp._id,
        type: cp.type,
        sequence: cp.sequence,
        rewardAmount: cp.rewardAmount,
        status: cp.status,
        teamAScore: score?.teamAScore || 0,
        teamBScore: score?.teamBScore || 0,
        winningNumber: cp.winningNumber ?? null,
      };
    });

    const winners = checkpoints
      .filter((cp) => cp.status === "completed" && cp.winningNumber !== null)
      .map((cp) => {
        const entry = entries.find(
          (e) => e.assignedNumber === cp.winningNumber,
        );

        return {
          checkpoint: cp.sequence,
          type: cp.type,
          number: cp.winningNumber,
          amount: cp.rewardAmount,
          userId: entry?.userId || null,
        };
      });

    return {
      game: {
        _id: game._id,
        teamAName: game.teamAName,
        teamBName: game.teamBName,
        league: game.league,
        entryFee: game.entryFee,
        totalSlots: game.totalSlots,
        potAmount: game.potAmount,

        teamAScore,
        scoreB: teamBScore,
        totalScore,
        winningNumber,

        userEntryNumber: userEntry?.assignedNumber ?? null,

        status: game.status,
        startTime: game.startTime,

        quarter: getQuarterFromSequence(currentCheckpoint?.sequence),

        currentCheckpoint: currentCheckpoint
          ? {
              sequence: currentCheckpoint.sequence,
              type: currentCheckpoint.type,
              rewardAmount: currentCheckpoint.rewardAmount,
              timeLeft,
              progress,
            }
          : null,

        checkpoints: enrichedCheckpoints,
        winners,
      },
    };
  }

  async getAllGames() {
    return await Game.find().sort({ createdAt: -1 });
  }

  async getUpcomingGames() {
    return await Game.find({ status: "upcoming" }).sort({ createdAt: -1 });
  }

  async getLiveGames() {
    const games = await Game.find({ status: "live" })
      .sort({ createdAt: -1 })
      .lean();

    const gameIds = games.map((g) => g._id);

    const checkpoints = await Checkpoint.find({
      gameId: { $in: gameIds },
    }).lean();

    return games.map((game) => {
      const gameCheckpoints = checkpoints
        .filter((c) => c.gameId.toString() === game._id.toString())
        .sort((a, b) => a.sequence - b.sequence);

      const currentCheckpoint =
        gameCheckpoints.find((c) => c.status === "pending") || null;

      return {
        _id: game._id,
        teamAName: game.teamAName,
        teamBName: game.teamBName,
        teamAScore: game.teamAScore || 0,
        teamBScore: game.teamBScore || 0,

        currentQuarter: getQuarterFromSequence(currentCheckpoint?.sequence),

        currentCheckpoint: currentCheckpoint
          ? {
              type: currentCheckpoint.type,
              sequence: currentCheckpoint.sequence,
              rewardAmount: currentCheckpoint.rewardAmount,
            }
          : null,
      };
    });
  }
  async completeGame(gameId) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    game.status = "completed";
    game.completedAt = new Date();

    await game.save();

    // 🛑 stop interval if running
    if (this.runningGames.has(gameId)) {
      clearInterval(this.runningGames.get(gameId));
      this.runningGames.delete(gameId);
    }

    console.log(`🏁 Game COMPLETED: ${gameId}`);

    return game;
  }
}

function getQuarterFromSequence(seq) {
  if (!seq) return "LIVE";
  if (seq <= 2) return "Q1";
  if (seq <= 4) return "Q2";
  if (seq <= 6) return "Q3";
  return "Q4";
}

module.exports = new GameService();
