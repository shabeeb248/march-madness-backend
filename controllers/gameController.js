const gameService = require("../services/gameService");

exports.createGame = async (req, res) => {
  try {
    const game = await gameService.createGame(req.body);
    res.status(201).json({ success: true, data: game });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGames = async (req, res) => {
  const games = await gameService.getAllGames();
  res.json({ success: true, data: games });
};

exports.updateGame = async (req, res) => {
  const game = await gameService.updateGame(req.params.id, req.body);
  res.json({ success: true, data: game });
};