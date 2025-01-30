const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    members: [
      {
        member: { type: Schema.Types.ObjectId, ref: "User" },
        pRole: { type: String },
        authority: { type: Number, required: true },
      },
    ],
    imageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
