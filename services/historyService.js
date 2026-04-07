const History = require("../models/History");

exports.createHistory = async (data) => {
  const history = new History(data);
  return await history.save();
};

exports.getHistoryByGame = async (gameId) => {
  return await History.findOne({ gameId }).populate("entries");
};