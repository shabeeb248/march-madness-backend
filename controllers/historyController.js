const historyService = require("../services/historyService");

exports.createHistory = async (req, res) => {
  const history = await historyService.createHistory(req.body);
  res.status(201).json({ success: true, data: history });
};

exports.getHistoryByGame = async (req, res) => {
  const history = await historyService.getHistoryByGame(req.params.gameId);
  res.json({ success: true, data: history });
};