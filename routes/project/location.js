const express = require("express");
const { check, body } = require("express-validator");

const Location = require("../../modules/project/location");

const locationController = require("../../controllers/project/location");
//const isAuth = require("../middleware/isAuth");
// 다른 인증 체계가 필요하다면 고려

const router = express.Router({ mergeParams: true });

router.get("/", locationController.getLocations);

router.get("/:locationId", locationController.getLocation);

router.put(
  "/",
  [
    body("name", "castList name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("address", "address is required").not().isEmpty(),
    body("scene")
      .trim()
      .isNumeric()
      .custom(async (value, { req }) => {
        const location = await Location.findOne({
          project: req.params.projectId,
          scene: value,
        });
        if (location) {
          return Promise.reject("scene already exists");
        }

        return true;
      }),
  ],
  locationController.createLocation
);

router.delete("/", locationController.deleteLocation);

router.patch(
  "/:locationId",
  [
    body("name", "castList name at least 1 character")
      .trim()
      .isLength({ min: 1 })
      .not()
      .isEmpty(),
    body("address", "address is required").not().isEmpty(),
    body("scene")
      .trim()
      .isNumeric()
      .custom(async (value, { req }) => {
        const location = await Location.findById(req.params.locationId);
        if (value !== location.scene.toString()) {
          const location = await Location.findOne({
            project: req.params.projectId,
            scene: value,
          });
          if (location) {
            return Promise.reject("scene number already exists");
          }
        }
        return true;
      }),
  ],
  locationController.updateLocation
);

//router.use("/:callsheetId/files");

module.exports = router;
