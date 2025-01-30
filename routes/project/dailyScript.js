const express = require("express");
const { check, body } = require("express-validator");

const dailyScriptController = require("../../controllers/project/dailyScript");
const scriptRoutes = require("./dailyScript/script");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", dailyScriptController.getDailyScripts);

// 혹시 몰라서
router.get("/:dailyScriptId", dailyScriptController.getDailyScript);

router.use("/:dailyScriptId/script", scriptRoutes);

module.exports = router;
