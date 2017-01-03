var socket;

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var c = document.getElementById('ctx');
var ctx = c.getContext('2d');
//c.width = screenWidth; c.height = screenHeight



///////////////////////////
//      START GAME       //
///////////////////////////

var startGame = function() {
  var playerNameInput = document.getElementById('playerNameInput');
  var playerName = playerNameInput.value;

  document.getElementById('gameAreaWrapper').style.display = 'block';
  document.getElementById('startMenuWrapper').style.display = 'none';

  socket = io();

  socket.emit('newPlayer', playerName);

  onSocket(socket);
  animloop();
}

var validNickname = function() {
  var regex = /^\w*$/;
  console.log('Regex Test', regex.exec(playerNameInput.value));
  return regex.exec(playerNameInput.value) !== null;
}

window.onload = function() {
  var startForm = document.getElementById('start-form');
  var btn = document.getElementById('startButton');
  var errorText = document.getElementById('input-error');

  startForm.onsubmit = function(e) {
    e.preventDefault();
    if(validNickname()) {
      startGame();
    } else {
      errorText.style.display = 'inline';
    }
  }
}



///////////////////////////
//        SOCKET         //
///////////////////////////

var onSocket = function(socket) {
  socket.on('onconnected', function(data) {
    console.log("Your id is: " + data.id);
  });

  socket.on('playerDisconnect', function() {
    socket.close();
  });

  socket.on('addToChat', function(data) {
    //chatText.innerHTML+= '<div>' + data + '</div>';
    Materialize.toast(data, 4000);
  });

  socket.on('evalAnswer', function(data) {
    console.log(data);
  });

  socket.on('init', function(data) {
    for(var i in data.players) {
      new Player(data.players[i]);
    }
    for(var i in data.balls) {
      new Ball(data.balls[i]);
    }
  });

  socket.on('update', function(data) {
      for(var i in data.players) {
      var pack = data.players[i];
      var p = Player.list[pack.id];
      if(p) {
        if(pack.x !== undefined) {
          p.x = pack.x;
        }
        if(pack.y !== undefined) {
          p.y = pack.y;
        }
        if(p.isAI && data.predictX) {
          p.predictX = pack.predictX;
          p.predictY = pack.predictY;
        }
      }
    }
    for(var i in data.balls) {
      var pack = data.balls[i];
      var b = Ball.list[pack.id];
      if(b) {
        if(pack.x !== undefined) {
          b.x = pack.x;
        }
        if(pack.y !== undefined) {
          b.y = pack.y;
        }
      }
    }
  });

  socket.on('remove', function(data) {
    for(var i in data) {
      delete Player.list[data[i]];
    }
  });

  socket.on('court', function(data) {
    COURT.wallWidth = data.wallWidth;
    COURT.walls = data.walls;
    COURT.scores = data.scores;
  });

  socket.on('scored', function(data) {
    Player.list[data].score++;
  });
}



///////////////////////////
//         CHAT          //
///////////////////////////

var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');

chatForm.onsubmit = function(e) {
  e.preventDefault();
  if(chatInput.value[0] === '/') {
    socket.emit('evalServer', chatInput.value.slice(1));
  } else {
    socket.emit('sendMessage', chatInput.value);
  }
  chatInput.value = '';
}



///////////////////////////
//         GAME          //
///////////////////////////

var Player = function(initPack) {
  this.isAI = initPack.isAI;
  this.id = initPack.id;
  this.localId = initPack.localId;
  this.username = initPack.username;
  this.x = initPack.x;
  this.y = initPack.y;
  this.width = initPack.width;
  this.height = initPack.height;
  this.color = initPack.color;
  this.score = initPack.score;

  Player.list[this.id] = this;
}

Player.list = {};

var COURT = {
  walls: {},
  scores: {}
};

var DIGITS = [
  [1, 1, 1, 0, 1, 1, 1], // 0
  [0, 0, 1, 0, 0, 1, 0], // 1
  [1, 0, 1, 1, 1, 0, 1], // 2
  [1, 0, 1, 1, 0, 1, 1], // 3
  [0, 1, 1, 1, 0, 1, 0], // 4
  [1, 1, 0, 1, 0, 1, 1], // 5
  [1, 1, 0, 1, 1, 1, 1], // 6
  [1, 0, 1, 0, 0, 1, 0], // 7
  [1, 1, 1, 1, 1, 1, 1], // 8
  [1, 1, 1, 1, 0, 1, 0]  // 9
]

var Ball = function(initPack) {
  this.id = initPack.id;
  this.radius = initPack.radius;
  this.x = initPack.x;
  this.y = initPack.y;
  this.color = initPack.color;

  Ball.list[this.id] = this;
}

Ball.list = {};



///////////////////////////
//        DRAWING        //
///////////////////////////

var drawWalls = function() {
  ctx.fillStyle = 'white';
  for(var n in COURT.walls) {
    ctx.fillRect(COURT.walls[n].x, COURT.walls[n].y, COURT.walls[n].width, COURT.walls[n].height);
  }
}

// var drawScores = function() {
//   ctx.fillStyle = 'white';
//   var dw = dh = COURT.wallWidth;
//   for(var i in Player.list) {
//     var p = Player.list[i];
//     var blocks = DIGITS[p.score];
//     var coord = COURT.scores[p.localId-1];
//     if (blocks[0])
//       ctx.fillRect(coord.x, coord.y, coord.w, dh);
//     if (blocks[1])
//       ctx.fillRect(coord.x, coord.y, dw, coord.h/2);
//     if (blocks[2])
//       ctx.fillRect(coord.x+coord.w-dw, coord.y, dw, coord.h/2);
//     if (blocks[3])
//       ctx.fillRect(coord.x, coord.y + coord.h/2 - dh/2, coord.w, dh);
//     if (blocks[4])
//       ctx.fillRect(coord.x, coord.y + coord.h/2, dw, coord.h/2);
//     if (blocks[5])
//       ctx.fillRect(coord.x+coord.w-dw, coord.y + coord.h/2, dw, coord.h/2);
//     if (blocks[6])
//       ctx.fillRect(coord.x, coord.y+coord.h-dh, coord.w, dh);
//   }
//   var dw = dh = this.ww*4/5;
// }

var drawPlayers = function() {
  for(var i in Player.list) {
    var p = Player.list[i];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    if(p.predictX && p.predictY) {
      ctx.fillStyle = 'red';
      ctx.fillRect(p.predictX, p.predictY, 5, 5);
    }
  }
}

var drawBalls = function() {
  for(var i in Ball.list) {
    var b = Ball.list[i];
    var w = h = b.radius * 2;
    ctx.fillStyle = b.color;
    // ctx.beginPath();
    // ctx.arc(b.x, b.y, b.radius, 0, 2*Math.PI, true);
    // ctx.fill();
    // ctx.closePath();
    ctx.fillRect(b.x - b.radius, b.y - b.radius, w, h);
  }
}

window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function( callback ) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function animloop() {
  requestAnimFrame(animloop);
  gameLoop();
}

function gameLoop() {
  document.onkeydown = function(event) {
    // if(event.keyCode === 68) { //d
    //   socket.emit('keyPress', { inputId: 'right', state: true });
    // } else
    if(event.keyCode === 83) { //s
      socket.emit('keyPress', { inputId: 'down', state: true });
    // } else if(event.keyCode === 81) { //q
    //   socket.emit('keyPress', { inputId: 'left', state: true });
    } else if(event.keyCode === 90) { //z
      socket.emit('keyPress', { inputId: 'up', state: true });
    }
  }

  document.onkeyup = function(event) {
    // if(event.keyCode === 68) { //d
    //   socket.emit('keyPress', { inputId: 'right', state: false });
    // } else
    if(event.keyCode === 83) { //s
      socket.emit('keyPress', { inputId: 'down', state: false });
    // } else if(event.keyCode === 81) { //q
    //   socket.emit('keyPress', { inputId: 'left', state: false });
    } else if(event.keyCode === 90) { //z
      socket.emit('keyPress', { inputId: 'up', state: false });
    }
  }

  ctx.clearRect(0,0,640,480);
  drawWalls();
  //drawScores();
  drawPlayers();
  drawBalls();
}
