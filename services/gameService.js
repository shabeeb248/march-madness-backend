const Game = require("../models/Game");

exports.createGame = async (data) => {
  const game = new Game(data);
  return await game.save();
};

exports.getAllGames = async () => {
  return await Game.find();
};

exports.getGameById = async (id) => {
  return await Game.findById(id);
};

exports.updateGame = async (id, data) => {
  return await Game.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteGame = async (id) => {
  return await Game.findByIdAndDelete(id);
};