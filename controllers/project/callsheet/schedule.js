const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../../util/file");
const Schedule = require("../../../modules/project/callsheet/schedule");
const Location = require("../../../modules/project/location");
const LocationCall = require("../../../modules/project/callsheet/locationCall");
const DailyScript = require("../../../modules/project/dailyScript");
const Script = require("../../../modules/project/dailyScript/script");
const Tssn = require("../../../modules/project/dailyScript/tssn");
const Storyboard = require("../../../modules/project/storyboard");
const Callsheet = require("../../../modules/project/callsheet");

exports.getSchedules = (req, res, next) => {
  const callsheetId = req.params.callsheetId;
  let totalItems;

  Schedule.find({ callsheet: callsheetId })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Schedule.find({ callsheet: callsheetId }).sort({ order: 1 });
    })
    .then((schedules) => {
      console.log(schedules);
      if (schedules.length > 0) {
        res.status(200).json({
          schedules: schedules,
          totalItems: totalItems,
          authority: req.aCode,
        });
      }
      const error = new Error("No schedules could be found");
      //error.statusCode = 404;
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getSchedule = (req, res, next) => {
  const userId = req.userId;
  const scheduleId = req.params.scheduleId;

  Schedule.findById(scheduleId)
    .then((schedule) => {
      if (!schedule) {
        const error = new Error("No schedule could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ schedule: schedule, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.putCheckStoryboard = async (req, res, next) => {
  try {
    const scheduleId = req.params.scheduleId;
    let scheduleInfos = req.body.scheduleInfos;

    const clickedSceneCut = await Schedule.findById(scheduleId, {
      scene: 1,
      cut: 1,
    });

    const storyboards = [];

    for (const schedule of scheduleInfos) {
      if (schedule.scene && schedule.cut) {
        storyboards.push(
          await Storyboard.findOne({
            project: req.params.projectId,
            scene: schedule.scene,
            cut: schedule.cut,
          })
        );
      }
    }

    res.status(200).json({
      storyboards: storyboards,
      clickedSceneCut: clickedSceneCut,
      authority: req.aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const schedules = req.body.schedules;
    const callsheetId = req.params.callsheetId;
    const projectId = req.params.projectId;

    for (let schedule of schedules) {
      const newSchedule = new Schedule({
        order: schedule.order,
        type: schedule.type,
        time: schedule.time,
        scene: schedule.scene,
        cut: schedule.cut,
        description: schedule.description,
        character: schedule.character,
        props: schedule.props,
        location: schedule.location,
        note: schedule.note,
        callsheet: callsheetId,
      });

      await newSchedule.save();
    }
    const newSchedules = await Schedule.find({ callsheet: callsheetId }).sort({
      order: 1,
    });

    res.status(201).json({
      message: "schedule created",
      schedules: newSchedules,
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const schedules = req.body.schedules;
    const callsheetId = req.params.callsheetId;
    const projectId = req.params.projectId;

    for (const schedule of schedules) {
      if (schedule.autoLoca) {
        if (!schedule.scene) {
          const error = new Error(
            "need scene to automatically fill location field"
          );
          //error.statusCode = 403;
          throw error;
        }

        const location = await Location.findOne({
          project: projectId,
          scene: schedule.scene,
        });

        if (!location) {
          const error = new Error("no location to add");
          //error.statusCode = 403;
          throw error;
        }
      }
    }

    const updatedSchedules = [];
    for (const schedule of schedules) {
      const oldSchedule = await Schedule.findById(schedule._id);
      oldSchedule.order = schedule.order;
      oldSchedule.time = schedule.time;
      oldSchedule.scene = schedule.scene;
      oldSchedule.cut = schedule.cut;
      oldSchedule.description = schedule.description;
      oldSchedule.character = schedule.character;
      oldSchedule.props = schedule.props;
      oldSchedule.location = schedule.location;
      oldSchedule.note = schedule.note;

      if (schedule.autoLoca) {
        const location = await Location.findOne({
          project: projectId,
          scene: schedule.scene,
        });

        oldSchedule.location = location.name;

        const counts = await LocationCall.find({
          callsheet: callsheetId,
        }).countDocuments();
        const locationCall = new LocationCall({
          order: counts,
          location: location,
          callsheet: callsheetId,
        });
        await locationCall.save();

        console.log(
          "this is callsheets of locationList : ",
          location.callsheet
        );

        const callsheet = location.callsheet.find(
          (i) => i._id.toString() === callsheetId
        );
        if (!callsheet) {
          location.callsheet.push(callsheetId);
        }
        await location.save();
      }

      if (schedule.type === "Shooting" && schedule.scene && schedule.cut) {
        const oldSchedule = await Schedule.findById(schedule._id);

        if (
          oldSchedule.scene !== schedule.scene ||
          oldSchedule.cut !== schedule.cut
        ) {
          const oldScript = await Script.findOne({
            callSchedule: schedule._id,
          });

          if (!oldScript) {
            const dailyScript = await DailyScript.findOne({
              callsheet: callsheetId,
            });
            const script = new Script({
              scene: schedule.scene,
              cut: schedule.cut,
              callSchedule: schedule._id,
              dailyScript: dailyScript,
              project: projectId,
            });
            const savedScript = await script.save();

            const tssn = new Tssn({ take: 1, script: savedScript });
            await tssn.save();
            await Script.findByIdAndUpdate(savedScript._id, {
              $push: { tssn: tssn },
            });
          }
          await Script.findOneAndUpdate(
            { callSchedule: schedule._id },
            { scene: schedule.scene, cut: schedule.cut },
            { new: true }
          );
        }
      }

      const updateSchedule = await oldSchedule.save();
      updatedSchedules.push(updateSchedule);
    }

    updatedSchedules.sort((a, b) => a.order - b.order);

    res.status(201).json({
      message: "schedules updated",
      updatedSchedules: updatedSchedules,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const callsheetId = req.params.callsheetId;
    const scheduleIds = req.body.scheduleIds;

    if (!Array.isArray(scheduleIds) && scheduleIds.length === 0) {
      const error = new Error("no scheduleIds to delete");
      //error.statusCode = 403;
      throw error;
    }

    for (const scheduleId of scheduleIds) {
      const script = await Script.findOne({ callSchedule: scheduleId });
      if (script) {
        Tssn.deleteMany({ script: script._id });

        Script.findByIdAndDelete(script);
      }

      await Schedule.findByIdAndDelete(scheduleId);
    }

    const schedules = await Schedule.find({ callsheet: callsheetId }).sort({
      order: 1,
    });

    res.status(201).json({
      message: "schedules deleted",
      schedules: schedules,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
