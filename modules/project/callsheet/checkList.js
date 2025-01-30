const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const checkListSchema = new Schema(
  {
    order: { type: Number, required: true, default: 0 },
    dept: { type: String, required: true },
    content: { type: String },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CheckList", checkListSchema);
