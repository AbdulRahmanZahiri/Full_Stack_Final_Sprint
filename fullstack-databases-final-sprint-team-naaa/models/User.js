const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },

  // Additional profile fields
  title: { type: String, default: "No title" },
  hobbies: { type: String, default: "Not shared" },
  status: { type: String, default: "Active" },
  standing: { type: String, default: "good" },
  joinDate: { type: Date, default: Date.now },
  profileImage: { type: String, default: "" },
});

module.exports = mongoose.model("User", userSchema);
