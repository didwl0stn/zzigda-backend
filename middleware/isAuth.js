const jwt = require("jsonwebtoken");

// 클라이언트에서 jwt받아와 존재유무, 유효성 여부 걸러랜는 미들웨어
module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    next(error);
  }
  const token = authHeader.split(" ")[1]; // 'Bearer'와 분리
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, `${process.env.JWT_PRIVATE_KEY}`); // decode라는 메서드도 되지만 그건 해독만 함
    // 유효성 검사까지는 verify메서드
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
  // 여기까지 오면 기술적인 문제점은 없었지만
  // 토큰 자체가 유효하지 않을 수 있어서
  if (!decodedToken) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    next(error);
  }
  req.userId = decodedToken.userId;
  next();
};
