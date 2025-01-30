const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    name: { type: String, required: true },
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    members: [
      {
        member: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
