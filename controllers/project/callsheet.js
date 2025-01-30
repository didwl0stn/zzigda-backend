const { validationResult } = require("express-validator");
const fs = require("fs");

const Project = require("../../modules/project");
const Callsheet = require("../../modules/project/callsheet");
const DailyScript = require("../../modules/project/dailyScript");
const Script = require("../../modules/project/dailyScript/script");
const Tssn = require("../../modules/project/dailyScript/tssn");

const fileEdit = require("../../util/file");

exports.getCallsheets = (req, res, next) => {
  const projectId = req.params.projectId;
  let totalItems; // 프론트에서 pagination논리에 필요한 총 데이터 수

  Callsheet.find({ project: projectId })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Callsheet.find({ project: projectId });
    })
    .then((callsheets) => {
      console.log(callsheets);
      if (callsheets.length >= 0) {
        res.status(200).json({
          callsheets: callsheets,
          totalItems: totalItems,
          authority: req.aCode,
        });
      }
      const error = new Error("No callsheets could be found");
      //error.statusCode = 404;
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getCallsheet = (req, res, next) => {
  const userId = req.userId;
  const callsheetId = req.params.callsheetId;

  Callsheet.findById(callsheetId)
    .then((callsheet) => {
      if (!callsheet) {
        const error = new Error("No callsheet could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ callsheet: callsheet, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createCallsheet = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  const name = req.body.name;
  const date = req.body.date;
  const crewCall = req.body.crewCall;
  const projectId = req.params.projectId;

  const project = await Project.findById(projectId);
  const companyId = project.company;
  const callsheet = new Callsheet({
    name: name,
    company: companyId,
    date: date,
    crewCall: crewCall,
    project: project,
  });
  callsheet
    .save()
    .then((callsheet) => {
      DailyScript.find({ date: callsheet.date })
        .then((dailyScripts) => {
          if (dailyScripts.length > 0) {
            const dailyScriptIds = dailyScripts.map((i) => {
              return (i = i._id);
            });
            DailyScript.deleteMany({ _id: { $in: dailyScriptIds } }).then(
              (result) =>
                Script.find({ dailyScript: { $in: dailyScriptIds } }).then(
                  (scripts) => {
                    if (scripts.length > 0) {
                      Script.deleteMany({
                        dailyScript: { $in: dailyScriptIds },
                      }).then((result) => {
                        Tssn.deleteMany({ script: { $in: scripts } });
                      });
                    }
                  }
                )
            );
          }

          const dailyScript = new DailyScript({
            date: callsheet.date,
            callsheet: callsheet._id,
            project: projectId,
          });

          dailyScript.save();
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
      // 회사는 userId로 찾아 넣기
      res.status(201).json({
        message: "Callsheet Created!",
        callsheetId: callsheet,
        authority: aCode,
      });
    })
    .catch((err) => {
      console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateCallsheet = async (req, res, next) => {
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

    // meta data
    const callsheetId = req.params.callsheetId;

    const name = req.body.name;
    const date = req.body.date;
    const crewCall = req.body.crewCall;
    const start = req.body.start;
    const place = req.body.palce;
    const head = req.body.head;

    if (date) {
      await DailyScript.findOneAndUpdate(
        { callsheet: callsheetId },
        { $set: { date: date } }
      );
    }

    const updatedCallsheet = await Callsheet.findByIdAndUpdate(
      callsheetId,
      {
        name: name,
        date: date,
        crewCall: crewCall,
        start: start,
        place: place,
        head: head,
      },
      { new: true }
    );

    res.status(201).json({
      message: "Callsheet updated!",
      updatedCallsheet: updatedCallsheet,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteCallsheet = (req, res, next) => {
  const callsheetId = req.params.callsheetId;
  const projectId = req.params.projectId;

  if (!callsheetId) {
    const error = new Error("No callsheetId!");
    //error.statusCode = 401;
    return next(error);
  }

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  Callsheet.findById(callsheetId)
    .then((callsheet) => {
      if (!callsheet) {
        const error = new Error("Could not find callsheet");
        //error.statusCode = 404;
        next(error);
      }
      return Callsheet.findByIdAndDelete(callsheetId);
    })
    .then((result) => {
      DailyScript.findOne({ callsheet: callsheetId }).then((dailyScript) => {
        DailyScript.findByIdAndDelete(dailyScript._id).then((result) =>
          Script.find({ dailyScript: dailyScript }).then((scripts) => {
            Script.deleteMany({ dailyScript: dailyScript }).then((result) => {
              Tssn.deleteMany({ script: { $in: scripts } });
            });
          })
        );
      });
      res
        .status(200)
        .json({ message: "deleting callsheet complete", authority: aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
