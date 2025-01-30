const { validationResult } = require("express-validator");
const fs = require("fs");

const CheckList = require("../../../modules/project/callsheet/checkList");

const fileEdit = require("../../../util/file");

exports.getCheckLists = (req, res, next) => {
  const projectId = req.params.projectId;
  const callsheetId = req.params.callsheetId;
  let totalItems; // 프론트에서 pagination논리에 필요한 총 데이터 수

  CheckList.find({ callsheet: callsheetId })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return CheckList.find({ callsheet: callsheetId }).sort({ order: 1 });
    })
    .then((checkLists) => {
      console.log(checkLists);
      if (checkLists.length > 0) {
        res.status(200).json({
          checkLists: checkLists,
          totalItems: totalItems,
          authority: req.aCode,
        });
      }
      const error = new Error("No checkLists could be found");
      error.statusCode = 404;
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getCheckList = (req, res, next) => {
  const userId = req.userId;
  const checkListId = req.params.checkListId;

  CheckList.findById(checkListId)
    .then((checkList) => {
      if (!checkList) {
        const error = new Error("No checkList could be found");
        error.statusCode = 404;
      }
      res.status(200).json({ checkList: checkList, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createCheckList = async (req, res, next) => {
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

    const checkLists = req.body.checkLists;
    const callsheetId = req.params.callsheetId;

    const insertedCheckLists = [];

    for (let checkList of checkLists) {
      checkList = new CheckList({
        order: checkList.order,
        dept: checkList.dept,
        content: checkList.content,
        callsheet: callsheetId,
      });
      insertedCheckLists.push(await checkList.save());
    }

    insertedCheckLists.sort((a, b) => {
      return a.order - b.order;
    });

    res.status(201).json({
      message: "checkLists created!",
      chekcLits: insertedCheckLists,
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

exports.updateCheckList = async (req, res, next) => {
  try {
    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const checkLists = req.body.checkLists;
    const callsheetId = req.params.callsheetId;

    const updatedCheckLists = [];
    for (const checkList of checkLists) {
      const order = checkList.order;
      const dept = checkList.dept;
      const content = checkList.content;
      updatedCheckLists.push(
        await CheckList.findByIdAndUpdate(
          checkList._id,
          { $set: { order: order, dept: dept, content: content } },
          { new: true }
        )
      );
    }

    updatedCheckLists.sort((a, b) => {
      return a.order - b.order;
    });

    res.status(200).json({
      message: "updating checkLists complete",
      updatedCheckLists: updatedCheckLists,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteCheckList = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    throw error;
  }
  const callsheetId = req.params.callsheetId;

  const checkListIds = req.body.checkListIds;
  if (!Array.isArray(checkListIds) && checkListIds.length === 0) {
    const error = new Error("no checkListIds to delete");
    error.statusCode = 403;
    throw error;
  }

  CheckList.deleteMany({ callsheet: callsheetId, _id: { $in: checkListIds } })
    .then((result) => {
      return CheckList.find({ callsheet: callsheetId }).sort({ order: 1 });
    })
    .then((checkLists) => {
      res.status(200).json({
        message: "deleting checkLists complete",
        checkLists: checkLists,
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
