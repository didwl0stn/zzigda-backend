const express = require("express");
const { check, body } = require("express-validator");

const checkListController = require("../../../controllers/project/callsheet/checkList");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", checkListController.getCheckLists);

router.put("/", checkListController.createCheckList);

router.get("/:checkListId", checkListController.getCheckList);

router.patch("/", checkListController.updateCheckList);

router.delete("/", checkListController.deleteCheckList);

module.exports = router;
