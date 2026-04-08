const User = require("../models/User");
const bcrypt = require("bcryptjs");

class UserService {
  // Create new user
  async createUser(data) {
    // hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = new User({ ...data, password: hashedPassword });
    return user.save();
  }

  // Find user by email or mobile
  async findByLogin(identifier) {
    return User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    });
  }

  // Verify password
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password);
  }
}

module.exports = new UserService();
