var fs = require('fs');
var result = {}
result.results = [];
for(var i = 0; i < 2; i++) {
  var str = '';
  var numStr = '0123456789abcdefghijklmnpqrstuvwxyz';
  // var wStr = 'abcdefghijklmnpqrstuvwxyz';
  var w1 = numStr[Math.floor(Math.random()*35)];
  var w2 = numStr[Math.floor(Math.random()*35)];
  var w3 = numStr[Math.floor(Math.random()*35)];
  var w4 = numStr[Math.floor(Math.random()*35)];
  var w5 = numStr[Math.floor(Math.random()*35)];
  var w6 = numStr[Math.floor(Math.random()*35)];
  var w7 = numStr[Math.floor(Math.random()*35)];
  var w8 = numStr[Math.floor(Math.random()*35)];
  str = [w1,w2,w3,w4,w5,w6,w7,w8].join('');
  result.results.push({"cid": str})
}
fs.writeFileSync('Card.json', JSON.stringify(result));
