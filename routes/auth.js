const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../modules/user");

const router = express.Router();

router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("email already exists");
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "password at least 5 characters of only nums and alphabets"
    )
      .trim()
      .isLength({ min: 5 })
      .isAlphanumeric(),
    body("name").trim().not().isEmpty(),
    body("phone").trim().not().isEmpty(),
    body("company_name", "company name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
  ],
  authController.signup
);

router.post(
  "/login",
  [
    check("email").isEmail().withMessage("Please enter a valid email"),
    body(
      "password",
      "password at least 5 characters of only nums and alphabets"
    )
      .isLength({ min: 5 })
      .isAlphanumeric(),
  ],
  authController.login
);

router.post(
  "/reset_pw",
  [check("email").isEmail().withMessage("Please enter a valid email")],
  authController.reset_pw
);

router.patch(
  "/new_pw",
  [
    body(
      "password",
      "password at least 5 characters of only nums and alphabets"
    )
      .isLength({ min: 5 })
      .isAlphanumeric(),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords have to match!");
      }
      return true;
    }),
  ],
  authController.new_pw
);

module.exports = router;
