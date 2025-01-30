const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../util/file");
const StaffList = require("../../modules/project/staffList");
const CastList = require("../../modules/project/castList");
const CastCall = require("../../modules/project/callsheet/castCall");

exports.getCastLists = (req, res, next) => {
  const projectId = req.params.projectId;

  CastList.find({ project: projectId })
    .then((castLists) => {
      if (castLists.length >= 0) {
        return CastList.countDocuments({ project: projectId }).then(
          (totalItems) => {
            res.status(200).json({
              castLists: castLists,
              totalItems: totalItems,
              authority: req.aCode,
            });
          }
        );
      } else {
        const error = new Error("No castLists could be found");
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

exports.getAddCastList = (req, res, next) => {
  const callsheetId = req.params.callsheetId;
  const projectId = req.params.projectId;
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  CastList.find({
    project: projectId,
    callsheet: { $not: { $elemMatch: { $eq: callsheetId } } },
  })
    .then((castLists) => {
      if (castLists.length >= 0) {
        return CastList.find({
          project: projectId,
          callsheet: { $not: { $elemMatch: { $eq: callsheetId } } },
        }).then((totalItems) => {
          res.status(200).json({
            castLists: castLists,
            totalItems: totalItems,
            authority: req.aCode,
          });
        });
      } else {
        const error = new Error("No castLists could be found");
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

exports.getCastList = (req, res, next) => {
  const userId = req.userId;
  const castListId = req.params.castListId;

  CastList.findById(castListId)
    .then((castList) => {
      if (!castList) {
        const error = new Error("No castList could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ castList: castList, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createCastList = (req, res, next) => {
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
  const role = req.body.role;
  const email = req.body.email;
  const phone = req.body.phone;
  const note = req.body.note;
  const projectId = req.params.projectId;

  const castList = new CastList({
    role: role,
    name: name,
    email: email,
    phone: phone,
    note: note,
    project: projectId,
  });

  castList
    .save()
    .then((castList) => {
      res.status(201).json({
        message: "castList created!",
        castList: castList,
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

exports.updateCastList = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const castListId = req.params.castListId;
  const name = req.body.name;
  const role = req.body.role;
  const email = req.body.email;
  const phone = req.body.phone;
  const note = req.body.note;

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  CastList.findByIdAndUpdate(
    castListId,
    {
      $set: { name: name, role: role, email: email, phone: phone, note: note },
    },
    { new: true }
  )
    .then((updatedCastList) => {
      res.status(201).json({
        message: "castList updated",
        updatedCastList: updatedCastList,
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

exports.deleteCastList = (req, res, next) => {
  const castListIds = req.body.castListIds;

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  CastList.find({ _id: { $in: castListIds } })
    .then((castLists) => {
      if (castLists.length === 0) {
        const error = new Error("Could not find castList");
        //error.statusCode = 404;
        return next(error);
      }
      return CastList.deleteMany({ _id: { $in: castListIds } });
    })
    .then((result) => {
      return CastCall.deleteMany({ cast: { $in: castListIds } });
    })
    .then((result) => {
      return CastList.find({ project: req.params.projectId });
    })
    .then((castLists) => {
      res.status(200).json({
        message: "deleting castLists complete",
        castLists: castLists,
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
