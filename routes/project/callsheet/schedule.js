const express = require("express");
const { check, body } = require("express-validator");

const Schedule = require("../../../modules/project/callsheet/schedule");
const Callsheet = require("../../../modules/project/callsheet");
const Storyboard = require("../../../modules/project/storyboard");

const scheduleController = require("../../../controllers/project/callsheet/schedule");

const router = express.Router({ mergeParams: true });

router.get("/", scheduleController.getSchedules);

router.put(
  "/",
  [
    body("schedules")
      .isArray()
      .not()
      .isEmpty()
      .custom(async (schedules, { req }) => {
        for (const schedule of schedules) {
          if (schedule.order === null || schedule.order === "") {
            return Promise.reject("no order");
          }

          if (schedule.type === null || schedule.type === "") {
            return Promise.reject("no type");
          }
        }
      }),
  ],
  scheduleController.createSchedule
);

router.patch(
  "/",
  [
    body("schedules")
      .isArray()
      .not()
      .isEmpty()
      .custom(async (schedules, { req }) => {
        for (const schedule of schedules) {
          if (schedule.order === null || schedule.order === "") {
            return Promise.reject("no order");
          }

          if (schedule.type === null || schedule.type === "") {
            return Promise.reject("no type");
          }
          const oldSchedule = await Schedule.findById(schedule._id);
          if (!oldSchedule) {
            return Promise.reject("no schedule to update");
          }

          if (schedule.time) {
            const valSchedule = await Schedule.findOne({
              callsheet: req.params.callsheetId,
              time: schedule.time,
            });
            if (valSchedule) {
              if (schedule._id.toString() !== valSchedule._id.toString()) {
                return Promise.reject(
                  `schedule at ${valSchedule.time} already exists`
                );
              }
            }
          }

          if (schedule.scene && schedule.cut) {
            const sameSchedule = await Schedule.findOne({
              callsheet: req.params.callsheetId,
              scene: schedule.scene,
              cut: schedule.cut,
            });
            // if (oldSchedule.scene !== null && oldSchedule.cut !== null) {
            if (
              oldSchedule.scene !== schedule.scene ||
              oldSchedule.cut !== schedule.cut
            ) {
              if (sameSchedule) {
                return Promise.reject(
                  `schedule of ${schedule.scene}-${schedule.cut} already exists`
                );
              }
            }
            // }
            // if (sameSchedule) {
            //   return Promise.reject(
            //     `schedule of ${schedule.scene}-${schedule.cut} already exists`
            //   );
            // }
          }
        }
      }),
  ],
  scheduleController.updateSchedule
);

router.delete("/", scheduleController.deleteSchedule);

router.put(
  "/:scheduleId/checkStoryboard",
  [
    body("scheduleInfos")
      .isArray()
      .not()
      .isEmpty()
      .custom(async (schedules, { req }) => {
        for (const schedule of schedules) {
          if (schedule._id === req.params.scheduleId) {
            if (!schedule.scene || !schedule.cut) {
              return Promise.reject(
                "write down the scene and the cut you want to find......"
              );
            }
          }

          if (schedule.scene && schedule.cut) {
            const storyboard = await Storyboard.findOne({
              project: req.params.projectId,
              scene: schedule.scene,
              cut: schedule.cut,
            });

            if (!storyboard) {
              return Promise.reject(
                `no story board of ${schedule.scene}-${schedule.cut}`
              );
            }
          }
        }
      }),
  ],
  scheduleController.putCheckStoryboard
);

module.exports = router;
