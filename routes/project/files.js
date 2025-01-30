const express = require("express");

const filesController = require("../../controllers/project/files");

const router = express.Router({ mergeParams: true });

router.get("/", filesController.getProjectFiles);

router.put("/download", filesController.downloadProjectFile);

router.put("/", filesController.createProjectFiles);

router.delete("/", filesController.deleteProjectFiles);

module.exports = router;
