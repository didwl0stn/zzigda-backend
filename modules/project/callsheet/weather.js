const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const weatherSchema = new Schema(
  {
    condition: { type: String, required: true },
    temp: { type: String, required: true },
    sunRise: { type: String, required: true },
    sunFall: { type: String, required: true },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Weather", weatherSchema);
