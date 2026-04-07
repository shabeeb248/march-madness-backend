const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, // optional, but unique if exists
    mobile: { type: String, unique: true, sparse: true }, // optional, but unique if exists
    password: { type: String, required: true },
    walletAmount: { type: Number, default: 500 },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
