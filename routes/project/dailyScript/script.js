const express = require("express");
const { check, body } = require("express-validator");

const scriptController = require("../../../controllers/project/dailyScript/script");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", scriptController.getScripts);

// 혹시 몰라서
router.get("/:scriptId", scriptController.getScript);

router.put("/:scriptId", scriptController.createTssn);

router.patch("/:scriptId", scriptController.updateTssn);

module.exports = router;
