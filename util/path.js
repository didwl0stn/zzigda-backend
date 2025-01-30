const path = require('path');

module.exports = path.dirname(process.mainModule.filename);
// dirname()은 인자로 받은 파일의 경로를 뱉어냄
// mainModule은 이 경우 app.js같은 패키지의 메인 모듈
//이것으로 __dirname을 통해 상대적으로 가던 경로를
//해당 패키지의 주소와 하위 경로(해당 파일의) 입력으로
//깔끔하게 할 수 있음