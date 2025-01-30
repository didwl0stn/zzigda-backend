const express = require("express");
const { check, body } = require("express-validator");

const staffCallController = require("../../../controllers/project/callsheet/staffCall");

const router = express.Router({ mergeParams: true });

router.get("/", staffCallController.getStaffCalls);

router.put("/", staffCallController.createStaffCall);

router.get("/:staffCallId", staffCallController.getStaffCall);

router.patch("/", staffCallController.updateStaffCall);

router.delete("/", staffCallController.deleteStaffCall);

module.exports = router;
