const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const castCallSchema = new Schema(
  {
    order: { type: Number, required: true, default: 0 },
    num: { type: Number, required: true, default: 1 },
    cast: {
      type: Schema.Types.ObjectId,
      ref: "CastList",
      required: true,
    },
    call: { type: String },
    onSet: { type: String },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("castCall", castCallSchema);
