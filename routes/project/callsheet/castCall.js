const express = require("express");
const { check, body } = require("express-validator");

const castCallController = require("../../../controllers/project/callsheet/castCall");

const router = express.Router({ mergeParams: true });

router.get("/", castCallController.getCastCalls);

router.put("/", castCallController.createCastCall);

router.get("/:castCallId", castCallController.getCastCall);

router.patch("/", castCallController.updateCastCall);

router.delete("/", castCallController.deleteCastCall);

module.exports = router;
