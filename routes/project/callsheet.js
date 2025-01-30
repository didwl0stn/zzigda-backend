const express = require("express");
const { check, body } = require("express-validator");

const Callsheet = require("../../modules/project/callsheet");

const callsheetController = require("../../controllers/project/callsheet");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const castCallRoutes = require("./callsheet/castCall");
const checkListRoutes = require("./callsheet/checkList");
const scheduleRoutes = require("./callsheet/schedule");
const staffCallRoutes = require("./callsheet/staffCall");
const locationCallRoutes = require("./callsheet/locationCall");
const weatherRoutes = require("./callsheet/weather");

const castListController = require("../../controllers/project/castList");
const staffListController = require("../../controllers/project/staffList");
const locationController = require("../../controllers/project/location");

const router = express.Router({ mergeParams: true });

router.get("/all", callsheetController.getCallsheets);

router.put(
  "/create",
  [
    body("name", "callsheet name at least 1 character")
      .trim()
      .isLength({ min: 1 }),
    // 날짜 데이터 검증 로직 필요
    body("date", "date validation")
      .trim()
      .isDate()
      .not()
      .isEmpty()
      .custom((value, { req }) => {
        return Callsheet.findOne({
          project: req.params.projectId,
          date: value,
        }).then((callsheet) => {
          if (callsheet) {
            return Promise.reject("callsheet on this date already exists");
          }
        });
      }),
    body("crewCall", "time validation")
      .trim()
      .isTime({ hourFormat: "hour24", mode: "default" })
      .not()
      .isEmpty(),
  ],
  callsheetController.createCallsheet
);

router.get("/:callsheetId", callsheetController.getCallsheet);

// 차례로 castList, staffList, location 불러오기 버튼에 관한 get
router.get("/:callsheetId/addCastList", castListController.getAddCastList);
router.get("/:callsheetId/addStaffList", staffListController.getAddStaffList);
router.get("/:callsheetId/addLocation", locationController.getAddLocation);

router.delete("/:callsheetId", callsheetController.deleteCallsheet);

router.patch(
  "/:callsheetId",
  [
    body("name", "callsheet name at least 1 character")
      .trim()
      .isLength({ min: 1 }),
    // 날짜 데이터 검증 로직 필요
    body("date", "date validation")
      .trim()
      .isDate()
      .not()
      .isEmpty()
      .custom(async (value, { req }) => {
        const callsheet = await Callsheet.findById(req.params.callsheetId);
        if (value !== callsheet.date) {
          const callsheet = await Callsheet.findOne({
            project: req.params.projectId,
            date: value,
          });
          if (callsheet) {
            return Promise.reject("date already exists");
          }
        }
        return true;
      }),
    body("crewCall", "time validation")
      .trim()
      .isTime({ hourFormat: "hour24", mode: "default" })
      .not()
      .isEmpty(),
    body("start", "time validation")
      .trim()
      .isTime({ hourFormat: "hour24", mode: "default" }),
    body("head", "head validation").isArray(),
  ],
  callsheetController.updateCallsheet
);

router.use("/:callsheetId/staffCall", staffCallRoutes);

router.use("/:callsheetId/schedule", scheduleRoutes);

router.use("/:callsheetId/checkList", checkListRoutes);

router.use("/:callsheetId/castCall", castCallRoutes);

router.use("/:callsheetId/locationCall", locationCallRoutes);

router.use("/:callsheetId/weather", weatherRoutes);

//router.use("/:callsheetId/files");

module.exports = router;
