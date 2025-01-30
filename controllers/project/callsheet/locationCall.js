const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../../util/file");
const Location = require("../../../modules/project/location");
const LocationCall = require("../../../modules/project/callsheet/locationCall");
const locationCall = require("../../../modules/project/callsheet/locationCall");

exports.getLocationCalls = (req, res, next) => {
  const callsheetId = req.params.callsheetId;

  LocationCall.find({ callsheet: callsheetId })
    .populate("location", "name address phone")
    .sort({ order: 1 })
    .then((locationCalls) => {
      if (locationCalls.length >= 0) {
        const totalItems = locationCalls.length;
        res.status(200).json({
          locationCalls: locationCalls,
          totalItems: totalItems,
          authority: req.aCode,
        });
      } else {
        const error = new Error("No locations could be found");
        error.statusCode = 404;
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

exports.getLocationCall = (req, res, next) => {};

exports.createLocationCall = async (req, res, next) => {
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

    const locationIds = req.body.locationIds;
    const callsheetId = req.params.callsheetId;

    let locationCallCounts = await LocationCall.find({
      callsheet: callsheetId,
    }).countDocuments();

    for (const locationId of locationIds) {
      const locationCall = new LocationCall({
        order: locationCallCounts++,
        location: locationId,
        callsheet: callsheetId,
      });

      await locationCall.save();
      Location.findByIdAndUpdate(locationId, {
        $push: { callsheet: callsheetId },
      });
    }

    const savedLocationCalls = await LocationCall.find({
      location: { $in: locationIds },
    })
      .populate("location", "name address phone")
      .sort({ order: 1 });

    res.status(201).json({
      message: "location created!",
      savedLocationCalls: savedLocationCalls,
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

exports.updateLocationCall = async (req, res, next) => {
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

    const locationCalls = req.body.locationCalls;
    const callsheetId = req.params.callsheetId;

    for (const locationCall of locationCalls) {
      await LocationCall.findByIdAndUpdate(locationCall._id, {
        order: locationCall.order,
        note: locationCall.note,
      });
    }

    const updatedLocationCalls = await LocationCall.find({
      callsheet: callsheetId,
    }).sort({ order: 1 });

    res.status(201).json({
      message: "locationCalls updated",
      updatedLocationCalls: updatedLocationCalls,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteLocationCall = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    throw error;
  }

  const locationCallIds = req.body.locationCallIds;
  const callsheetId = req.params.callsheetId;

  let locationIds = [];

  LocationCall.find({ _id: { $in: locationCallIds } })
    .then((locationCalls) => {
      if (locationCalls.length === 0) {
        const error = new Error("Could not find locationCalls to delete");
        error.statusCode = 404;
        return next(error);
      }

      locationIds = locationCalls.map((i) => {
        return (i = i.location);
      });
      return LocationCall.deleteMany({ _id: { $in: locationCallIds } });
    })
    .then((result) => {
      return Location.updateMany(
        { _id: { $in: locationIds } },
        { $pull: { callsheet: callsheetId } }
      );
    })
    .then((result) => {
      return LocationCall.find({ callsheet: callsheetId }).sort({ order: 1 });
    })
    .then((locationCalls) => {
      res.status(200).json({
        message: "deleting locationCalls complete",
        locationCalls: locationCalls,
        authority: aCode,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
