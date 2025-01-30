const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, default: "I am new!" },
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    imageUrl: { type: String },
    resetToken: String,
    resetTokenExpiration: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
