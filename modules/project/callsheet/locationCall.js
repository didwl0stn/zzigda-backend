const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationCallSchema = new Schema(
  {
    order: { type: Number, required: true, default: 0 },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    note: { type: String },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocationCall", locationCallSchema);
