const transactionService = require("../services/transactionService");

exports.createTransaction = async (req, res) => {
  const tx = await transactionService.createTransaction(req.body);
  res.status(201).json({ success: true, data: tx });
};

exports.getUserTransactions = async (req, res) => {
  const txs = await transactionService.getTransactionsByUser(req.params.userId);
  res.json({ success: true, data: txs });
};