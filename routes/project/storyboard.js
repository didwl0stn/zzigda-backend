const express = require("express");
const { check, body } = require("express-validator");

const Storyboard = require("../../modules/project/storyboard");

const storyboardController = require("../../controllers/project/storyboard");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", storyboardController.getStoryboards);

router.put(
  "/",
  [
    body("scene", "no scene number").trim().isNumeric().not().isEmpty(),
    body("cut", "no cut number").trim().isNumeric().not().isEmpty(),
    // .custom(async (value, { req }) => {
    //   const storyboard = await Storyboard.findOne({
    //     project: req.params.projectId,
    //     scene: req.body.scene,
    //     cut: value,
    //   });
    //   if (storyboard) {
    //     return Promise.reject(
    //       `${req.body.scene}-${value} storyboard already exists`
    //     );
    //   }

    //   return true; // 이메일이 유효하고 중복되지 않는 경우 true 반환
    // }),
  ],
  storyboardController.createStoryboard
);

// router.put("/uploads", [], storyboardController.upload);
// router.get("/files", [], storyboardController.getListFiles);
// router.get("/files/:name", [], storyboardController.download);
// router.delete("/files/:name", storyboardController.deleteFile);

router.get("/:storyboardId", storyboardController.getStoryboard);
router.delete("/", storyboardController.deleteStoryboard);

router.patch(
  "/:storyboardId",
  [
    body("scene", "no scene number").trim().isNumeric().not().isEmpty(),
    body("cut", "no cut number").trim().isNumeric().not().isEmpty(),
    // .custom(async (value, { req }) => {
    //   const storyboard = await Storyboard.findById(req.params.storyboardId);
    //   if (value !== storyboard.cut.toString()) {
    //     const sameStoryboard = await Storyboard.findOne({
    //       project: req.params.projectId,
    //       scene: req.body.scene,
    //       cut: value,
    //     });
    //     if (sameStoryboard) {
    //       return Promise.reject(
    //         `${req.body.scene}-${value} storyboard already exists`
    //       );
    //     }
    //   }
    //   return true;
    // }),
  ],
  storyboardController.updateStoryboard
);

//router.use("/:callsheetId/files");

module.exports = router;
