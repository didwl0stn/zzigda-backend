const express = require("express");
const { check, body } = require("express-validator");

const StaffList = require("../../modules/project/staffList");

const staffListController = require("../../controllers/project/staffList");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", staffListController.getStaffLists);

router.get("/:staffListId", staffListController.getStaffList);

router.put(
  "/",
  [
    body("name", "callsheet name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("dept", "dept can't be null").trim().not().isEmpty(),
    body("role", "role can't be null").trim().not().isEmpty(),
    body("email")
      .if((value, { req }) => value !== null || value !== "")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        return StaffList.findOne({
          project: req.params.projectId,
          email: value,
        }).then((staffList) => {
          if (staffList) {
            return Promise.reject("email already exists");
          }
        });
      })
      .normalizeEmail(),
  ],
  staffListController.createStaffList
);

router.delete("/", staffListController.deleteStaffList);

router.patch(
  "/:staffListId",
  [
    body("name", "callsheet name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("dept", "dept can't be null").trim().not().isEmpty(),
    body("role", "role can't be null").trim().not().isEmpty(),
    body("email")
      .if((value, { req }) => value)
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom(async (value, { req }) => {
        const staffList = await StaffList.findById(req.params.staffListId);
        if (value !== staffList.email) {
          const staffList = await StaffList.findOne({
            project: req.params.projectId,
            email: value,
          });
          if (staffList) {
            return Promise.reject("email already exists");
          }
        }
        return true;
      })
      .normalizeEmail(),
  ],
  staffListController.updateStaffList
);

//router.use("/:callsheetId/files");

module.exports = router;
