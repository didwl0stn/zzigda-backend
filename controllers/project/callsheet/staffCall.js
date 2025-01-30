const { validationResult } = require("express-validator");
const fs = require("fs");

const Project = require("../../../modules/project");
const Callsheet = require("../../../modules/project/callsheet");

const fileEdit = require("../../../util/file");
const StaffCall = require("../../../modules/project/callsheet/staffCall");
const StaffList = require("../../../modules/project/staffList");
const staffCall = require("../../../modules/project/callsheet/staffCall");

exports.getStaffCalls = (req, res, next) => {
  const callsheetId = req.params.callsheetId;

  StaffCall.find({ callsheet: callsheetId })
    .populate({ path: "staff", select: "order dept role name call" })
    .sort({ order: 1 })
    .then((staffCalls) => {
      if (staffCalls.length >= 0) {
        return StaffCall.countDocuments({
          callsheetId: callsheetId,
        }).then((totalItems) => {
          res.status(200).json({
            staffCalls: staffCalls,
            totalItems: totalItems,
            authority: req.aCode,
          });
        });
      } else {
        const error = new Error("No callsheet could be found");
        //error.statusCode = 404;
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getStaffCall = (req, res, next) => {
  const userId = req.userId;
  const staffCallId = req.params.staffCallId;

  StaffCall.findById(staffCallId)
    .populate({ path: "staff", select: "order dept role name" })
    .then((staffCall) => {
      if (!staffCall) {
        const error = new Error("No staffCall could be found");
        //error.statusCode = 404;
        next(error);
      }
      res.status(200).json({ staffCall: staffCall });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createStaffCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const staffListIds = req.body.staffListIds;
    const callsheetId = req.params.callsheetId;

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const generalCall = await Callsheet.findById(callsheetId, {
      crewCall: 1,
    }).then((result) => {
      return result.crewCall;
    });

    console.log("This is generalCall : ", generalCall);

    const staffs = await StaffList.find(
      { _id: { $in: staffListIds } },
      { dept: 1 }
    );

    if (!Array.isArray(staffs) || staffs.length === 0) {
      const error = new Error("no staffs to insert");
      //error.statusCode = 403;
      throw error;
    }

    // 부서별 그룹화
    const groupedStaffs = {};
    staffs.forEach((staff) => {
      const dept = staff.dept;
      if (!groupedStaffs[dept]) {
        groupedStaffs[dept] = [];
      }

      groupedStaffs[dept].push(staff);
    });

    const promiseArray = []; // 포문 다돌고 나오는 모든 프로미스 집합하기 위한 배열
    for (const dept in groupedStaffs) {
      const staffsInDept = groupedStaffs[dept];
      // 해당 부서에 속한 직원들의 배열에 접근하여 작업 수행
      console.log("This is staffsInDept : ", staffsInDept);

      let deptStaffCounts = await StaffCall.find({
        callsheet: callsheetId,
        dept: dept,
      }).countDocuments();

      console.log("This is deptStaffCounts : ", deptStaffCounts);

      const staffReady = staffsInDept.map((staff) => {
        const staffCall = new StaffCall({
          order: deptStaffCounts++,
          dept: dept,
          staff: staff._id,
          call: generalCall,
          callsheet: callsheetId,
        });

        return staffCall;
      });

      const InsertedStaff = StaffCall.insertMany(staffReady);
      promiseArray.push(InsertedStaff);
    }

    await Promise.all(promiseArray);

    await StaffList.updateMany(
      { _id: { $in: staffListIds } }, // 업데이트 대상을 찾기 위한 필터
      { $push: { callsheet: callsheetId } } // callsheet 배열에 callsheet 추가
    );

    const updatedStaffCalls = await StaffCall.find({
      callsheet: callsheetId,
      staff: { $in: staffListIds },
    })
      .populate("staff", "name")
      .sort({ order: 1 });
    res.status(201).json({
      message: "staffCall created!",
      staffCalls: updatedStaffCalls,
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

exports.updateStaffCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const callsheetId = req.params.callsheetId;

    const newStaffCalls = req.body.staffCalls;

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const newStaffCallIds = newStaffCalls.map((item) => item._id);

    const staffCalls = await StaffCall.find({
      callsheet: { $elemMatch: { $eq: callsheetId } },
      _id: { $in: newStaffCallIds },
    });

    if (!Array.isArray(staffCalls) && staffCalls.length === 0) {
      const error = new Error("no staffCalls to insert");
      //error.statusCode = 403;
      throw error;
    }
    const updatedStaffCalls = [];

    for (const newStaffCall of newStaffCalls) {
      const newOrder = newStaffCall.order;
      const newCall = newStaffCall.call;
      const newDept = newStaffCall.dept;
      const updatedStaffCall = await StaffCall.findByIdAndUpdate(
        newStaffCall._id,
        { $set: { order: newOrder, dept: newDept, call: newCall } },
        {
          new: true,
        }
      );

      updatedStaffCalls.push(updatedStaffCall);
    }

    updatedStaffCalls.sort((a, b) => {
      return a.order - b.order;
    });

    res.status(201).json({
      message: "staffCall updated",
      staffCall: updatedStaffCalls,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteStaffCall = (req, res, next) => {
  const staffCallIds = req.body.staffCallIds;
  const callsheetId = req.params.callsheetId;

  let staffListIds = [];
  if (!Array.isArray(staffCallIds) && staffCallIds.length === 0) {
    const error = new Error("no staffCallIds to delete");
    //error.statusCode = 403;
    return next(error);
  }

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  StaffCall.find({
    callsheet: callsheetId,
    _id: { $in: staffCallIds },
  })
    .then((staffCalls) => {
      if (!staffCalls) {
        const error = new Error("Could not find staffCalls");
        // error.statusCode = 404;
        return next(error);
      }

      staffListIds = staffCalls.map((i) => {
        return (i = i.staff);
      });

      return StaffCall.deleteMany({ _id: { $in: staffCallIds } });
    })
    .then((result) => {
      return StaffList.updateMany(
        { _id: { $in: staffListIds } },
        { $pull: { callsheet: callsheetId } }
      );
    })
    .then((result) => {
      return StaffCall.find({ callsheet: callsheetId }).sort({ order: 1 });
    })
    .then((staffCalls) => {
      res.status(200).json({
        message: "deleting staffCall complete",
        staffCalls: staffCalls,
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
