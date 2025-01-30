const { validationResult } = require("express-validator");
const fs = require("fs");

const User = require("../../modules/user");
const Project = require("../../modules/project");

const fileEdit = require("../../util/file");
const StaffList = require("../../modules/project/staffList");
const StaffCall = require("../../modules/project/callsheet/staffCall");

exports.getStaffLists = (req, res, next) => {
  const projectId = req.params.projectId;

  StaffList.find({ project: projectId })
    .then((staffLists) => {
      if (staffLists.length >= 0) {
        return StaffList.countDocuments({ project: projectId }).then(
          (totalItems) => {
            res.status(200).json({
              staffLists: staffLists,
              totalItems: totalItems,
              authority: req.aCode,
            });
          }
        );
      } else {
        const error = new Error("No staffList could be found");
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

exports.getStaffList = (req, res, next) => {
  const userId = req.userId;
  const staffListId = req.params.staffListId;

  StaffList.findById(staffListId)
    .then((staffList) => {
      if (!staffList) {
        const error = new Error("No staffList could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ staffList: staffList, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getAddStaffList = (req, res, next) => {
  const projectId = req.params.projectId;
  const callsheetId = req.params.callsheetId;
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  StaffList.find({
    project: projectId,
    callsheet: { $not: { $elemMatch: { $eq: callsheetId } } },
  })
    .then((staffLists) => {
      if (staffLists.length >= 0) {
        return StaffList.find({
          project: projectId,
          callsheet: { $not: { $elemMatch: { $eq: callsheetId } } },
        }).then((totalItems) => {
          res.status(200).json({
            staffLists: staffLists,
            totalItems: totalItems,
            authority: req.aCode,
          });
        });
      } else {
        const error = new Error("No staffLists could be found");
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

exports.createStaffList = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const dept = req.body.dept;
  const role = req.body.role;
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const projectId = req.params.projectId;

  const staffList = new StaffList({
    dept: dept,
    role: role,
    name: name,
    email: email,
    phone: phone,
    project: projectId,
  });

  staffList
    .save()
    .then((staffList) => {
      res.status(201).json({
        message: "staffCall created!",
        staffList: staffList,
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

exports.updateStaffList = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const projectId = req.params.projectId;
  const staffListId = req.params.staffListId;

  const dept = req.body.dept;
  const role = req.body.role;
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;

  StaffList.findByIdAndUpdate(
    staffListId,
    {
      $set: {
        dept: dept,
        role: role,
        name: name,
        email: email,
        phone: phone,
      },
    },
    { new: true }
  )
    .then((updatedStaffList) => {
      res.status(201).json({
        message: "staffList updated",
        updatedStaffList: updatedStaffList,
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

exports.deleteStaffList = (req, res, next) => {
  const staffListIds = req.body.staffListIds;
  const projectId = req.params.projectId;

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  StaffList.find({ _id: { $in: staffListIds } })
    .then((staffLists) => {
      if (staffLists.length === 0) {
        const error = new Error("Could not find staffLists");
        //error.statusCode = 404;
        next(error);
      }
      return StaffList.deleteMany({ _id: { $in: staffListIds } });
    })
    .then((result) => {
      return StaffCall.deleteMany({ staff: { $in: staffListIds } });
    })
    .then((result) => {
      return StaffList.find({ project: projectId });
    })
    .then((staffLists) => {
      res.status(200).json({
        message: "deleting staffLists complete",
        staffLists: staffLists,
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
