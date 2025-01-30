const express = require("express");
const { check, body } = require("express-validator");

const memberController = require("../../controllers/project/member");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", memberController.getProjectMembers);

router.get("/:memberId", memberController.getProjectMember);

router.put(
  "/",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("authority").isNumeric().not().isEmpty(),
  ],
  memberController.createProjectMember
);

router.patch(
  "/:memberId",
  [body("authority").isNumeric().not().isEmpty()],
  memberController.updateProjectMember
);

router.delete("/", memberController.deleteProjectMember);

//router.use("/:callsheetId/files");

module.exports = router;
