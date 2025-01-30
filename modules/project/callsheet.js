const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const callsheetSchema = new Schema(
  {
    name: { type: String, required: true },
    crewCall: { type: String, required: true },
    place: { type: String },
    date: { type: String, required: true },
    start: { type: String },
    head: [
      {
        role: { type: String },
        name: { type: String },
        phone: { type: String },
      },
    ],
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    weather: { type: Schema.Types.ObjectId, ref: "Weather" },
    schedule: [{ type: Schema.Types.ObjectId, ref: "Schedule" }],
    staffCall: [{ type: Schema.Types.ObjectId, ref: "staffCall" }],
    castCall: [{ type: Schema.Types.ObjectId, ref: "castCall" }],
    locationCall: [{ type: Schema.Types.ObjectId, ref: "LocationCall" }],
    checkList: [{ type: Schema.Types.ObjectId, ref: "CheckList" }],
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    // 추후, 업무별 수정 및 관리 권한 발생한다면, manager: {type: Schema.Types.ObjectId, ref: "User"} 필요
    // recipient 관리 창도 생길 것이데, 그것은 어떻게 할 것인지.
  },
  { timestamps: true }
);

module.exports = mongoose.model("Callsheet", callsheetSchema);
