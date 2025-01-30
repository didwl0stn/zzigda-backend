const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const castListSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    note: { type: String },
    callsheet: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CastList", castListSchema);
