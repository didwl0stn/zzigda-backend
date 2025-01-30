const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const staffCallSchema = new Schema(
  {
    order: { type: Number, required: true, default: 0 },
    dept: { type: String, required: true },
    staff: {
      type: Schema.Types.ObjectId,
      ref: "StaffList",
      required: true,
    },
    call: { type: String },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "Callsheet",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("staffCall", staffCallSchema);
