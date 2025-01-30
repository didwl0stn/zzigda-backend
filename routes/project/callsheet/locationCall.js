const express = require("express");
const { check, body } = require("express-validator");

const locationCallController = require("../../../controllers/project/callsheet/locationCall");

const router = express.Router({ mergeParams: true });

router.get("/", locationCallController.getLocationCalls);

router.put("/", locationCallController.createLocationCall);

//router.get("/:locationCallId", locationCallController.getSchedule);

router.patch("/", locationCallController.updateLocationCall);

router.delete("/", locationCallController.deleteLocationCall);

module.exports = router;
