'use strict';
var express = require('express');
var timeout = require('connect-timeout');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var wechat = require('wechat');
var url = require('url');
var AV = require('leanengine');
var Award  = AV.Object.extend('Award');
var Card = AV.Object.extend('Card');
var AwardCount = AV.Object.extend('AwardCount');
var config = {
  token: 'gfzapqETmEh6nF6ymnEf',
  appid: 'wx3d2e71ffa3950950',
  encodingAESKey: 'xgUw4zRgJcYeTjZWox3iqCHrh5md4856X8XmOFc5OHI'
};
// 加载云函数定义，你可以将云函数拆分到多个文件方便管理，但需要在主文件中加载它们
require('./cloud');

var app = express();
app.use(express.query());
app.use(AV.Cloud.CookieSession({ secret: 'haha', maxAge: 3600000, fetchUser: true }));

// 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));

// 设置默认超时时间
app.use(timeout('15s'));

// 加载云引擎中间件
app.use(AV.express());

app.enable('trust proxy');
// 需要重定向到 HTTPS 可去除下一行的注释。
// app.use(AV.Cloud.HttpsRedirect());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', function(req, res) {
 res.send('hello')
});

app.get('/home', function(req,res,next) {
    res.render('home',{});
});

app.get('/reg',function(req,res){
    var arg = url.parse(req.url, true).query;
    var query = new AV.Query('Card')
    query.equalTo('uid', arg.uid);
    query.find().then(function(results) {
      if(results.length > 0) {
        var phone = results[0].get('phone');

        if(phone) {
          res.redirect('/zp?uid=' + arg.uid)
        } else {
          res.render('reg',{pic:arg.pic,cid:arg.cid,uid:arg.uid});
        }
      }
    })
  });

app.post('/reg',function(req,res){
    var params = req.body;
    var query = new AV.Query('Card');
    var uid = req.body.uid;

    query.equalTo('uid', uid);
    query.find().then(function(results) {
      if(results.length > 0) {
        var card = results[0];
        card.set('name', req.body.username);
        card.set('shop', req.body.shop);
        card.set('phone', req.body.telephone);
        return card.save()
      } else {
        //to do continue
      }
    }).then(function() {
      res.redirect('/zp?uid=' + uid);
    })
});

app.get('/zp',function(req,res){
  var arg = url.parse(req.url, true).query;
  var uid = arg.uid || ''
  if(!uid) {
    res.redirect('/reg');
  }

  var query = new AV.Query('Card')
  query.equalTo('uid', uid)
  query
    .find()
    .then(function(results) {
      if(results.length > 0) {
        var card = results[0];
        var name = card.get('name');
        var cid = card.get('cid');
        var uid = card.get('uid');
        var type = card.get('type');
        var obj = {};
        if(type >= 0) {
          // 中过了
          var prize = getPrizeByType(type)
          obj.award = true;
          obj.prize = prize
          res.render('zp',{'award':obj,name:name,cid:cid,uid:uid});
        } else {
          // 要去中
          obj.award = false;
          res.render('zp',{'award':obj,name:name,cid:cid,uid:uid});
        }
      }
    })
})

function getPrizeByType(type) {
  var awardArr = ["","名牌手机","折叠篮","精品毛巾","钻石碗","精美礼品"];
  return awardArr[type];
}


app.get('/check_card',function(req,res){
    var arg = url.parse(req.url, true).query;
    var cid = arg.cid;
    var uid = arg.uid;
    var query = new AV.Query(Card);
    query.equalTo("cid", cid);
    query.equalTo('uid', uid);
    query.find().then(function(results) {
      if(results.length > 0) {
        var card = results[0];
        if(card.get('type') >= 0) {
          res.json({status:'error',message: '奖券不能重复使用!'})
        } else {
          res.json({status:'ok'})
        }
      } else {
        res.json({status:'error',message: '奖券不能使用!'})
      }
    })
});

app.get('/api', function(req, res) {

	var c1 = 0,
        c2 = 0,
        c3 = 0,
        c4 = 0,
        c5 = 0;
	var prize = 5;

	var query = new AV.Query(AwardCount);
	query.first({
		success: function(o) {
			c1 = o.get('c1');
			c2 = o.get('c2');
			c3 = o.get('c3');
			c4 = o.get('c4');
            c5 = o.get('c5');
			var obj = {status:'ok',prize:prize};
			var rando_num1 = Math.ceil(Math.random()*(1000-1)+1);
			var rando_num2 = Math.ceil(Math.random()*(1000-1)+1);
			if(false) {
				obj.prize = 5;
				o.set('c1',c1+1);
			} else if(rando_num1 < 300 && rando_num2 < 300 && c2 < 400) {
				obj.prize = 2;
				o.set('c2',c2+1);
			} else if(rando_num1 < 500 && rando_num2 < 500 && c3 < 600) {
				obj.prize = 3;
				o.set('c3',c3+1);
			} else if(rando_num1 < 800 && rando_num2 < 750 && c3 < 1000) {
				obj.prize = 4;
				o.set('c4',c4+1);
			} else {
				o.set('c5',c5+1);
			}

			if(c5 >= 1000) {
				res.json({status:'error',message:'奖品已抽完，谢谢参与'});
			}

			o.save().then(function(){
				res.json(obj);
			},function(){
				res.json({status:'error',message:'数据出错，请重试!'});
			});
		},
		error: function(error) {
			res.json({status:'error',message:'数据出错'});
		}
	});
});

app.get('/award', function(req, res) {
  var arg = url.parse(req.url, true).query;
  var uid = arg.uid;
  var card = null;
  var obj = {status:'ok',prize:5};
  if(uid) {
    var query = new AV.Query('Card');
    query.equalTo('uid', uid);
    query.find().then(function(results) {
      if(results.length > 0) {
        card = results[0];
        var type = card.get('type');
        if(type >= 0) {
          res.json({status:'error',message:'您已中过奖了'});
        } else {
          var count_query = new AV.Query('AwardCount');
          return count_query.first();
        }
      } else {
        res.json({status:'error',message:'用户信息有误'});
      }
    }).then(function(result) {
      var c1 = result.get('c1');
      var c2 = result.get('c2');
      var c3 = result.get('c3');
      var c4 = result.get('c4');
      var c5 = result.get('c5');

      var rando_num1 = Math.ceil(Math.random()*(1000-1)+1);
      var rando_num2 = Math.ceil(Math.random()*(1000-1)+1);
      if( false ) {
				obj.prize = 5;
				result.set('c1',c1+1);
			} else if(rando_num1 < 400 && rando_num2 < 400 && c2 < 150) {
				obj.prize = 2;
				result.set('c2',c2+1);
			} else if(rando_num1 < 600 && rando_num2 < 550 && c3 < 600) {
				obj.prize = 3;
				result.set('c3',c3+1);
			} else if(rando_num1 < 800 && rando_num2 < 750 && c3 < 600) {
				obj.prize = 4;
				result.set('c4',c4+1);
			} else {
				result.set('c5',c5+1);
			}
      if(c5 >= 1000) {
				res.json({status:'error',message:'奖品已抽完，谢谢参与'});
			}
      return result.save()
    }).then(function() {
      card.set('type', obj.prize)
      return card.save()
    }).then(function() {
      res.json({status:'ok',prize:obj.prize});
    })
  } else {
    res.json({status:'error',message:'用户信息有误'});
  }
});

app.get('/user_num', function(req, res){
  var query = new AV.Query('Card');
  query.count().then(function(count) {
    res.json({'count':count});
  })
})

app.get('/admin', function(req, res) {
  var arg = url.parse(req.url, true).query;
  var page = arg.page? arg.page: 1;

  var prepage = 1;
  var nextpage = 1;
  if(page > 1) {
		prepage = page - 1;
	} else {
		prepage = 0;
	}
  var query = new AV.Query('AwardCount');
  var obj = {}
  query
    .first()
    .then(function(result) {
      if(result) {
        obj.c1 = result.get('c1');
        obj.c2 = result.get('c2');
        obj.c3 = result.get('c3');
        obj.c4 = result.get('c4');
        obj.c5 = result.get('c5');
        var card_query = new AV.Query('Card');
        card_query.limit(100);
        if(page > 1) {
          card_query.skip((page-1)*100)
        }
        return card_query.find()
      }
    }).then(function(results) {
      if(results.length >= 100) {
        nextpage = nextpage + 1;
      } else {
        nextpage = 0;
      }

      res.render('admin',{'results':results,num:0,ac:obj,prepage:prepage,nextpage:nextpage});
    })
});


// 可以将一类的路由单独保存在一个文件中


app.use('/wechat', wechat('gfzapqETmEh6nF6ymnEf', wechat.text(function (message, req, res, next) {
    if(message.Content == "圣象力量" || message.Content == "点赞") {
         res.reply('上传手拿圣象力量手举牌并合影发在朋友圈的截图，马上获得游戏码。');
     } else {
         res.reply('你好，感谢您的留言');
     }
}).image(function (message, req, res, next) {
  // res.reply('您的图片已收到');
  receivePhotoMessage(message, res);
}).voice(function (message, req, res, next) {

}).video(function (message, req, res, next) {

}).shortvideo(function (message, req, res, next) {

}).location(function (message, req, res, next) {

}).link(function (message, req, res, next) {

}).event(function (message, req, res, next) {
    if(message.Event == 'subscribe') {
        var str = '欢迎关注圣象';
        res.reply(str);
    } else if(message.Event == 'CLICK') {
        if(message.EventKey == 'POWERDEKOR_PHOTO') {
            var str = '上传手拿圣象力量手举牌并合影发送至朋友圈的截图，马上获得游戏码。'
            res.reply(str);
        }
    }
}).device_text(function (message, req, res, next) {

}).device_event(function (message, req, res, next) {

})));


var receivePhotoMessage = function(msg,res) {
  var zpUrl = 'http://pdweixin.leanapp.cn/zp';
  var strContent;
  var uid = msg.FromUserName;
  var mid = msg.MediaId;
  var cid = null;
  var query = new AV.Query('Card')
  query.equalTo('uid', uid)
  query
    .find()
    .then(function(results) {
      if(results.length > 0) {
        // 发过了
        var link = getGameLink(results[0].get('cid'), uid, msg.PicUrl);
        res.reply(link);
      } else {
        var card = new Card();
        cid = getCid();
        card.set('cid', cid);
        card.set('mid', mid);
        card.set('uid', uid);
        // 生成随机数
        return card.save()
      }
    })
    .then(function() {
      var link = getGameLink(cid, uid, msg.PicUrl);
      res.reply(link);
    }).catch(function(error) {
      res.reply('请重试');
      console.error(error);
    })
}

function getCid () {
  var numStr = '0123456789abcdefghijklmnpqrstuvwxyz';
  var w1 = numStr[Math.floor(Math.random()*35)];
  var w2 = numStr[Math.floor(Math.random()*35)];
  var w3 = numStr[Math.floor(Math.random()*35)];
  var w4 = numStr[Math.floor(Math.random()*35)];
  var w5 = numStr[Math.floor(Math.random()*35)];
  var w6 = numStr[Math.floor(Math.random()*35)];
  var w7 = numStr[Math.floor(Math.random()*35)];
  var w8 = numStr[Math.floor(Math.random()*35)];
  return [w1,w2,w3,w4,w5,w6,w7,w8].join('');
}

function getGameLink (cid,uid,pic) {
  var zpUrl = 'http://pdweixin.leanapp.cn/reg';
  return `您的游戏码为${cid}\n请点击下面链接直接参与\n\n${zpUrl}?cid=${cid}&uid=${uid}&pic=${pic}`;
}


app.use(function(req, res, next) {
  // 如果任何一个路由都没有返回响应，则抛出一个 404 异常给后续的异常处理器
  if (!res.headersSent) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
});




// error handlers
app.use(function(err, req, res, next) {
  if (req.timedout && req.headers.upgrade === 'websocket') {
    // 忽略 websocket 的超时
    return;
  }

  var statusCode = err.status || 500;
  if (statusCode === 500) {
    console.error(err.stack || err);
  }
  if (req.timedout) {
    console.error('请求超时: url=%s, timeout=%d, 请确认方法执行耗时很长，或没有正确的 response 回调。', req.originalUrl, err.timeout);
  }
  res.status(statusCode);
  // 默认不输出异常详情
  var error = {}
  if (app.get('env') === 'development') {
    // 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
    error = err;
  }
  res.render('error', {
    message: err.message,
    error: error
  });
});

module.exports = app;
