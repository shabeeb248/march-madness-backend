const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

class WalletService {
  // Always return a wallet object; create if missing
  async getWalletByUser(userId) {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 500 });
    }
    return wallet;
  }

  async getPendingWithdrawals(userId) {
    const pending = await Transaction.aggregate([
      { $match: { user: userId, type: "withdraw", status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return pending.length ? pending[0].total : 0;
  }

  async deposit(userId, amount) {
    amount = Number(amount) || 500; // default to 500
    console.log(
      "WalletService.deposit called with amount:",
      amount,
      "for user:",
      userId,
    );

    // Find wallet or create if it doesn't exist
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Log transaction only if amount > 0
    if (amount > 0) {
      await Transaction.create({
        user: userId,
        type: "deposit",
        amount,
        balanceAfter: wallet.balance,
        status: "completed", // 👈 important
        title: "Bank Deposit",
        subtitle: "Chase Bank",
      });
    }

    return wallet;
  }

  async withdraw(userId, amount) {
    amount = Number(amount) || 0;
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    wallet.balance -= amount;
    await wallet.save();

    await Transaction.create({
      user: userId,
      type: "withdraw",
      amount,
      balanceAfter: wallet.balance,
      status: "completed",
      title: "Withdrawal",
      subtitle: "Chase Bank",
    });

    return wallet;
  }

  async getUserTransactions(userId) {
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return transactions.map((tx) => ({
      id: tx._id,
      type: tx.type,
      title: tx.title,
      subtitle:
        tx.subtitle + " • " + new Date(tx.createdAt).toLocaleDateString(),

      amount: tx.amount,
      status: tx.status,
    }));
  }

  async gameEntry(userId, amount, matchName) {
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    wallet.balance -= amount;
    await wallet.save();

    await Transaction.create({
      user: userId,
      type: "entry",
      amount,
      balanceAfter: wallet.balance,
      status: "completed",
      title: "Game Entry",
      subtitle: matchName, // "DUK vs UNC"
    });

    return wallet;
  }

  async addWinning(userId, amount, matchName, isFinal = true) {
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) throw new Error("Wallet not found");

    wallet.balance += amount;
    await wallet.save();

    await Transaction.create({
      user: userId,
      type: isFinal ? "win_final" : "win_half",
      amount,
      balanceAfter: wallet.balance,
      status: "completed",
      title: isFinal ? "Game Winnings (Final)" : "Game Winnings (Half)",
      subtitle: matchName,
    });

    return wallet;
  }
}

module.exports = new WalletService();
