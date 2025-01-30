const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new Schema(
  {
    imageUrl: { type: String },
    name: { type: String, required: true },
    address: { type: String, required: true },
    scene: { type: Number, required: true },
    phone: { type: String },
    note: { type: String },
    callsheet: [{ type: Schema.Types.ObjectId, ref: "Callsheet" }],
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
