const { validationResult } = require("express-validator");
const fs = require("fs");

const Script = require("../../../modules/project/dailyScript/script");
const Tssn = require("../../../modules/project/dailyScript/tssn");
const Schedule = require("../../../modules/project/callsheet/schedule");

exports.getScripts = (req, res, next) => {
  const projectId = req.params.projectId;
  const dailyScriptId = req.params.dailyScriptId;

  Script.find({ dailyScript: dailyScriptId })
    .populate("tssn", "take status soundNum note")
    .then((scripts) => {
      if (scripts.length >= 0) {
        const totalItems = scripts.length;

        for (let script of scripts) {
          script.tssn.sort((a, b) => a.take - b.take);
        }
        res.status(200).json({
          scripts: scripts,
          totalItems: totalItems,
          authority: req.aCode,
        });
      } else {
        const error = new Error("No scripts could be found");
        // error.statusCode = 404;
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

exports.getScript = (req, res, next) => {
  const userId = req.userId;
  const scriptId = req.params.scriptId;

  Script.findById(scriptId)
    .then((script) => {
      if (!script) {
        const error = new Error("No script could be found");
        // error.statusCode = 404;
      }
      res.status(200).json({ script: script, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createTssn = async (req, res, next) => {
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
    const userId = req.userId;
    const scriptId = req.params.scriptId;
    const take = req.body.take;
    const dailyScriptId = req.params.dailyScriptId;

    const tssn = new Tssn({
      take: take,
      script: scriptId,
    });
    const newTssn = await tssn.save();

    await Script.findByIdAndUpdate(scriptId, {
      $push: { tssn: newTssn },
    });

    let scripts = await Script.find({
      dailyScript: req.params.dailyScriptId,
    }).populate("tssn", "take status soundNum note");

    for (let script of scripts) {
      script.tssn.sort((a, b) => a.take - b.take);
    }

    res.status(200).json({ scripts: scripts, authority: req.aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateTssn = async (req, res, next) => {
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
    const userId = req.userId;
    const scriptId = req.params.scriptId;

    const newTssns = req.body.tssns;

    for (const newTssn of newTssns) {
      const oldTssn = await Tssn.findById(newTssn._id);

      if (!oldTssn) {
        const error = new Error("no tssn to update");
        //error.statusCode = 403;
        throw error;
      }
      oldTssn.take = newTssn.take;
      oldTssn.status = newTssn.status;
      oldTssn.soundNum = newTssn.soundNum;
      oldTssn.note = newTssn.note;

      await oldTssn.save();
    }

    let scripts = await Script.find({
      dailyScript: req.params.dailyScriptId,
    }).populate("tssn", "take status soundNum note");

    for (let script of scripts) {
      script.tssn.sort((a, b) => a.take - b.take);
    }

    res.status(200).json({ scripts: scripts, authority: req.aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
