var socket;

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var c = document.getElementById('ctx');
var ctx = c.getContext('2d');
ctx.translate(400, 400);
c.style.marginLeft = ((screenWidth-800)/2) + "px";
//c.width = screenWidth; c.height = screenHeight

var ID;
var ROTATED = false;

var Img = {};
Img.player = new Image();
Img.player.src = '/client/img/player.png';

var leaderboard = document.getElementById('leaderboard');


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
        if(pack.position !== undefined) {
          p.position = pack.position;
        }
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
    MAP.playerY = data.playerY;
    MAP.walls = data.walls;
    MAP.goals = data.goals;
  });

  socket.on('scored', function(data) {
    Player.list[data].score++;
  });
}



intercept = function(x1, y1, x2, y2, x3, y3, x4, y4, debug) { // fonction pour calculer si il y une interception
  // Fonction pour calculer l'intersection de deux segments de lignes (fait à partir d'un formule mathématique, retrouvable sur wikipedia, ...)
  var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
  if(denom != 0) {
    var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
    if((ua >= 0) && (ua <= 1)) {
      var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
      if((ub >= 0) && (ub <= 1)) {

        //console.log("(" + x1 + ", " + y1 +") (" + x2 + ", " + y2 +") (" + x3 + ", " + y3 +") (" + x4 + ", " + y4 +")");
        var x = x1 + (ua * (x2-x1));
        var y = y1 + (ua * (y2-y1));

        if(ua == 0) {
          var o = Math.abs(((y4-y3) * x2) - ((x4 - x3) * y2) + (x4*y3) - (y4*x3)) / Math.sqrt(Math.pow((y4-y3), 2) + Math.pow((x4-x3), 2));
          var h = Math.sqrt(Math.pow((y-y2), 2) + Math.pow((x-x2), 2));
        } else {
          var o = Math.abs(((y4-y3) * x1) - ((x4 - x3) * y1) + (x4*y3) - (y4*x3)) / Math.sqrt(Math.pow((y4-y3), 2) + Math.pow((x4-x3), 2));
          var h = Math.sqrt(Math.pow((y-y1), 2) + Math.pow((x-x1), 2));
        }

        var angle = Math.asin(o/h) * 180 / Math.PI;

        var d1 = Math.sqrt(Math.pow(x3-x1, 2) + Math.pow(y3-y1, 2));
        var d2 = Math.sqrt(Math.pow(x3-x, 2) + Math.pow(y3-y, 2));

        if(d1 > d2) {
          angle = 180 - angle;
        }

        if(angle > 180) {
          console.log("FUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCK");
        }

        //console.log("intercept angle: " + angle);

        return { x: x, y: y, angle: angle};
      }
    }
  }
  return null;
} // fin intercept



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
  this.angle = initPack.angle;

  if(!ROTATED && this.id == ID) {
    ctx.rotate(-this.angle / 180 * Math.PI + (Math.PI/2));
    ROTATED = true;
  }

  this.position = initPack.position;
  this.x = initPack.x;
  this.y = initPack.y;
  this.x1 = initPack.x1;
  this.y1 = initPack.y1;
  this.x2 = initPack.x2;
  this.y2 = initPack.y2;
  this.width = initPack.width;
  this.height = initPack.height;
  this.length = initPack.length;
  this.color = initPack.color;
  this.score = initPack.score;

  var h5 = document.createElement("h5");
  h5.id = "player" + this.id;
  h5.innerHTML = this.username + "   " + this.score;
  leaderboard.appendChild(h5);

  Player.list[this.id] = this;
  Player.idList[this.localId] = this.id;
}

Player.list = {};
Player.idList = {};

var MAP = {
  walls: {},
  goals: {}
};

var Ball = function(initPack) {
  this.id = initPack.id;
  this.radius = initPack.radius;
  this.x = initPack.x;
  this.y = initPack.y;
  this.speed = initPack.speed;
  this.accel = initPack.accel;
  this.spdX = initPack.spdX;
  this.spdY = initPack.spdY;
  this.color = initPack.color;

  this.update = function() {
    var newPos = this.accelerate();
    var item, foundIntercept, goal, rotation, id;
    var isPlayer = false;
    foundIntercept = this.findIntercept(newPos, false);
    if(!foundIntercept) {
      goal = this.findGoal(newPos);
    }

    this.speed = newPos.speed;
    this.spdX = newPos.spdX;
    this.spdY = newPos.spdY;

    if(goal) {
      // if(forAI) {
      //   return {id: goal.id, x: goal.x, y: goal.y};
      // }
      this.reset();
    }

    if(foundIntercept) {
      this.changeCours(foundIntercept);
    }

    this.x += this.spdX;
    this.y += this.spdY;

    //this.setSides();
  }

  this.findIntercept = function(newPos, debug) {
    var foundIntercept;
    for(var i in Player.list) {
      if(!foundIntercept) {
        p = Player.list[i];
        foundIntercept = intercept(this.x, this.y, newPos.dx, newPos.dy, p.x1, p.y1, p.x2, p.y2, debug);
        if(foundIntercept) {
          foundIntercept.rotation = p.rotation;
          foundIntercept.isPlayer = true;
          foundIntercept.id = p.id;
        }
      }
    }
    if(!foundIntercept) {
      for(var i in MAP.walls) {
        if(!foundIntercept) {
          w = MAP.walls[i];
          //foundIntercept = this.ballIntercept(w, newPos.dx, newPos.dy, true);
          foundIntercept = intercept(this.x, this.y, newPos.x, newPos.y, w.x1, w.y1, w.x2, w.y2, debug);
          if(foundIntercept) {
            foundIntercept.rotation = w.rotation;
          }
        }
      }
    }
    return foundIntercept;
  }

  this.changeCours = function(foundIntercept) {
    this.x = foundIntercept.x;
    this.y = foundIntercept.y;
    if(foundIntercept.isPlayer) {
      var p = Player.list[foundIntercept.id];
      var d = Math.sqrt(Math.pow(foundIntercept.x-p.x, 2) + Math.pow(foundIntercept.y-p.y, 2));
      var d2 = Math.sqrt(Math.pow(foundIntercept.x-p.x1, 2) + Math.pow(foundIntercept.y-p.y1, 2));
      var perc = d/p.width;
      var angle = 60 * perc;
      if(d2 < p.width) {
        angle *= -1;
      }
      this.spdX = Math.cos((90 + angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
      this.spdY = Math.sin((90 + angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
    } else {
      this.spdX = Math.cos((foundIntercept.angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
      this.spdY = Math.sin((foundIntercept.angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
    }
  }

  this.findGoal = function(newPos) {
    var goal
    for(var i in MAP.goals) {
      if(!goal) {
        g = MAP.goals[i];
        goal = intercept(this.x, this.y, newPos.x, newPos.y, g.x1, g.y1, g.x2, g.y2, true);
        if(goal) {
          goal.id = MAP.goals[i].localId;
        }
      }
    }
    return goal;
  }

  this.reset = function() {
    this.x = 0;
    this.y = 0;
    this.speed = 6;
    //var a = random(0, 360);
    // this.spdX = Math.cos(a / 180 * Math.PI) * this.speed;
    // this.spdY = Math.sin(a / 180 * Math.PI) * this.speed;
    //this.setSides();
  }

  this.accelerate = function() {
    var accel = 1 + (this.accel * 1/60 * 1/60 * 0.5);
    var speed = this.speed * accel;
    var spdX2 = this.spdX * accel;
    var spdY2 = this.spdY * accel;
    var x2  = this.x + spdX2;
    var y2  = this.y + spdY2;
    return { dx: (x2-this.x), dy: (y2-this.y), x: x2, y: y2, speed: speed, spdX: spdX2, spdY: spdY2 };
  }

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
    var angle = (p.angle-90) * Math.PI / 180;
    //var angle = (-p.angle / 180 * Math.PI) + (Math.PI/2);
    ctx.rotate(angle);
    var x = p.position - p.length/2;
    var y = MAP.playerY;
    ctx.drawImage(Img.player,
      0, 0, Img.player.width, Img.player.height,
      x-p.width, y, p.width*2, 15);

    ctx.rotate(-angle);

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
  for(var i in Ball.list) {
    Ball.list[i].update();
  }
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
