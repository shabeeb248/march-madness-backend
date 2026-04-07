const Transaction = require("../models/Transaction");

exports.createTransaction = async (data) => {
  const tx = new Transaction(data);
  return await tx.save();
};

exports.getTransactionsByUser = async (userId) => {
  return await Transaction.find({ userId });
};