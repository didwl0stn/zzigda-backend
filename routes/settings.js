const express = require("express");
const { check, body } = require("express-validator");

const settingsController = require("../controllers/settings");
const isAuth = require("../middleware/isAuth");
const User = require("../modules/user");
const { route } = require("./auth");

const router = express.Router();

router.get("/editUser", isAuth, settingsController.getEditUser);

router.patch(
  "/editUser/:userId",
  isAuth,
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom(async (value, { req }) => {
        const user = await User.findById(req.userId);
        if (value !== user.email) {
          const userDoc = await User.findOne({ email: value });
          if (userDoc) {
            return Promise.reject("Email already exists");
          }
        }
        return true; // 이메일이 유효하고 중복되지 않는 경우 true 반환
      })
      .normalizeEmail(),
    body("name", "no name").trim().not().isEmpty(),
    body("phone", "no phone").not().isEmpty(),
  ],

  settingsController.patchEditUser
);

module.exports = router;
