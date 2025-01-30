const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const storyboardSchema = new Schema(
  {
    scene: { type: Number, required: true },
    cut: { type: Number, required: true },
    imageUrl: { type: String },
    video: { type: String },
    audio: { type: String },
    status: { type: String },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Storyboard", storyboardSchema);
