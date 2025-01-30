const express = require("express");
const { check, body } = require("express-validator");

const projectController = require("../controllers/project");
const isAuth = require("../middleware/isAuth");
const authority = require("../middleware/project/authority");

const callsheetRoutes = require("./project/callsheet");
const staffListRoutes = require("./project/staffList");
const castListRoutes = require("./project/castList");
const locationRoutes = require("./project/location");
const storyboardRoutes = require("./project/storyboard");
const dailyScriptRoutes = require("./project/dailyScript");
const memberRoutes = require("./project/member");
const filesRoutes = require("./project/files");

const router = express.Router();

router.get("/all", isAuth, projectController.get_Projects);

router.put(
  "/create",
  [
    body("name", "project name at least 1 character")
      .trim()
      .isLength({ min: 1 }),
  ],
  isAuth,
  projectController.create_project
);

router.delete(
  "/:projectId",
  isAuth,
  authority,
  projectController.delete_project
);

router.patch(
  "/:projectId",
  [
    body("name", "project name at least 1 character")
      .trim()
      .isLength({ min: 1 }),
  ],
  isAuth,
  authority,
  projectController.update_project
);

router.get("/:projectId", isAuth, authority, projectController.get_Project);

// 하위 라우트 사용위한 use
router.use("/:projectId/callsheet", isAuth, authority, callsheetRoutes);

router.use("/:projectId/staffList", isAuth, authority, staffListRoutes);

router.use("/:projectId/castList", isAuth, authority, castListRoutes);

router.use("/:projectId/location", isAuth, authority, locationRoutes);

router.use("/:projectId/storyboard", isAuth, authority, storyboardRoutes);

router.use("/:projectId/dailyScript", isAuth, authority, dailyScriptRoutes);

router.use("/:projectId/member", isAuth, authority, memberRoutes);

router.use("/:projectId/files", isAuth, authority, filesRoutes);

module.exports = router;
