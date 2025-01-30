const express = require("express");
const { check, body } = require("express-validator");

const weatherController = require("../../../controllers/project/callsheet/weather");

const router = express.Router({ mergeParams: true });

router.get("/", weatherController.getWeathers);

router.put("/", weatherController.createWeather);

router.get("/:weatherId", weatherController.getWeather);

router.patch("/:weatherId", weatherController.updateWeather);

router.delete("/:weatherId", weatherController.deleteWeather);

module.exports = router;
