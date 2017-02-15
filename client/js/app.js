var socket;

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var c = document.getElementById('ctx');
var ctx = c.getContext('2d');
ctx.translate(400, 400);
//c.width = screenWidth; c.height = screenHeight

var ID;
var ROTATED = false;


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
    ID = data.id;
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
        if(pack.x1 !== undefined) {
          p.x1 = pack.x1;
        }
        if(pack.y1 !== undefined) {
          p.y1 = pack.y1;
        }
        if(pack.x2 !== undefined) {
          p.x2 = pack.x2;
        }
        if(pack.y2 !== undefined) {
          p.y2 = pack.y2;
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

  socket.on('map', function(data) {
    MAP.wallWidth = data.ww;
    MAP.walls = data.walls;
    MAP.goals = data.goals;
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
  this.rotation = initPack.rotation;

  if(!ROTATED && this.id == ID) {
    //console.log(ID);
    ctx.rotate(-this.rotation / 180 * Math.PI + (Math.PI/2));
    console.log(this.rotation);
    ROTATED = true;
  }

  this.x = initPack.x;
  this.y = initPack.y;
  this.x1 = initPack.x1;
  this.y1 = initPack.y1;
  this.x2 = initPack.x2;
  this.y2 = initPack.y2;
  this.width = initPack.width;
  this.height = initPack.height;
  this.color = initPack.color;
  this.score = initPack.score;

  Player.list[this.id] = this;
}

Player.list = {};

var MAP = {
  walls: {},
  goals: {}
};

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
  ctx.strokeStyle = 'black';
  //ctx.fillStyle = 'white';
  for(var i in MAP.walls) {
    // ctx.fillRect(MAP.walls[n].x1, MAP.walls[n].y1, MAP.walls[n].width, MAP.walls[n].height);
    var w = MAP.walls[i];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillRect(0, 0, 10, 10);
}

var drawGoals = function() {
  ctx.strokeStyle = 'red';
  for(var i in MAP.goals) {
    var g = MAP.goals[i];
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.closePath;
    ctx.stroke();
  }
}

var drawPlayers = function() {
  ctx.strokeStyle = "green";
  for(var i in Player.list) {
    var p = Player.list[i];
    //ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.beginPath();
    ctx.moveTo(p.x1, p.y1);
    ctx.lineTo(p.x2, p.y2);
    ctx.closePath();
    ctx.stroke();
  }
}

var drawBalls = function() {
  for(var i in Ball.list) {
    var b = Ball.list[i];
    var w = h = b.radius * 2;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, 2*Math.PI, true);
    ctx.fill();
    ctx.closePath();
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
  ctx.clearRect(-600, -600, 1200, 1200);
  drawWalls();
  drawGoals();
  drawPlayers();
  drawBalls();
}

document.onkeydown = function(event) {
  if(event.keyCode === 81) {
    socket.emit('keyPress', { inputId: 'left', state: true});
  } else if(event.keyCode === 83) {
    socket.emit('keyPress', { inputId: 'right', state: true});
  }

  // if(event.keyCode === 68) { //d
  //   socket.emit('keyPress', { inputId: 'right', state: true });
  // } else
  // if(event.keyCode === 83) { //s
  //   socket.emit('keyPress', { inputId: 'down', state: true });
  // } else if(event.keyCode === 81) { //q
  //   socket.emit('keyPress', { inputId: 'left', state: true });
  // } else if(event.keyCode === 90) { //z
  //   socket.emit('keyPress', { inputId: 'up', state: true });
  // }
}

document.onkeyup = function(event) {
  if(event.keyCode === 81) {
    socket.emit('keyPress', { inputId: 'left', state: false});
  } else if(event.keyCode === 83) {
    socket.emit('keyPress', { inputId: 'right', state: false});
  }

  // if(event.keyCode === 68) { //d
  //   socket.emit('keyPress', { inputId: 'right', state: false });
  // } else
  // if(event.keyCode === 83) { //s
  //   socket.emit('keyPress', { inputId: 'down', state: false });
  // } else if(event.keyCode === 81) { //q
  //   socket.emit('keyPress', { inputId: 'left', state: false });
  // } else if(event.keyCode === 90) { //z
  //   socket.emit('keyPress', { inputId: 'up', state: false });
  // }
}
