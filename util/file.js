const fs = require("fs");

const deleteFile = (filePath) => {
  // 파일을 삭제하는 unlink
  fs.unlink(filePath, (err) => {
    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;
