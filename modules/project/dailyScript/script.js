const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScriptSchema = new Schema(
  {
    scene: { type: Number, required: true },
    cut: { type: Number, required: true },
    tssn: [{ type: Schema.Types.ObjectId, ref: "Tssn" }],
    dailyScript: {
      type: Schema.Types.ObjectId,
      ref: "DailyScript",
      required: true,
    },
    callSchedule: { type: Schema.Types.ObjectId, ref: "Schedule" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Script", ScriptSchema);
