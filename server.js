var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server, {});

var SOCKET_LIST = {};

///////////////////////////
//        EXPRESS        //
///////////////////////////

app.get('/', function(req, res) {
  console.log(":: HTTP :: Loading file: " + __dirname + "/index.html");
  res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(process.env.PORT || 3000);
console.log(":: Express :: Listening on port 3000");



///////////////////////////
//      GAME SERVER      //
///////////////////////////

var GameServer = function() {
  this.rooms = {};
  this.roomCount = 0;

  this.findGame = function(player) {
    console.log("looking for a game. We have: " + this.roomCount + " games.");
    if(this.roomCount) {
      for(var i in this.rooms) {
        if(player.joinedGame) {
          break;
        }
        if(this.rooms[i].playerCount < this.rooms[i].maxPlayers) {
          this.rooms[i].joinPlayer(player);
        }
      }

      if(!player.joinedGame) {
        this.createGame(player);
      }
    } else {
      this.createGame(player);
    }
  }

  this.createGame = function(player) {
    var room = new Game(player);

    this.rooms[room.id] = room;

    this.roomCount++;

    room.createAI();
  }

  this.updateRooms = function() {
    for(var i in gameServer.rooms) {
      var room = gameServer.rooms[i];
      room.initPlayers();
      room.update();
      room.removePlayers();
    }
  }
};

var gameServer = new GameServer();



///////////////////////////
//         GAME          //
///////////////////////////

var Game = function(player) {
  this.id = random(1, 1000000000);
  player.localId = 1;
  this.maxPlayers = 2;
  this.players = {};
  this.players[player.localId] = player;
  this.playerCount = 1;

  this.width = 640;
  this.height = 480;
  this.wallWidth = 12;
  this.court = new Court(this);
  this.ballCount = 1;
  this.constructBalls = function() {
    var balls = [];
    for(var n = 0 ; n < this.ballCount ; n++)
      balls.push(new Ball(this));
    return balls;
  }
  this.balls = this.constructBalls();

  this.initPack = {
    players: [],
    balls: []
  };
  this.removePack = [];

  this.assignAttributesToPlayer = function(player) {
    player.roomId = this.id;
    player.minY = this.wallWidth;
    player.maxY = this.height - this.wallWidth - player.height;
    player.setPlayerPosition(player.localId, this.width);
  }

  this.joinPlayer = function(player) {
    if(this.players[1] !== undefined && !this.players[1].isAI) {
      player.localId = 2;
      this.removePack.push(this.players[2].id);
    } else {
      player.localId = 1;
    }
    this.players[player.localId] = player;
    this.playerCount++;
    this.assignAttributesToPlayer(player);
    player.joinedGame = true;
    this.sendCourt(this.court);
    this.sendPackage('init', { players: this.players, balls: this.balls });
  }

  this.createAI = function() {
    var aiSocket = { id: random(1, 1000000000) };
    var ai = new Player(aiSocket, "AI", true);
    Player.list[ai.id] = ai;
    if(this.players[1] !== undefined) {
      ai.localId = 2;
    } else {
      ai.localId = 1;
    }
    this.players[ai.localId] = ai;
    this.assignAttributesToPlayer(ai);
    this.pushPlayerToInitPack(ai);
  }

  this.ballIntercept = function(ball, player, dx, dy, ai) {
    var intercept;
    if(dx < 0) {
      var right = player.right + ball.radius
      intercept = this.intercept(ball.x, ball.y,
                                 ball.x + dx, ball.y + dy,
                                 right, player.top - ball.radius,
                                 right, player.bottom + ball.radius,
                                 'right', ai);
    } else if(dx > 0) {
      var left = player.left - ball.radius;
      intercept = this.intercept(ball.x, ball.y,
                                 ball.x + dx, ball.y + dy,
                                 left, player.top - ball.radius,
                                 left, player.bottom + ball.radius,
                                 'left', ai);
    }
    if(!intercept) {
      if (dy < 0) {
        var bottom = player.bottom + ball.radius;
        intercept = this.intercept(ball.x, ball.y,
                                   ball.x + dx, ball.y + dy,
                                   player.left - ball.radius, bottom,
                                   player.right + ball.radius, bottom,
                                   'bottom', ai);
      } else if (dy > 0) {
        var top = player.top - ball.radius;
        intercept = this.intercept(ball.x, ball.y,
                                   ball.x + dx, ball.y + dy,
                                   player.left - ball.radius, top,
                                   player.right + ball.radius, top,
                                   'top', ai);
      }
    }
    return intercept;
  }

  this.intercept = function(x1, y1, x2, y2, x3, y3, x4, y4, d, ai) {
    if(ai)
        console.log("x1: " + x1 + "  y1: " + y1 + "  x2: " + x2 + "  y2: " + y2 + "  x3: " + x3 + "  y3: " + y3 + "  x4: " + x4 + "  y4: " + y4);
    var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
    if(denom != 0) {
      var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
      // if(ai)
      //   console.log("ua = " + ua);
      if((ua >= 0) && (ua <= 1)) {
        var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
        // if(ai)
        //   console.log("ub = " + ub);
        if((ub >= 0) && (ub <= 1)) {
          // if(ai)
          //   console.log("intercepting point found");
          var x = x1 + (ua * (x2-x1));
          var y = y1 + (ua * (y2-y1));
          return { x: x, y: y, d: d};
        }
      }
    }
    return null;
  }

  this.goal = function(localId, ball) {
    if(this.playerCount == 2) {
      var player = this.players[localId];
      player.score += 1;
      // if(player.score < 10) {
      //   this.sendPackage('scored', player.id);
      //   ball.reset(localId);
      // }
      this.sendPackage('addToChat', this.players[1].score + ' - ' + this.players[2].score);
    }
    ball.reset(localId);
  }

  this.ai = function(ai, ball) {
    if((ball.x < ai.left && ball.spdX < 0) || (ball.x > ai.right && ball.spdX > 0)) {
      ai.moveUp = false;
      ai.moveDown = false;
      return;
    }

    this.predict(ai, ball);

    if(ai.prediction) {
      if(ai.prediction.y < (ai.top + ai.height/2 - 5)) {
        ai.moveUp = true;
        ai.moveDown = false;
      } else if(ai.prediction.y > (ai.bottom - ai.height/2 +5)) {
        ai.moveUp = false;
        ai.moveDown = true;
      } else {
        ai.moveUp = false;
        ai.moveDown = false;
      }
    }
  }

  this.predict = function(ai, ball) {
    if(ai.prediction &&
       (ai.prediction.spdX * ball.spdX > 0) &&
       (ai.prediction.spdY * ball.spdY > 0) &&
       (ai.prediction.since < ai.level.aiReaction)) {
      ai.prediction.since += 1/60;
      return;
    }

    var intercept = this.ballIntercept(ball, { left: ai.left, right: ai.right, top: -10000, bottom: 10000 }, ball.x + ball.spdX * 10, ball.x + ball.spdY * 10, true );

    if(intercept) {
      var top = ai.minY + ball.radius;
      var bottom = ai.maxY + ai.height - ball.radius;

      while(intercept.y < top || intercept.y > bottom) {
        if(intercept.y < top) {
          intercept.y = top + (top - intercept.y);
        } else if(intercept.y > bottom) {
          intercept.y = top + (bottom - top) - (intercept.y - bottom);
        }
      }
      ai.prediction = intercept;
    } else {
      ai.prediction = null;
    }

    if(ai.prediction) {
      ai.prediction.since = 0;
      ai.prediction.spdX = ball.spdX;
      ai.prediction.spdY = ball.spdY;
      ai.prediction.radius = ball.radius;
      ai.prediction.exactX = ai.prediction.x;
      ai.prediction.exactY = ai.prediction.y;
      var closeness = (ball.spdX < 0 ? ball.x - ai.right : ai.left - ball.x) / this.width;
      var error = ai.level.aiError * closeness;
      ai.prediction.y = ai.prediction.y + random(-error, error);
    }
  }

  this.sendCourt = function(court) {
    this.sendPackage('court', { wallWidth: court.wallWidth, walls: court.walls, scores: court.scores });
  }

  this.pushPlayerToInitPack = function(player) {
    this.initPack.players.push({
      isAI: player.isAI,
      id: player.id,
      localId: player.localId,
      username: player.username,
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      color: player.color,
      score: player.score
    });
  }

  this.pushBallToInitPack = function(ball) {
    this.initPack.balls.push({
      id: ball.id,
      radius: ball.radius,
      x: ball.x,
      y: ball.y,
      color: ball.color
    });
  }

  this.initPlayers = function() {
    this.sendPackage('init', this.initPack);
    this.initPack.players = [];
    this.initPack.balls = [];
  }

  this.update = function() {
    var pack = {
      players: [],
      balls: []
    };
    pack.players = this.updatePlayers();
    pack.balls = this.updateBalls();
    this.sendPackage('update', pack);
  }

  this.updatePlayers = function() {
    var pack = [];
    for(var i in this.players) {
      var player = this.players[i];
      if(player.isAI) {
        for(var i in this.balls) {
          var ball = this.balls[i];
          this.ai(player, ball);
        }
        player.update();
          pack.push({
            id: player.id,
            x: player.x,
            y: player.y
          });
      } else {
        player.update();
        pack.push({
          id: player.id,
          x: player.x,
          y: player.y
        });
      }
    }
    return pack;
  }

  this.updateBalls = function() {
    var pack = [];
    for(var i in this.balls) {
      var ball = this.balls[i];
      var pos = ball.accelerate();
      if ((pos.spdY > 0) && (pos.y > ball.maxY)) {
        pos.y = ball.maxY;
        pos.spdY = -pos.spdY;
      }
      else if ((pos.spdY < 0) && (pos.y < ball.minY)) {
        pos.y = ball.minY;
        pos.spdY = -pos.spdY;
      }

      var intercept;
      var id;
      // if(this.players[1] && ball.x < this.players[1].x + (2*ball.dx)) {
      if(this.players[1] && ball.spdX < 0) {
        intercept = this.ballIntercept(ball, this.players[1], pos.dx, pos.dy, false);
        id = 1;
      } else if(this.players[2] && ball.spdX > 0) {
        intercept = this.ballIntercept(ball, this.players[2], pos.dx, pos.dy, false);
        id = 2;
      }

      ball.update(pos);

      if(intercept) {
        switch(intercept.d) {
          case 'left':
          case 'right':
            ball.x = intercept.x;
            ball.spdX = -ball.spdX;
            break;
          case 'top':
          case 'bottom':
            ball.y = intercept.y;
            ball.spdY = -ball.spdY
            break;
        }

        if(this.players[id].moveUp) {
          //ball.spdY = ball.spdY * (ball.spdY < 0 ? )
        } else if(this.players[id].moveDown) {

        }
      }

      if(ball.left > this.width) {
        this.goal(1, ball);
      } else if (ball.right < 0) {
        this.goal(2, ball);
      }

      pack.push({
        id: ball.id,
        x: ball.x,
        y: ball.y
      });
    }
    return pack;
  }

  this.removePlayers = function() {
    this.sendPackage('remove', this.removePack);
    this.removePack = [];
  }

  this.sendPackage = function(type, pack) {
    for(var i in this.players) {
      var p = this.players[i];
      if(!p.isAI) {
        var socket = SOCKET_LIST[p.id];
        socket.emit(type, pack);
      }
    }
  }

  this.assignAttributesToPlayer(player);
  this.sendCourt(this.court);
  this.pushPlayerToInitPack(player);
  for(var i in this.balls) {
    this.pushBallToInitPack(this.balls[i]);
  }
};



///////////////////////////
//        COURT          //
///////////////////////////

var Court = function(game) {
  var w = game.width;
  var h = game.height;
  var ww = game.wallWidth;

  this.wallWidth = game.wallWidth;

  this.ww = ww;
  this.walls = [];
  this.walls.push({x: 0, y: 0,      width: w, height: ww});
  this.walls.push({x: 0, y: h - ww, width: w, height: ww});
  var nMax = (h / (ww*2));
  for(var n = 0 ; n < nMax ; n++) { // draw dashed halfway line
    this.walls.push({
      x: (w / 2) - (ww / 2),
      y: (ww / 2) + (ww * 2 * n),
      width: ww,
      height: ww
    });
  }

  var sw = 3*ww;
  var sh = 4*ww;
  this.scores = [
    {x: 0.5 + (w/2) - 1.5*ww - sw, y: 2*ww, w: sw, h: sh},
    {x: 0.5 + (w/2) + 1.5*ww,      y: 2*ww, w: sw, h: sh}
  ];
}



///////////////////////////
//         BALL          //
///////////////////////////

var Ball = function(game) {
  this.id = random(1, 1000000000);
  this.radius = 5;
  this.minX = this.radius;
  this.maxX = game.width - this.radius;
  this.minY = game.wallWidth + this.radius;
  this.maxY = game.height - game.wallWidth - this.radius;
  this.x = 0;
  this.y = 0;
  this.speed = 4;
  this.accel = 4;
  this.spdX = this.speed;
  this.spdY = this.speed;
  //this.dx = (this.maxX - this.minX) / (random(1, 4) * randomChoice(1, -1));
  //this.dy = (this.maxY - this.minY) / (random(1, 5) * randomChoice(1, -1));
  // this.color = "rgb(" + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ")";
  this.color = 'white';

  this.update = function(pos) {
    // this.x = this.x + (this.dx * 1/60);
    // this.y = this.y + (this.dy * 1/60);
    // this.accelerate();
    // this.dx = -this.x;
    // this.dy = -this.y
    this.spdX = pos.spdX;
    this.spdY = pos.spdY;
    this.x += this.spdX;
    this.y += this.spdY;
    // this.dx += this.x;
    // this.dy += this.y;

    // if (this.x > this.maxX) {
    //   this.x = this.maxX;
    //   this.spdX = -this.spdX;
    // } else if (this.x < this.minX) {
    //   this.x = this.minX;
    //   this.spdX = -this.spdX;
    // }

    // if (this.y > this.maxY) {
    //   this.y = this.maxY;
    //   this.spdY = -this.spdY;
    // } else if (this.y < this.minY) {
    //   this.y = this.minY;
    //   this.spdY = -this.spdY;
    // }

    this.setPosition();

    // var pos = this.accelerate(this.x, this.y, this.dx, this.dy, this.accel, 1/60);
    //
    // if ((pos.dy > 0) && (pos.y > this.maxY)) {
    //   pos.y = this.maxY;
    //   pos.dy = -pos.dy;
    // } else if ((pos.dy < 0) && (pos.y < this.minY)) {
    //   pos.y = this.minY;
    //   pos.dy = -pos.dy;
    // }

    //this.setPosition(pos.x,  pos.y);
    //this.setDirection(pos.dx, pos.dy);
  }

  this.reset = function(id) {
    this.x = id == 1 ? this.minX : this.maxX;
    this.y = random(this.minY, this.maxY);
    this.spdX = id == 1 ? this.speed : -this.speed;
    if(Math.random() < 0.5) {
      this.spdY = this.speed;
    } else {
      this.spdY = -this.speed;
    }
    this.setPosition();
  }

  this.setPosition = function() {
    this.left   = this.x - this.radius;
    this.top    = this.y - this.radius;
    this.right  = this.x + this.radius;
    this.bottom = this.y + this.radius;
  }

  // this.setDirection = function(dx, dy) {
  //   this.dx = dx;
  //   this.dy = dy;
  // }

  this.accelerate = function() {
    var accel = 1 + (this.accel * 1/60 * 1/60 * 0.5);
    var spdX2 = this.spdX * accel;
    var spdY2 = this.spdY * accel;
    var x2  = this.x + spdX2;
    var y2  = this.y + spdY2;
    return { dx: (x2-this.x), dy: (y2-this.y), x: x2, y: y2, spdX: spdX2, spdY: spdY2 };
    //return {x: x, y: y, dx: dx, dy: dy}
  }
}



///////////////////////////
//        PLAYER         //
///////////////////////////

var LEVELS = [
  { aiReaction: 0.2, aiError:  40 }, // 0:  ai is losing by 8
  { aiReaction: 0.3, aiError:  50 }, // 1:  ai is losing by 7
  { aiReaction: 0.4, aiError:  60 }, // 2:  ai is losing by 6
  { aiReaction: 0.5, aiError:  70 }, // 3:  ai is losing by 5
  { aiReaction: 0.6, aiError:  80 }, // 4:  ai is losing by 4
  { aiReaction: 0.7, aiError:  90 }, // 5:  ai is losing by 3
  { aiReaction: 0.8, aiError: 100 }, // 6:  ai is losing by 2
  { aiReaction: 0.9, aiError: 110 }, // 7:  ai is losing by 1
  { aiReaction: 1.0, aiError: 120 }, // 8:  tie
  { aiReaction: 1.1, aiError: 130 }, // 9:  ai is winning by 1
  { aiReaction: 1.2, aiError: 140 }, // 10: ai is winning by 2
  { aiReaction: 1.3, aiError: 150 }, // 11: ai is winning by 3
  { aiReaction: 1.4, aiError: 160 }, // 12: ai is winning by 4
  { aiReaction: 1.5, aiError: 170 }, // 13: ai is winning by 5
  { aiReaction: 1.6, aiError: 180 }, // 14: ai is winning by 6
  { aiReaction: 1.7, aiError: 190 }, // 15: ai is winning by 7
  { aiReaction: 1.8, aiError: 200 }  // 16: ai is winning by 8
];

var Player = function(socket, username, isAI) {
  this.isAI = isAI;
  this.id = socket.id;
  this.username = username;
  this.x = 0;
  this.y = 0;
  this.width = 12;
  this.height = 60;
  this.speed = 4;
  // this.color = "rgb(" + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ")";
  this.color = 'white';
  this.score = 0;

  // this.moveRight = false;
  // this.moveLeft = false;
  this.moveUp = false;
  this.moveDown = false;
  this.maxSpd = 4;
  this.roomId = null;

  if(this.isAI) {
    this.level = LEVELS[0];
  }

  this.joinedGame = false;

  this.setPlayerPosition = function(position, width) {
    if(position === 1) {
      this.x = 0;
    } else {
      this.x = width - this.width;
    }
    this.y = this.minY + (this.maxY - this.minY)/2;
    this.setPosition();
  }

  this.setPosition = function() {
    this.left = this.x;
    this.right = this.x + this.width;
    this.top = this.y;
    this.bottom = this.y + this.height;
  }

  this.update = function() {
    // if(this.moveRight) {
    //   this.x += this.speed;
    // }
    // if(this.moveLeft) {
    //   this.x -= this.speed;
    // }
    if(this.moveUp && this.y > this.minY) {
      this.y -= this.speed;
      if(this.y < this.minY) {
        this.y = this.minY;
      }
    }
    if(this.moveDown && this.y < this.maxY) {
      this.y += this.speed;
      if(this.y > this.maxY) {
        this.y = this.maxY;
      }
    }
    this.setPosition();
  }
};

Player.list = {};

Player.onconnect = function(socket, username) {
  var player = new Player(socket, username, false);
  Player.list[player.id] = player;
  gameServer.findGame(player);

  socket.on('keyPress', function(data) {
    // if(data.inputId === 'left') {
    //   player.moveLeft = data.state;
    // } else if(data.inputId === 'right') {
    //   player.moveRight = data.state;
    // } else
    if(data.inputId === 'up') {
      player.moveUp = data.state;
    } else if(data.inputId === 'down') {
      player.moveDown = data.state;
    }
  });

  socket.on('sendMessage', function(data) {
    var room = gameServer.rooms[player.roomId];
    for(var i in room.players) {
      var socket = SOCKET_LIST[room.players[i].id];
      socket.emit('addToChat', player.username + ": " + data);
    }
  });
}

Player.onDisconnect = function(socket) {
  socket.emit('playerDisconnect');
  var player = Player.list[socket.id];
  if(player) {
    var room = gameServer.rooms[player.roomId];
    delete room.players[player.localId];
    room.playerCount--;
    if(room.playerCount <= 0) {
      delete gameServer.rooms[player.roomId];
      gameServer.roomCount--;
    } else {
      room.createAI();
      room.removePack.push(player.id);
    }
    delete Player.list[socket.id];
  }
}



///////////////////////////
//       SOCKET IO       //
///////////////////////////

var DEBUG = true;

io.sockets.on('connection', function(socket) {
  socket.id = random(1, 1000000000);
  SOCKET_LIST[socket.id] = socket;

  socket.emit('onconnected', { id: socket.id });

  socket.on('newPlayer', function(data) {
    Player.onconnect(socket, data);
  })

  console.log(":: SOCKET.IO :: player " + socket.id + " connected");

  socket.on('disconnect', function() {
    console.log(":: SOCKET.IO :: player " + socket.id + " disconnected");
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  socket.on('evalServer', function(data) {
    if(!DEBUG) {
      return;
    }

    var res = eval(data);
    socket.emit('evalAnswer', res);
  });
})

setInterval(function() {
  gameServer.updateRooms();
}, 1000/60);



///////////////////////////
//        HELPERS        //
///////////////////////////

random = function(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

randomChoice = function() {
  return arguments[this.random(0, arguments.length)];
}
