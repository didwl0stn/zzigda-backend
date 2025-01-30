const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TssnSchema = new Schema(
  {
    take: { type: Number, required: true, default: 1 },
    status: { type: String },
    soundNum: { type: String },
    note: { type: String },
    script: {
      type: Schema.Types.ObjectId,
      ref: "Script",
      required: true,
    },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tssn", TssnSchema);
