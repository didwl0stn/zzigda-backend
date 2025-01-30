const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../util/file");
const DailyScript = require("../../modules/project/dailyScript");

exports.getDailyScripts = (req, res, next) => {
  const projectId = req.params.projectId;

  DailyScript.find({ project: projectId })
    .then((dailyScripts) => {
      if (dailyScripts.length >= 0) {
        const totalItems = dailyScripts.length;
        res.status(200).json({
          dailyScripts: dailyScripts,
          totalItems: totalItems,
          authority: req.aCode,
        });
      } else {
        const error = new Error("No dailyScripts could be found");
        //error.statusCode = 404;
        next(error);
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getDailyScript = (req, res, next) => {
  const userId = req.userId;
  const dailyScriptId = req.params.dailyScriptId;

  DailyScript.findById(dailyScriptId)
    .then((dailyScript) => {
      if (!dailyScript) {
        const error = new Error("No dailyScript could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ dailyScript: dailyScript, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
