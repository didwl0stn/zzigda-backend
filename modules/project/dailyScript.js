const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dailyScriptSchema = new Schema(
  {
    date: { type: String, required: true },
    script: [{ type: Schema.Types.ObjectId, ref: "Script" }],
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
    },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyScript", dailyScriptSchema);
