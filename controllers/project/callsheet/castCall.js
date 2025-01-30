const { validationResult } = require("express-validator");
const fs = require("fs");

const Project = require("../../../modules/project");
const Callsheet = require("../../../modules/project/callsheet");

const fileEdit = require("../../../util/file");
const CastCall = require("../../../modules/project/callsheet/castCall");
const CastList = require("../../../modules/project/castList");

exports.getCastCalls = (req, res, next) => {
  const callsheetId = req.params.callsheetId;
  let totalItems; // 프론트에서 pagination논리에 필요한 총 데이터 수

  CastCall.find({ callsheet: callsheetId })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return CastCall.find({ callsheet: callsheetId })
        .populate("cast", "name role call onSet")
        .sort({ order: 1 });
    })
    .then((castCalls) => {
      console.log(castCalls);
      if (castCalls.length >= 0) {
        res.status(200).json({
          castCalls: castCalls,
          totalItems: totalItems,
          authority: req.aCode,
        });
      }
      const error = new Error("No castCall could be found");
      error.statusCode = 404;
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getCastCall = (req, res, next) => {
  const userId = req.userId;
  const castcallId = req.params.castcallId;

  CastCall.findById(castcallId)
    .then((castCall) => {
      if (!castCall) {
        const error = new Error("No castCall could be found");
        error.statusCode = 404;
      }
      res.status(200).json({ castCall: castCall, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createCastCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const castListIds = req.body.castListIds;

    const callsheetId = req.params.callsheetId;

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    let castCallCounts = await CastCall.find({
      callsheet: callsheetId,
    }).countDocuments();

    const castReady = castListIds.map((cast) => {
      const castCall = new CastCall({
        order: castCallCounts++,
        num: castCallCounts,
        cast: cast,
        callsheet: callsheetId,
      });
      return castCall;
    });

    await CastCall.insertMany(castReady);

    const castCalls = await CastCall.find({
      callsheet: callsheetId,
      cast: { $in: castListIds },
    })
      .populate("cast", "name role")
      .sort({ order: 1 });

    await CastList.updateMany(
      { _id: { $in: castListIds } }, // 업데이트 대상을 찾기 위한 필터
      { $push: { callsheet: callsheetId } } // callsheet 배열에 callsheet 추가
    );

    res.status(201).json({
      message: "castCalls created!",
      castCalls: castCalls,
      authority: aCode,
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateCastCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    const callsheetId = req.params.callsheetId;
    const newCastCalls = req.body.castCalls;

    if (!Array.isArray(newCastCalls) && newCastCalls.length === 0) {
      const error = new Error("no newCastCalls to insert");
      error.statusCode = 403;
      throw error;
    }
    const updatedCastCalls = [];

    for (const newCastCall of newCastCalls) {
      const order = newCastCall.order;
      const num = newCastCall.num;
      const call = newCastCall.call;
      const onSet = newCastCall.onSet;

      const updatedCastCall = await CastCall.findByIdAndUpdate(
        newCastCall._id,
        { $set: { order: order, num: num, call: call, onSet: onSet } },
        { new: true }
      );

      updatedCastCalls.push(updatedCastCall);
    }

    updatedCastCalls.sort((a, b) => {
      return a.order - b.order;
    });

    res.status(201).json({
      message: "castCall updated",
      updatedCastCalls: updatedCastCalls,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteCastCall = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    return next(error);
  }
  const castCallIds = req.body.castCallIds;
  const callsheetId = req.params.callsheetId;

  let castListIds = [];

  if (!Array.isArray(castCallIds) && castCallIds.length === 0) {
    const error = new Error("no castCallIds to delete");
    error.statusCode = 403;
    return next(error);
  }

  CastCall.find({ _id: { $in: castCallIds } })
    .then((castCalls) => {
      if (!castCalls) {
        const error = new Error("Could not find castCalls");
        error.statusCode = 404;
        return next(error);
      }

      castListIds = castCalls.map((i) => {
        return (i = i.cast);
      });
      return CastCall.deleteMany({ _id: { $in: castCallIds } });
    })
    .then((result) => {
      return CastList.updateMany(
        { _id: { $in: castListIds } },
        { $pull: { callsheet: callsheetId } }
      );
    })
    .then((result) => {
      return CastCall.find({
        callsheet: { $elemMatch: { $eq: callsheetId } },
      }).sort({ order: 1 });
    })
    .then((result) => {
      res.status(200).json({ message: "deleting castCall complete" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
