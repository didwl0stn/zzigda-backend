const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../modules/user");
const Company = require("../modules/company");

const { format } = require("util");
const { v4: uuidv4 } = require("uuid");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket("helloworld-app-410701.appspot.com");

const uploadFile = (req) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(req.file);

      const folderName = "userImage/";

      const fileName = folderName + uuidv4() + "_" + req.file.originalname;

      // Create a new blob in the bucket and upload the file data.
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
      });

      blobStream.on("error", (err) => {
        const error = new Error(err.message);
        error.statusCode = 500;
        reject(error);
      });

      let publicUrl;

      blobStream.on("finish", async (data) => {
        // Create URL for directly file access via HTTP.
        publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );

        try {
          // Make the file public
          await bucket.file(fileName).makePublic();
          resolve(publicUrl);
        } catch (err) {
          const error = new Error(
            `Uploaded the file successfully: ${fileName}, but public access is denied!`
          );
          error.statusCode = 500;
          reject(error);
        }
      });

      blobStream.end(req.file.buffer);
    } catch (err) {
      const error = new Error(
        `Could not upload the file: ${req.file.originalname}. ${err}`
      );
      error.statusCode = 500;
      reject(error);
    }
  });
};

const deleteFile = async (url) => {
  try {
    const folderName = "userImage/";
    const fileName = folderName + url.substring(url.lastIndexOf("/") + 1);
    const file = bucket.file(fileName);

    // 파일 삭제
    await file.delete();
  } catch (err) {
    console.error(err);
    const error = new Error(`Unable to delete file: ${err.message}`);
    error.statusCode = 500;
    next(error);
  }
};

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    next(error);
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const phone = req.body.phone;
  const company_name = req.body.company_name;

  const company = new Company({ name: company_name });
  company
    .save()
    .then((company) => {
      // user객체에 연결시킬 company객체 생성 후 저장
      const company_id = company._id;
      // 비밀번호 해싱
      bcrypt
        .hash(password, 12)
        .then((hashedPw) => {
          // user객체 생성후 저장
          const user = new User({
            email: email,
            password: hashedPw,
            name: name,
            phone: phone,
            company: company,
          });
          return user.save();
        })
        .then((user) => {
          // Company객체에 회원가입한 생성자 추가
          return Company.findById(company_id).then((company) => {
            company.members.push({ member: user, role: "owner" });
            return company.save();
          });
        })
        .then((result) => {
          res
            .status(201)
            .json({ message: "User Created!", userId: result._id });
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

exports.login = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not be found");
        //error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong username or password");
        //error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        { email: loadedUser.email, userId: loadedUser._id.toString() },
        `${process.env.JWT_PRIVATE_KEY}`,
        { expiresIn: "5h" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }); // 모든 에러를 다음 미들웨어로 전달
};

exports.reset_pw = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    next(error);
  }

  const email = req.body.email;

  // randomBytes() 첫번째 인자 바이트 길이, 두번째 콜백함수
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      const error = new Error("Having problem with crypto");
      //error.statusCode = 401;
      return next(error);
    }
    const token = buffer.toString("hex");
    User.findOne({ email: email })
      .then((user) => {
        // 일치하는 사용자 없을 때
        if (!user) {
          const error = new Error("A user with this email could not be found");
          //error.statusCode = 401;
          throw error;
        }
        user.resetToken = token;
        // Date.now()는 현시간, 밀리초 단위로 1시간 = 3600000
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.status(200).json({
          email: email,
          userId: result._id.toString(),
          resetToken: result.resetToken,
          resetTokenExpiration: result.resetTokenExpiration,
        });

        console.log(result);
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  });
};

exports.new_pw = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const new_pw = req.body.password;
  const userId = req.body.userId;
  // 무작위 토큰 입력후 백엔드에서 userId고의로 바꾸는 것 방지 위해 토큰도 받음
  const passwordToken = req.body.passwordToken;
  let resetUser;

  // 토큰은 막 때려넣을 수 있고, 아이디만 가지고는 고의로 다른 userId들어갈 수 있고 해서
  // 토큰과 아이디가 동시에 일치하는 사람을 식별하기 위해 토큰과 아이디 다 받은 것
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(new_pw, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      // resetToken만료시키기
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.status(200).json({ message: "reset_pw succeed!" });
    })
    .catch((err) => {
      console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
