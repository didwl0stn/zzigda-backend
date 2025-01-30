const express = require("express");
const { check, body } = require("express-validator");

const CastList = require("../../modules/project/castList");

const castListController = require("../../controllers/project/castList");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", castListController.getCastLists);

router.get("/:castListId", castListController.getCastList);

router.put(
  "/",
  [
    body("name", "castList name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("role", "castList is required").trim().not().isEmpty(),
    body("email")
      .if((value, { req }) => value !== null || value !== "")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        return CastList.findOne({
          project: req.params.projectId,
          email: value,
        }).then((castList) => {
          if (castList) {
            return Promise.reject("email already exists");
          }
        });
      })
      .normalizeEmail(),
  ],
  castListController.createCastList
);

router.delete("/", castListController.deleteCastList);

router.patch(
  "/:castListId",
  [
    body("name", "castList name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("role", "castList is required").trim().not().isEmpty(),
    body("email")
      .if((value, { req }) => value !== null || value !== "")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom(async (value, { req }) => {
        const castList = await CastList.findById(req.params.castListId);
        if (value !== castList.email) {
          const castList = await CastList.findOne({
            project: req.params.projectId,
            email: value,
          });
          if (castList) {
            return Promise.reject("Email already exists");
          }
        }
        return true; // 이메일이 유효하고 중복되지 않는 경우 true 반환
      })
      .normalizeEmail(),
  ],
  castListController.updateCastList
);

//router.use("/:callsheetId/files");

module.exports = router;
