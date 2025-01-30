const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scheduleSchema = new Schema(
  {
    order: { type: Number, required: true },
    type: { type: String, required: true },
    time: { type: String },
    scene: { type: Number },
    cut: { type: Number },
    description: { type: String },
    character: { type: String },
    props: { type: String },
    location: { type: String },
    note: { type: String },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
