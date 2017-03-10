var socket;

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var c = document.getElementById('ctx');
var ctx = c.getContext('2d');
ctx.translate(400, 400);
c.style.height = screenHeight + "px";
c.style.width = screenHeight + "px";
c.style.marginLeft = ((screenWidth-screenHeight)/2) + "px";
//c.width = screenWidth; c.height = screenHeight

var s = document.getElementById('start');
s.style.marginTop = ((screenHeight-500)/2) + "px";

var chat = document.getElementById('chat');
chat.style.height = screenHeight + "px";

var list = document.getElementsByName("colors");

var ID;
var ROTATED = false;
var FOCUSED = false;
var stopParticles = false;

var Img = {};
Img.player = new Image();
Img.player.src = '/client/img/player.png';

var leaderboard = document.getElementById('leaderboard');

var particles;


///////////////////////////
//      START GAME       //
///////////////////////////

random = function(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

var Color = function(id, name, hexValue) {
  this.id = id;
  this.name = name;
  this.hexValue = hexValue;
  return this;
}

var COLORS = [
  new Color(1, "red", "#f44336"),            // 1
  new Color(2, "pink", "#e91e63"),           // 2
  new Color(3, "purple", "#9c27b0"),         // 3
  new Color(4, "deep-purple", "#673ab7"),    // 4
  new Color(5, "indigo", "#3f51b5"),         // 5
  new Color(6, "blue", "#2196f3"),           // 6
  new Color(7, "light-blue", "#03a9f4"),     // 7
  new Color(8, "cyan", "#00bcd4"),           // 8
  new Color(9, "teal", "#009688"),           // 9
  new Color(10, "green", "#4caf50"),          // 10
  new Color(11, "light-green", "#8bc34a"),    // 11
  new Color(12, "lime", "#cddc39"),           // 12
  new Color(13, "yellow", "#ffeb3b"),         // 13
  new Color(14, "amber", "#ffc107"),          // 14
  new Color(15, "orange", "#ff9800"),         // 15
  new Color(16, "deep-orange", "#ff5722")     // 16
];

var color = COLORS[random(0, COLORS.length)];

var startGame = function() {
  var playerNameInput = document.getElementById('playerNameInput');
  var playerName = playerNameInput.value;

  document.getElementById('gameAreaWrapper').style.display = 'block';
  document.getElementById('startMenuWrapper').style.display = 'none';

  socket = io();

  socket.emit('newPlayer', { username: playerName, color: color.hexValue });

  onSocket(socket);
  animloop();
}

var validNickname = function() {
  var regex = /^\w*$/;
  console.log('Regex Test', regex.exec(playerNameInput.value));
  return regex.exec(playerNameInput.value) !== null;
}

startParticleSystem = function() {
  particlesJS('particles-js',
  {
    "particles": {
      "number": {
        "value": 80,
        "density": {
          "enable": true,
          "value_area": 800
        }
      },
      "color": {
        "value": color.hexValue
      },
      "shape": {
        "type": "circle",
        "stroke": {
          "width": 0,
          "color": "#000000"
        },
        "polygon": {
          "nb_sides": 3
        },
        "image": {
          "src": "img/github.svg",
          "width": 100,
          "height": 100
        }
      },
      "opacity": {
        "value": 1,
        "random": false,
        "anim": {
          "enable": false,
          "speed": 0.48724632738080703,
          "opacity_min": 1,
          "sync": false
        }
      },
      "size": {
        "value": 5,
        "random": true,
        "anim": {
          "enable": false,
          "speed": 40,
          "size_min": 0.1,
          "sync": false
        }
      },
      "line_linked": {
        "enable": true,
        "distance": 200,
        "color": "#777",
        "opacity": 1,
        "width": 1
      },
      "move": {
        "enable": true,
        "speed": 4,
        "direction": "none",
        "random": false,
        "straight": false,
        "out_mode": "out",
        "bounce": false,
        "attract": {
          "enable": false,
          "rotateX": 600,
          "rotateY": 1200
        }
      }
    },
    "interactivity": {
      "detect_on": "canvas",
      "events": {
        "onhover": {
          "enable": true,
          "mode": "grab"
        },
        "onclick": {
          "enable": false,
          "mode": "push"
        },
        "resize": true
      },
      "modes": {
        "grab": {
          "distance": 200,
          "line_linked": {
            "opacity": 1
          }
        },
        "bubble": {
          "distance": 400,
          "size": 40,
          "duration": 2,
          "opacity": 8,
          "speed": 3
        },
        "repulse": {
          "distance": 200,
          "duration": 0.4
        },
        "push": {
          "particles_nb": 4
        },
        "remove": {
          "particles_nb": 2
        }
      }
    },
    "retina_detect": true
  });
}

window.onload = function() {
  //startParticleSystem();
  var startForm = document.getElementById('start-form');
  var btn = document.getElementById('startButton');
  var errorText = document.getElementById('input-error');
  var input = document.getElementById('playerNameInput');
  //input.style.borderBottom = "2px solid " + color.hexValue;
  // var circle = document.getElementById('circle');
  // circle.style.background = color.hexValue;
  list[color.id-1].checked = true;

  startForm.onsubmit = function(e) {
    e.preventDefault();
    if(validNickname()) {
      // window.pJSDom = [];
      // var m = document.getElementById('startMenuWrapper');
      // var p = document.getElementById('particles-js');
      // m.removeChild(p);
      // stopParticles = true;
      startGame();
    } else {
      errorText.style.color = 'red';
    }
  }
}

changePlayerColor = function(id) {
  color = COLORS[id-1];
  // var input = document.getElementById('playerNameInput');
  // input.style.borderBottom = "2px solid " + color.hexValue;
  // var circle = document.getElementById('circle');
  // circle.style.background = color.hexValue;
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
    //Materialize.toast(data, 4000);
    var message = document.createElement('div');
    message.innerHTML = data.msg;
    if(data.id == ID) {
      message.className = "message message-personal new";
    } else {
      message.className = "message new"
      var avatar = document.createElement('div');
      avatar.className = "avatar";
      avatar.style.background = Player.list[data.id].color;
      message.appendChild(avatar);;
    }
    //$('<div class="message message-personal">' + msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
    chatContent.appendChild(message);
  });

  socket.on('evalAnswer', function(data) {
    console.log(data);
  });

  socket.on('init', function(data) {
    for(var i in data.players) {
      if(!Player.list[data.players[i].id]) {
        new Player(data.players[i]);
      }
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
        p.position = pack.position;
        p.x = pack.x;
        p.y = pack.y;
        if(pack.destination !== undefined) {
          p.destination = pack.destination;
        }
        if(pack.moveLeft !== undefined) {
          p.moveLeft = pack.moveLeft;
        }
        if(pack.moveRight !== undefined) {
          p.moveRight = pack.moveRight;
        }
        p.setSides();
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
        if(pack.spdX !== undefined) {
          b.spdX = pack.spdX;
        }
        if(pack.spdY !== undefined) {
          b.spdY = pack.spdY;
        }
        if(pack.color !== undefined) {
          b.color = pack.color;
        }
      }
    }
  });

  socket.on('remove', function(data) {
    for(var i in data) {
      var s = "player" + data[i];
      var e = document.getElementById(s);
      if(e) {
        leaderboard.removeChild(e);
      }
      delete Player.list[data[i]];
    }
  });

  socket.on('map', function(data) {
    MAP.playerY = data.playerY;
    MAP.walls = data.walls;
    MAP.goals = data.goals;
  });

  socket.on('scored', function(data) {
    var p = Player.list[data.id];
    p.score = data.score;
    var s = "player" + p.id;
    var e = document.getElementById(s);
    e.innerHTML = p.username + " " + p.score;
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

var chatContent = document.getElementById('messages-content');
var chatInput = document.getElementById('message-input');
var chatForm = document.getElementById('message-form');

chatForm.onsubmit = function(e) {
  e.preventDefault();
  sendMessage();
}

sendMessage = function() {
  if(chatInput.value != "" && chatInput.value != "\n") {
    console.log(chatInput.value);
    if(chatInput.value[0] === '/') {
      socket.emit('evalServer', chatInput.value.slice(1));
    } else {
      socket.emit('sendMessage', { id: ID, msg: chatInput.value });
    }
  }
  chatInput.value = '';
  chatInput.reset();
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
  h5.style.color = this.color;
  h5.innerHTML = this.username + " " + this.score;
  leaderboard.appendChild(h5);

  this.setSides = function() {
    var x = Math.cos(this.rotation / 180 * Math.PI) * this.width;
    var y = Math.sin(this.rotation / 180 * Math.PI) * this.width;
    this.x1 = this.x + x;
    this.y1 = this.y + y;
    x *= -1;
    y *= -1;
    this.x2 = this.x + x;
    this.y2 = this.y + y;
  }

  this.update = function() {
    if(this.isAI && this.destination) {
      if(Math.abs(this.destination - this.position) > 20 || this.position < this.width+this.speed || this.position > this.length-this.width-this.speed) {
        if (this.destination < this.position) {
          this.moveLeft = true;
          this.moveRight = false;
        } else if(this.destination > this.position) {
          this.moveLeft = false;
          this.moveRight = true;
        }
      } else {
        this.moveLeft = false;
        this.moveRight = false;
        this.destination = undefined;
        this.distance = 1001;
      }
    }

    if(this.moveLeft && this.position > this.width+this.speed) {
      var x = (Math.sqrt(4 * Math.pow(this.speed, 2) * (1 + Math.pow(this.goal.a, 2)))) / (2 * (1 + Math.pow(this.goal.a, 2)));
      if(this.angle < 180) {
        x *= -1;
      }
      var y = this.goal.a * x;
      this.x += x;
      this.y += y;
      this.position -= this.speed;
    } else if(this.moveRight && this.position < this.length-this.width-this.speed) {
      var x = (Math.sqrt(4 * Math.pow(this.speed, 2) * (1 + Math.pow(this.goal.a, 2)))) / (2 * (1 + Math.pow(this.goal.a, 2)));
      if(this.angle > 180) {
        x *= -1;
      }
      var y = this.goal.a * x;
      this.x += x;
      this.y += y;
      this.position += this.speed;
    }
    this.setSides();
  }

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
    this.color = "#000";
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
    ctx.fillStyle = p.color;
    var angle = (p.angle-90) * Math.PI / 180;
    //var angle = (-p.angle / 180 * Math.PI) + (Math.PI/2);
    ctx.rotate(angle);
    var x = p.position - p.length/2;
    var y = MAP.playerY;
    // ctx.drawImage(Img.player,
    //   0, 0, Img.player.width, Img.player.height,
    //   x-p.width, y, p.width*2, 15);
    ctx.fillRect(x-p.width, y, p.width*2, 15);
    ctx.rotate(-angle);

    // ctx.beginPath();
    // ctx.moveTo(p.x1, p.y1);
    // ctx.lineTo(p.x2, p.y2);
    // ctx.closePath();
    // ctx.stroke();
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

var drawLines = function(p1, p2){
  var dx = Math.abs(p1.x - p2.x);
  var dy = Math.abs(p1.y - p2.y);
  var dist = Math.sqrt(dx*dx + dy*dy);
  /* draw a line between p1 and p2 if the distance between them is under the config distance */
  if(dist <= 300){
    var opacity_line = 1 - (dist / 300);
    if(opacity_line > 0){
      /* style */
      //ctx.strokeStyle = "#777";
      ctx.strokeStyle = 'rgba(111,111,111,' + opacity_line + ')';
      ctx.lineWidth = 1;
      //pJS.canvas.ctx.lineCap = 'round'; /* performance issue */
      /* path */
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.closePath();
    }
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
  for(var i in Player.list) {
    Player.list[i].update();
  }
  ctx.clearRect(-600, -600, 1200, 1200);
  drawWalls();
  drawGoals();
  drawPlayers();
  drawBalls();
  for(var i in Ball.list) {
    var p1 = Ball.list[i];
    for(var j in Ball.list) {
      if(j != i) {
        var p2 = Ball.list[j];
        drawLines(p1, p2);
      }
    }
    for(var j in Player.list) {
      var p2 = Player.list[j];
      drawLines(p1, p2);
    }
  }
}

document.onkeydown = function(event) {
  if(event.keyCode === 81) {
    Player.list[ID].moveLeft = true;
    Player.list[ID].moveRight = false;
    socket.emit('keyPress', { inputId: 'left', state: true});
  } else if(event.keyCode === 83) {
    Player.list[ID].moveLeft = false;
    Player.list[ID].moveRight = true;
    socket.emit('keyPress', { inputId: 'right', state: true});
  } else if(event.keyCode == 84) {
    if(!FOCUSED) {
      chatInput.focus();
      chatInput.value = "";
      FOCUSED = true;
    }
  } else if(event.keyCode == 13) {
    //chatForm.submit();
    sendMessage();
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
    Player.list[ID].moveLeft = false;
    Player.list[ID].moveRight = false;
    socket.emit('keyPress', { inputId: 'left', state: false});
  } else if(event.keyCode === 83) {
    Player.list[ID].moveLeft = false;
    Player.list[ID].moveRight = false;
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

/* -----------------------------------------------
/* Author : Vincent Garreau  - vincentgarreau.com
/* MIT license: http://opensource.org/licenses/MIT
/* Demo / Generator : vincentgarreau.com/particles.js
/* GitHub : github.com/VincentGarreau/particles.js
/* How to use? : Check the GitHub README
/* v2.0.0
/* ----------------------------------------------- */

var pJS = function(tag_id, params){

  var canvas_el = document.querySelector('#'+tag_id+' > .particles-js-canvas-el');

  /* particles.js variables with default values */
  this.pJS = {
    canvas: {
      el: canvas_el,
      w: canvas_el.offsetWidth,
      h: canvas_el.offsetHeight
    },
    particles: {
      number: {
        value: 400,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: '#fff'
      },
      shape: {
        type: 'circle',
        stroke: {
          width: 0,
          color: '#ff0000'
        },
        polygon: {
          nb_sides: 5
        },
        image: {
          src: '',
          width: 100,
          height: 100
        }
      },
      opacity: {
        value: 1,
        random: false,
        anim: {
          enable: false,
          speed: 2,
          opacity_min: 0,
          sync: false
        }
      },
      size: {
        value: 20,
        random: false,
        anim: {
          enable: false,
          speed: 20,
          size_min: 0,
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 100,
        color: '#fff',
        opacity: 1,
        width: 1
      },
      move: {
        enable: true,
        speed: 2,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false,
        attract: {
          enable: false,
          rotateX: 3000,
          rotateY: 3000
        }
      },
      array: []
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: 'grab'
        },
        onclick: {
          enable: true,
          mode: 'push'
        },
        resize: true
      },
      modes: {
        grab:{
          distance: 100,
          line_linked:{
            opacity: 1
          }
        },
        bubble:{
          distance: 200,
          size: 80,
          duration: 0.4
        },
        repulse:{
          distance: 200,
          duration: 0.4
        },
        push:{
          particles_nb: 4
        },
        remove:{
          particles_nb: 2
        }
      },
      mouse:{}
    },
    retina_detect: false,
    fn: {
      interact: {},
      modes: {},
      vendors:{}
    },
    tmp: {}
  };

  var pJS = this.pJS;
  particles = this.pJS;

  /* params settings */
  if(params){
    Object.deepExtend(pJS, params);
  }

  pJS.tmp.obj = {
    size_value: pJS.particles.size.value,
    size_anim_speed: pJS.particles.size.anim.speed,
    move_speed: pJS.particles.move.speed,
    line_linked_distance: pJS.particles.line_linked.distance,
    line_linked_width: pJS.particles.line_linked.width,
    mode_grab_distance: pJS.interactivity.modes.grab.distance,
    mode_bubble_distance: pJS.interactivity.modes.bubble.distance,
    mode_bubble_size: pJS.interactivity.modes.bubble.size,
    mode_repulse_distance: pJS.interactivity.modes.repulse.distance
  };


  pJS.fn.retinaInit = function(){

    if(pJS.retina_detect && window.devicePixelRatio > 1){
      pJS.canvas.pxratio = window.devicePixelRatio;
      pJS.tmp.retina = true;
    }
    else{
      pJS.canvas.pxratio = 1;
      pJS.tmp.retina = false;
    }

    pJS.canvas.w = pJS.canvas.el.offsetWidth * pJS.canvas.pxratio;
    pJS.canvas.h = pJS.canvas.el.offsetHeight * pJS.canvas.pxratio;

    pJS.particles.size.value = pJS.tmp.obj.size_value * pJS.canvas.pxratio;
    pJS.particles.size.anim.speed = pJS.tmp.obj.size_anim_speed * pJS.canvas.pxratio;
    pJS.particles.move.speed = pJS.tmp.obj.move_speed * pJS.canvas.pxratio;
    pJS.particles.line_linked.distance = pJS.tmp.obj.line_linked_distance * pJS.canvas.pxratio;
    pJS.interactivity.modes.grab.distance = pJS.tmp.obj.mode_grab_distance * pJS.canvas.pxratio;
    pJS.interactivity.modes.bubble.distance = pJS.tmp.obj.mode_bubble_distance * pJS.canvas.pxratio;
    pJS.particles.line_linked.width = pJS.tmp.obj.line_linked_width * pJS.canvas.pxratio;
    pJS.interactivity.modes.bubble.size = pJS.tmp.obj.mode_bubble_size * pJS.canvas.pxratio;
    pJS.interactivity.modes.repulse.distance = pJS.tmp.obj.mode_repulse_distance * pJS.canvas.pxratio;

  };



  /* ---------- pJS functions - canvas ------------ */

  pJS.fn.canvasInit = function(){
    pJS.canvas.ctx = pJS.canvas.el.getContext('2d');
  };

  pJS.fn.canvasSize = function(){

    pJS.canvas.el.width = pJS.canvas.w;
    pJS.canvas.el.height = pJS.canvas.h;

    if(pJS && pJS.interactivity.events.resize){

      window.addEventListener('resize', function(){

          pJS.canvas.w = pJS.canvas.el.offsetWidth;
          pJS.canvas.h = pJS.canvas.el.offsetHeight;

          /* resize canvas */
          if(pJS.tmp.retina){
            pJS.canvas.w *= pJS.canvas.pxratio;
            pJS.canvas.h *= pJS.canvas.pxratio;
          }

          pJS.canvas.el.width = pJS.canvas.w;
          pJS.canvas.el.height = pJS.canvas.h;

          /* repaint canvas on anim disabled */
          if(!pJS.particles.move.enable){
            pJS.fn.particlesEmpty();
            pJS.fn.particlesCreate();
            pJS.fn.particlesDraw();
            pJS.fn.vendors.densityAutoParticles();
          }

        /* density particles enabled */
        pJS.fn.vendors.densityAutoParticles();

      });

    }

  };


  pJS.fn.canvasPaint = function(){
    pJS.canvas.ctx.fillRect(0, 0, pJS.canvas.w, pJS.canvas.h);
  };

  pJS.fn.canvasClear = function(){
    pJS.canvas.ctx.clearRect(0, 0, pJS.canvas.w, pJS.canvas.h);
  };


  /* --------- pJS functions - particles ----------- */

  pJS.fn.particle = function(color, opacity, position){

    /* size */
    this.radius = (pJS.particles.size.random ? Math.random() : 1) * pJS.particles.size.value;
    if(pJS.particles.size.anim.enable){
      this.size_status = false;
      this.vs = pJS.particles.size.anim.speed / 100;
      if(!pJS.particles.size.anim.sync){
        this.vs = this.vs * Math.random();
      }
    }

    /* position */
    this.x = position ? position.x : Math.random() * pJS.canvas.w;
    this.y = position ? position.y : Math.random() * pJS.canvas.h;

    /* check position  - into the canvas */
    if(this.x > pJS.canvas.w - this.radius*2) this.x = this.x - this.radius;
    else if(this.x < this.radius*2) this.x = this.x + this.radius;
    if(this.y > pJS.canvas.h - this.radius*2) this.y = this.y - this.radius;
    else if(this.y < this.radius*2) this.y = this.y + this.radius;

    /* check position - avoid overlap */
    if(pJS.particles.move.bounce){
      pJS.fn.vendors.checkOverlap(this, position);
    }

    /* color */
    this.color = {};
    if(typeof(color.value) == 'object'){

      if(color.value instanceof Array){
        var color_selected = color.value[Math.floor(Math.random() * pJS.particles.color.value.length)];
        this.color.rgb = hexToRgb(color_selected);
      }else{
        if(color.value.r != undefined && color.value.g != undefined && color.value.b != undefined){
          this.color.rgb = {
            r: color.value.r,
            g: color.value.g,
            b: color.value.b
          }
        }
        if(color.value.h != undefined && color.value.s != undefined && color.value.l != undefined){
          this.color.hsl = {
            h: color.value.h,
            s: color.value.s,
            l: color.value.l
          }
        }
      }

    }
    else if(color.value == 'random'){
      this.color.rgb = {
        r: (Math.floor(Math.random() * (255 - 0 + 1)) + 0),
        g: (Math.floor(Math.random() * (255 - 0 + 1)) + 0),
        b: (Math.floor(Math.random() * (255 - 0 + 1)) + 0)
      }
    }
    else if(typeof(color.value) == 'string'){
      this.color = color;
      this.color.rgb = hexToRgb(this.color.value);
    }

    /* opacity */
    this.opacity = (pJS.particles.opacity.random ? Math.random() : 1) * pJS.particles.opacity.value;
    if(pJS.particles.opacity.anim.enable){
      this.opacity_status = false;
      this.vo = pJS.particles.opacity.anim.speed / 100;
      if(!pJS.particles.opacity.anim.sync){
        this.vo = this.vo * Math.random();
      }
    }

    /* animation - velocity for speed */
    var velbase = {}
    switch(pJS.particles.move.direction){
      case 'top':
        velbase = { x:0, y:-1 };
      break;
      case 'top-right':
        velbase = { x:0.5, y:-0.5 };
      break;
      case 'right':
        velbase = { x:1, y:-0 };
      break;
      case 'bottom-right':
        velbase = { x:0.5, y:0.5 };
      break;
      case 'bottom':
        velbase = { x:0, y:1 };
      break;
      case 'bottom-left':
        velbase = { x:-0.5, y:1 };
      break;
      case 'left':
        velbase = { x:-1, y:0 };
      break;
      case 'top-left':
        velbase = { x:-0.5, y:-0.5 };
      break;
      default:
        velbase = { x:0, y:0 };
      break;
    }

    if(pJS.particles.move.straight){
      this.vx = velbase.x;
      this.vy = velbase.y;
      if(pJS.particles.move.random){
        this.vx = this.vx * (Math.random());
        this.vy = this.vy * (Math.random());
      }
    }else{
      this.vx = velbase.x + Math.random()-0.5;
      this.vy = velbase.y + Math.random()-0.5;
    }

    // var theta = 2.0 * Math.PI * Math.random();
    // this.vx = Math.cos(theta);
    // this.vy = Math.sin(theta);

    this.vx_i = this.vx;
    this.vy_i = this.vy;



    /* if shape is image */

    var shape_type = pJS.particles.shape.type;
    if(typeof(shape_type) == 'object'){
      if(shape_type instanceof Array){
        var shape_selected = shape_type[Math.floor(Math.random() * shape_type.length)];
        this.shape = shape_selected;
      }
    }else{
      this.shape = shape_type;
    }

    if(this.shape == 'image'){
      var sh = pJS.particles.shape;
      this.img = {
        src: sh.image.src,
        ratio: sh.image.width / sh.image.height
      }
      if(!this.img.ratio) this.img.ratio = 1;
      if(pJS.tmp.img_type == 'svg' && pJS.tmp.source_svg != undefined){
        pJS.fn.vendors.createSvgImg(this);
        if(pJS.tmp.pushing){
          this.img.loaded = false;
        }
      }
    }



  };


  pJS.fn.particle.prototype.draw = function() {

    var p = this;

    if(p.radius_bubble != undefined){
      var radius = p.radius_bubble;
    }else{
      var radius = p.radius;
    }

    if(p.opacity_bubble != undefined){
      var opacity = p.opacity_bubble;
    }else{
      var opacity = p.opacity;
    }

    if(p.color.rgb){
      var color_value = 'rgba('+p.color.rgb.r+','+p.color.rgb.g+','+p.color.rgb.b+','+opacity+')';
    }else{
      var color_value = 'hsla('+p.color.hsl.h+','+p.color.hsl.s+'%,'+p.color.hsl.l+'%,'+opacity+')';
    }

    pJS.canvas.ctx.fillStyle = color.hexValue;
    pJS.canvas.ctx.beginPath();

    switch(p.shape){

      case 'circle':
        pJS.canvas.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2, false);
      break;

      case 'edge':
        pJS.canvas.ctx.rect(p.x-radius, p.y-radius, radius*2, radius*2);
      break;

      case 'triangle':
        pJS.fn.vendors.drawShape(pJS.canvas.ctx, p.x-radius, p.y+radius / 1.66, radius*2, 3, 2);
      break;

      case 'polygon':
        pJS.fn.vendors.drawShape(
          pJS.canvas.ctx,
          p.x - radius / (pJS.particles.shape.polygon.nb_sides/3.5), // startX
          p.y - radius / (2.66/3.5), // startY
          radius*2.66 / (pJS.particles.shape.polygon.nb_sides/3), // sideLength
          pJS.particles.shape.polygon.nb_sides, // sideCountNumerator
          1 // sideCountDenominator
        );
      break;

      case 'star':
        pJS.fn.vendors.drawShape(
          pJS.canvas.ctx,
          p.x - radius*2 / (pJS.particles.shape.polygon.nb_sides/4), // startX
          p.y - radius / (2*2.66/3.5), // startY
          radius*2*2.66 / (pJS.particles.shape.polygon.nb_sides/3), // sideLength
          pJS.particles.shape.polygon.nb_sides, // sideCountNumerator
          2 // sideCountDenominator
        );
      break;

      case 'image':

        function draw(){
          pJS.canvas.ctx.drawImage(
            img_obj,
            p.x-radius,
            p.y-radius,
            radius*2,
            radius*2 / p.img.ratio
          );
        }

        if(pJS.tmp.img_type == 'svg'){
          var img_obj = p.img.obj;
        }else{
          var img_obj = pJS.tmp.img_obj;
        }

        if(img_obj){
          draw();
        }

      break;

    }

    pJS.canvas.ctx.closePath();

    if(pJS.particles.shape.stroke.width > 0){
      pJS.canvas.ctx.strokeStyle = pJS.particles.shape.stroke.color;
      pJS.canvas.ctx.lineWidth = pJS.particles.shape.stroke.width;
      pJS.canvas.ctx.stroke();
    }

    pJS.canvas.ctx.fill();

  };


  pJS.fn.particlesCreate = function(){
    for(var i = 0; i < pJS.particles.number.value; i++) {
      pJS.particles.array.push(new pJS.fn.particle(pJS.particles.color, pJS.particles.opacity.value));
    }
  };

  pJS.fn.particlesUpdate = function(){
    if(stopParticles) {
      pJS.fn.vendors.destroypJS();
    }
    for(var i = 0; i < pJS.particles.array.length; i++){

      /* the particle */
      var p = pJS.particles.array[i];

      // var d = ( dx = pJS.interactivity.mouse.click_pos_x - p.x ) * dx + ( dy = pJS.interactivity.mouse.click_pos_y - p.y ) * dy;
      // var f = -BANG_SIZE / d;
      // if ( d < BANG_SIZE ) {
      //     var t = Math.atan2( dy, dx );
      //     p.vx = f * Math.cos(t);
      //     p.vy = f * Math.sin(t);
      // }

      /* move the particle */
      if(pJS.particles.move.enable){
        var ms = pJS.particles.move.speed/2;
        p.x += p.vx * ms;
        p.y += p.vy * ms;
      }

      /* change opacity status */
      if(pJS.particles.opacity.anim.enable) {
        if(p.opacity_status == true) {
          if(p.opacity >= pJS.particles.opacity.value) p.opacity_status = false;
          p.opacity += p.vo;
        }else {
          if(p.opacity <= pJS.particles.opacity.anim.opacity_min) p.opacity_status = true;
          p.opacity -= p.vo;
        }
        if(p.opacity < 0) p.opacity = 0;
      }

      /* change size */
      if(pJS.particles.size.anim.enable){
        if(p.size_status == true){
          if(p.radius >= pJS.particles.size.value) p.size_status = false;
          p.radius += p.vs;
        }else{
          if(p.radius <= pJS.particles.size.anim.size_min) p.size_status = true;
          p.radius -= p.vs;
        }
        if(p.radius < 0) p.radius = 0;
      }

      /* change particle position if it is out of canvas */
      if(pJS.particles.move.out_mode == 'bounce'){
        var new_pos = {
          x_left: p.radius,
          x_right:  pJS.canvas.w,
          y_top: p.radius,
          y_bottom: pJS.canvas.h
        }
      }else{
        var new_pos = {
          x_left: -p.radius,
          x_right: pJS.canvas.w + p.radius,
          y_top: -p.radius,
          y_bottom: pJS.canvas.h + p.radius
        }
      }

      if(p.x - p.radius > pJS.canvas.w){
        p.x = new_pos.x_left;
        p.y = Math.random() * pJS.canvas.h;
      }
      else if(p.x + p.radius < 0){
        p.x = new_pos.x_right;
        p.y = Math.random() * pJS.canvas.h;
      }
      if(p.y - p.radius > pJS.canvas.h){
        p.y = new_pos.y_top;
        p.x = Math.random() * pJS.canvas.w;
      }
      else if(p.y + p.radius < 0){
        p.y = new_pos.y_bottom;
        p.x = Math.random() * pJS.canvas.w;
      }

      /* out of canvas modes */
      switch(pJS.particles.move.out_mode){
        case 'bounce':
          if (p.x + p.radius > pJS.canvas.w) p.vx = -p.vx;
          else if (p.x - p.radius < 0) p.vx = -p.vx;
          if (p.y + p.radius > pJS.canvas.h) p.vy = -p.vy;
          else if (p.y - p.radius < 0) p.vy = -p.vy;
        break;
      }

      /* events */
      if(isInArray('grab', pJS.interactivity.events.onhover.mode)){
        pJS.fn.modes.grabParticle(p);
      }

      if(isInArray('bubble', pJS.interactivity.events.onhover.mode) || isInArray('bubble', pJS.interactivity.events.onclick.mode)){
        pJS.fn.modes.bubbleParticle(p);
      }

      if(isInArray('repulse', pJS.interactivity.events.onhover.mode) || isInArray('repulse', pJS.interactivity.events.onclick.mode)){
        pJS.fn.modes.repulseParticle(p);
      }

      /* interaction auto between particles */
      if(pJS.particles.line_linked.enable || pJS.particles.move.attract.enable){
        for(var j = i + 1; j < pJS.particles.array.length; j++){
          var p2 = pJS.particles.array[j];

          /* link particles */
          if(pJS.particles.line_linked.enable){
            pJS.fn.interact.linkParticles(p,p2);
          }

          /* attract particles */
          if(pJS.particles.move.attract.enable){
            pJS.fn.interact.attractParticles(p,p2);
          }

          /* bounce particles */
          if(pJS.particles.move.bounce){
            pJS.fn.interact.bounceParticles(p,p2);
          }

        }
      }


    }

  };

  pJS.fn.particlesDraw = function(){

    /* clear canvas */
    pJS.canvas.ctx.clearRect(0, 0, pJS.canvas.w, pJS.canvas.h);

    /* update each particles param */
    pJS.fn.particlesUpdate();

    /* draw each particle */
    for(var i = 0; i < pJS.particles.array.length; i++){
      var p = pJS.particles.array[i];
      p.draw();
    }

  };

  pJS.fn.particlesEmpty = function(){
    pJS.particles.array = [];
  };

  pJS.fn.particlesRefresh = function(){

    /* init all */
    cancelRequestAnimFrame(pJS.fn.checkAnimFrame);
    cancelRequestAnimFrame(pJS.fn.drawAnimFrame);
    pJS.tmp.source_svg = undefined;
    pJS.tmp.img_obj = undefined;
    pJS.tmp.count_svg = 0;
    pJS.fn.particlesEmpty();
    pJS.fn.canvasClear();

    /* restart */
    pJS.fn.vendors.start();

  };


  /* ---------- pJS functions - particles interaction ------------ */

  pJS.fn.interact.linkParticles = function(p1, p2){

    var dx = p1.x - p2.x,
        dy = p1.y - p2.y,
        dist = Math.sqrt(dx*dx + dy*dy);

    /* draw a line between p1 and p2 if the distance between them is under the config distance */
    if(dist <= pJS.particles.line_linked.distance){

      var opacity_line = pJS.particles.line_linked.opacity - (dist / (1/pJS.particles.line_linked.opacity)) / pJS.particles.line_linked.distance;

      if(opacity_line > 0){

        /* style */
        var color_line = pJS.particles.line_linked.color_rgb_line;
        pJS.canvas.ctx.strokeStyle = 'rgba('+color_line.r+','+color_line.g+','+color_line.b+','+opacity_line+')';
        pJS.canvas.ctx.lineWidth = pJS.particles.line_linked.width;
        //pJS.canvas.ctx.lineCap = 'round'; /* performance issue */

        /* path */
        pJS.canvas.ctx.beginPath();
        pJS.canvas.ctx.moveTo(p1.x, p1.y);
        pJS.canvas.ctx.lineTo(p2.x, p2.y);
        pJS.canvas.ctx.stroke();
        pJS.canvas.ctx.closePath();

      }

    }

  };


  pJS.fn.interact.attractParticles  = function(p1, p2){

    /* condensed particles */
    var dx = p1.x - p2.x,
        dy = p1.y - p2.y,
        dist = Math.sqrt(dx*dx + dy*dy);

    if(dist <= pJS.particles.line_linked.distance){

      var ax = dx/(pJS.particles.move.attract.rotateX*1000),
          ay = dy/(pJS.particles.move.attract.rotateY*1000);

      p1.vx -= ax;
      p1.vy -= ay;

      p2.vx += ax;
      p2.vy += ay;

    }


  }


  pJS.fn.interact.bounceParticles = function(p1, p2){

    var dx = p1.x - p2.x,
        dy = p1.y - p2.y,
        dist = Math.sqrt(dx*dx + dy*dy),
        dist_p = p1.radius+p2.radius;

    if(dist <= dist_p){
      p1.vx = -p1.vx;
      p1.vy = -p1.vy;

      p2.vx = -p2.vx;
      p2.vy = -p2.vy;
    }

  }


  /* ---------- pJS functions - modes events ------------ */

  pJS.fn.modes.pushParticles = function(nb, pos){

    pJS.tmp.pushing = true;

    for(var i = 0; i < nb; i++){
      pJS.particles.array.push(
        new pJS.fn.particle(
          pJS.particles.color,
          pJS.particles.opacity.value,
          {
            'x': pos ? pos.pos_x : Math.random() * pJS.canvas.w,
            'y': pos ? pos.pos_y : Math.random() * pJS.canvas.h
          }
        )
      )
      if(i == nb-1){
        if(!pJS.particles.move.enable){
          pJS.fn.particlesDraw();
        }
        pJS.tmp.pushing = false;
      }
    }

  };


  pJS.fn.modes.removeParticles = function(nb){

    pJS.particles.array.splice(0, nb);
    if(!pJS.particles.move.enable){
      pJS.fn.particlesDraw();
    }

  };


  pJS.fn.modes.bubbleParticle = function(p){

    /* on hover event */
    if(pJS.interactivity.events.onhover.enable && isInArray('bubble', pJS.interactivity.events.onhover.mode)){

      var dx_mouse = p.x - pJS.interactivity.mouse.pos_x,
          dy_mouse = p.y - pJS.interactivity.mouse.pos_y,
          dist_mouse = Math.sqrt(dx_mouse*dx_mouse + dy_mouse*dy_mouse),
          ratio = 1 - dist_mouse / pJS.interactivity.modes.bubble.distance;

      function init(){
        p.opacity_bubble = p.opacity;
        p.radius_bubble = p.radius;
      }

      /* mousemove - check ratio */
      if(dist_mouse <= pJS.interactivity.modes.bubble.distance){

        if(ratio >= 0 && pJS.interactivity.status == 'mousemove'){

          /* size */
          if(pJS.interactivity.modes.bubble.size != pJS.particles.size.value){

            if(pJS.interactivity.modes.bubble.size > pJS.particles.size.value){
              var size = p.radius + (pJS.interactivity.modes.bubble.size*ratio);
              if(size >= 0){
                p.radius_bubble = size;
              }
            }else{
              var dif = p.radius - pJS.interactivity.modes.bubble.size,
                  size = p.radius - (dif*ratio);
              if(size > 0){
                p.radius_bubble = size;
              }else{
                p.radius_bubble = 0;
              }
            }

          }

          /* opacity */
          if(pJS.interactivity.modes.bubble.opacity != pJS.particles.opacity.value){

            if(pJS.interactivity.modes.bubble.opacity > pJS.particles.opacity.value){
              var opacity = pJS.interactivity.modes.bubble.opacity*ratio;
              if(opacity > p.opacity && opacity <= pJS.interactivity.modes.bubble.opacity){
                p.opacity_bubble = opacity;
              }
            }else{
              var opacity = p.opacity - (pJS.particles.opacity.value-pJS.interactivity.modes.bubble.opacity)*ratio;
              if(opacity < p.opacity && opacity >= pJS.interactivity.modes.bubble.opacity){
                p.opacity_bubble = opacity;
              }
            }

          }

        }

      }else{
        init();
      }


      /* mouseleave */
      if(pJS.interactivity.status == 'mouseleave'){
        init();
      }

    }

    /* on click event */
    else if(pJS.interactivity.events.onclick.enable && isInArray('bubble', pJS.interactivity.events.onclick.mode)){


      if(pJS.tmp.bubble_clicking){
        var dx_mouse = p.x - pJS.interactivity.mouse.click_pos_x,
            dy_mouse = p.y - pJS.interactivity.mouse.click_pos_y,
            dist_mouse = Math.sqrt(dx_mouse*dx_mouse + dy_mouse*dy_mouse),
            time_spent = (new Date().getTime() - pJS.interactivity.mouse.click_time)/1000;

        if(time_spent > pJS.interactivity.modes.bubble.duration){
          pJS.tmp.bubble_duration_end = true;
        }

        if(time_spent > pJS.interactivity.modes.bubble.duration*2){
          pJS.tmp.bubble_clicking = false;
          pJS.tmp.bubble_duration_end = false;
        }
      }


      function process(bubble_param, particles_param, p_obj_bubble, p_obj, id){

        if(bubble_param != particles_param){

          if(!pJS.tmp.bubble_duration_end){
            if(dist_mouse <= pJS.interactivity.modes.bubble.distance){
              if(p_obj_bubble != undefined) var obj = p_obj_bubble;
              else var obj = p_obj;
              if(obj != bubble_param){
                var value = p_obj - (time_spent * (p_obj - bubble_param) / pJS.interactivity.modes.bubble.duration);
                if(id == 'size') p.radius_bubble = value;
                if(id == 'opacity') p.opacity_bubble = value;
              }
            }else{
              if(id == 'size') p.radius_bubble = undefined;
              if(id == 'opacity') p.opacity_bubble = undefined;
            }
          }else{
            if(p_obj_bubble != undefined){
              var value_tmp = p_obj - (time_spent * (p_obj - bubble_param) / pJS.interactivity.modes.bubble.duration),
                  dif = bubble_param - value_tmp;
                  value = bubble_param + dif;
              if(id == 'size') p.radius_bubble = value;
              if(id == 'opacity') p.opacity_bubble = value;
            }
          }

        }

      }

      if(pJS.tmp.bubble_clicking){
        /* size */
        process(pJS.interactivity.modes.bubble.size, pJS.particles.size.value, p.radius_bubble, p.radius, 'size');
        /* opacity */
        process(pJS.interactivity.modes.bubble.opacity, pJS.particles.opacity.value, p.opacity_bubble, p.opacity, 'opacity');
      }

    }

  };


  pJS.fn.modes.repulseParticle = function(p){

    if(pJS.interactivity.events.onhover.enable && isInArray('repulse', pJS.interactivity.events.onhover.mode) && pJS.interactivity.status == 'mousemove') {

      var dx_mouse = p.x - pJS.interactivity.mouse.pos_x,
          dy_mouse = p.y - pJS.interactivity.mouse.pos_y,
          dist_mouse = Math.sqrt(dx_mouse*dx_mouse + dy_mouse*dy_mouse);

      var normVec = {x: dx_mouse/dist_mouse, y: dy_mouse/dist_mouse},
          repulseRadius = pJS.interactivity.modes.repulse.distance,
          velocity = 100,
          repulseFactor = clamp((1/repulseRadius)*(-1*Math.pow(dist_mouse/repulseRadius,2)+1)*repulseRadius*velocity, 0, 50);

      var pos = {
        x: p.x + normVec.x * repulseFactor,
        y: p.y + normVec.y * repulseFactor
      }

      if(pJS.particles.move.out_mode == 'bounce'){
        if(pos.x - p.radius > 0 && pos.x + p.radius < pJS.canvas.w) p.x = pos.x;
        if(pos.y - p.radius > 0 && pos.y + p.radius < pJS.canvas.h) p.y = pos.y;
      }else{
        p.x = pos.x;
        p.y = pos.y;
      }

    }


    else if(pJS.interactivity.events.onclick.enable && isInArray('repulse', pJS.interactivity.events.onclick.mode)) {

      if(!pJS.tmp.repulse_finish){
        pJS.tmp.repulse_count++;
        if(pJS.tmp.repulse_count == pJS.particles.array.length){
          pJS.tmp.repulse_finish = true;
        }
      }

      if(pJS.tmp.repulse_clicking){

        var repulseRadius = Math.pow(pJS.interactivity.modes.repulse.distance/6, 3);

        var dx = pJS.interactivity.mouse.click_pos_x - p.x,
            dy = pJS.interactivity.mouse.click_pos_y - p.y,
            d = dx*dx + dy*dy;

        var force = -repulseRadius / d * 1;

        function process(){

          var f = Math.atan2(dy,dx);
          p.vx = force * Math.cos(f);
          p.vy = force * Math.sin(f);

          if(pJS.particles.move.out_mode == 'bounce'){
            var pos = {
              x: p.x + p.vx,
              y: p.y + p.vy
            }
            if (pos.x + p.radius > pJS.canvas.w) p.vx = -p.vx;
            else if (pos.x - p.radius < 0) p.vx = -p.vx;
            if (pos.y + p.radius > pJS.canvas.h) p.vy = -p.vy;
            else if (pos.y - p.radius < 0) p.vy = -p.vy;
          }

        }

        // default
        if(d <= repulseRadius){
          process();
        }

        // bang - slow motion mode
        // if(!pJS.tmp.repulse_finish){
        //   if(d <= repulseRadius){
        //     process();
        //   }
        // }else{
        //   process();
        // }


      }else{

        if(pJS.tmp.repulse_clicking == false){

          p.vx = p.vx_i;
          p.vy = p.vy_i;

        }

      }

    }

  }


  pJS.fn.modes.grabParticle = function(p){

    if(pJS.interactivity.events.onhover.enable && pJS.interactivity.status == 'mousemove'){

      var dx_mouse = p.x - pJS.interactivity.mouse.pos_x,
          dy_mouse = p.y - pJS.interactivity.mouse.pos_y,
          dist_mouse = Math.sqrt(dx_mouse*dx_mouse + dy_mouse*dy_mouse);

      /* draw a line between the cursor and the particle if the distance between them is under the config distance */
      if(dist_mouse <= pJS.interactivity.modes.grab.distance){

        var opacity_line = pJS.interactivity.modes.grab.line_linked.opacity - (dist_mouse / (1/pJS.interactivity.modes.grab.line_linked.opacity)) / pJS.interactivity.modes.grab.distance;

        if(opacity_line > 0){

          /* style */
          var color_line = pJS.particles.line_linked.color_rgb_line;
          pJS.canvas.ctx.strokeStyle = 'rgba('+color_line.r+','+color_line.g+','+color_line.b+','+opacity_line+')';
          pJS.canvas.ctx.lineWidth = pJS.particles.line_linked.width;
          //pJS.canvas.ctx.lineCap = 'round'; /* performance issue */

          /* path */
          pJS.canvas.ctx.beginPath();
          pJS.canvas.ctx.moveTo(p.x, p.y);
          pJS.canvas.ctx.lineTo(pJS.interactivity.mouse.pos_x, pJS.interactivity.mouse.pos_y);
          pJS.canvas.ctx.stroke();
          pJS.canvas.ctx.closePath();

        }

      }

    }

  };



  /* ---------- pJS functions - vendors ------------ */

  pJS.fn.vendors.eventsListeners = function(){

    /* events target element */
    if(pJS.interactivity.detect_on == 'window'){
      pJS.interactivity.el = window;
    }else{
      pJS.interactivity.el = pJS.canvas.el;
    }


    /* detect mouse pos - on hover / click event */
    if(pJS.interactivity.events.onhover.enable || pJS.interactivity.events.onclick.enable){

      /* el on mousemove */
      pJS.interactivity.el.addEventListener('mousemove', function(e){

        if(pJS.interactivity.el == window){
          var pos_x = e.clientX,
              pos_y = e.clientY;
        }
        else{
          var pos_x = e.offsetX || e.clientX,
              pos_y = e.offsetY || e.clientY;
        }

        pJS.interactivity.mouse.pos_x = pos_x;
        pJS.interactivity.mouse.pos_y = pos_y;

        if(pJS.tmp.retina){
          pJS.interactivity.mouse.pos_x *= pJS.canvas.pxratio;
          pJS.interactivity.mouse.pos_y *= pJS.canvas.pxratio;
        }

        pJS.interactivity.status = 'mousemove';

      });

      /* el on onmouseleave */
      pJS.interactivity.el.addEventListener('mouseleave', function(e){

        pJS.interactivity.mouse.pos_x = null;
        pJS.interactivity.mouse.pos_y = null;
        pJS.interactivity.status = 'mouseleave';

      });

    }

    /* on click event */
    if(pJS.interactivity.events.onclick.enable){

      pJS.interactivity.el.addEventListener('click', function(){

        pJS.interactivity.mouse.click_pos_x = pJS.interactivity.mouse.pos_x;
        pJS.interactivity.mouse.click_pos_y = pJS.interactivity.mouse.pos_y;
        pJS.interactivity.mouse.click_time = new Date().getTime();

        if(pJS.interactivity.events.onclick.enable){

          switch(pJS.interactivity.events.onclick.mode){

            case 'push':
              if(pJS.particles.move.enable){
                pJS.fn.modes.pushParticles(pJS.interactivity.modes.push.particles_nb, pJS.interactivity.mouse);
              }else{
                if(pJS.interactivity.modes.push.particles_nb == 1){
                  pJS.fn.modes.pushParticles(pJS.interactivity.modes.push.particles_nb, pJS.interactivity.mouse);
                }
                else if(pJS.interactivity.modes.push.particles_nb > 1){
                  pJS.fn.modes.pushParticles(pJS.interactivity.modes.push.particles_nb);
                }
              }
            break;

            case 'remove':
              pJS.fn.modes.removeParticles(pJS.interactivity.modes.remove.particles_nb);
            break;

            case 'bubble':
              pJS.tmp.bubble_clicking = true;
            break;

            case 'repulse':
              pJS.tmp.repulse_clicking = true;
              pJS.tmp.repulse_count = 0;
              pJS.tmp.repulse_finish = false;
              setTimeout(function(){
                pJS.tmp.repulse_clicking = false;
              }, pJS.interactivity.modes.repulse.duration*1000)
            break;

          }

        }

      });

    }


  };

  pJS.fn.vendors.densityAutoParticles = function(){

    if(pJS.particles.number.density.enable){

      /* calc area */
      var area = pJS.canvas.el.width * pJS.canvas.el.height / 1000;
      if(pJS.tmp.retina){
        area = area/(pJS.canvas.pxratio*2);
      }

      /* calc number of particles based on density area */
      var nb_particles = area * pJS.particles.number.value / pJS.particles.number.density.value_area;

      /* add or remove X particles */
      var missing_particles = pJS.particles.array.length - nb_particles;
      if(missing_particles < 0) pJS.fn.modes.pushParticles(Math.abs(missing_particles));
      else pJS.fn.modes.removeParticles(missing_particles);

    }

  };


  pJS.fn.vendors.checkOverlap = function(p1, position){
    for(var i = 0; i < pJS.particles.array.length; i++){
      var p2 = pJS.particles.array[i];

      var dx = p1.x - p2.x,
          dy = p1.y - p2.y,
          dist = Math.sqrt(dx*dx + dy*dy);

      if(dist <= p1.radius + p2.radius){
        p1.x = position ? position.x : Math.random() * pJS.canvas.w;
        p1.y = position ? position.y : Math.random() * pJS.canvas.h;
        pJS.fn.vendors.checkOverlap(p1);
      }
    }
  };


  pJS.fn.vendors.createSvgImg = function(p){

    /* set color to svg element */
    var svgXml = pJS.tmp.source_svg,
        rgbHex = /#([0-9A-F]{3,6})/gi,
        coloredSvgXml = svgXml.replace(rgbHex, function (m, r, g, b) {
          if(p.color.rgb){
            var color_value = 'rgba('+p.color.rgb.r+','+p.color.rgb.g+','+p.color.rgb.b+','+p.opacity+')';
          }else{
            var color_value = 'hsla('+p.color.hsl.h+','+p.color.hsl.s+'%,'+p.color.hsl.l+'%,'+p.opacity+')';
          }
          return color_value;
        });

    /* prepare to create img with colored svg */
    var svg = new Blob([coloredSvgXml], {type: 'image/svg+xml;charset=utf-8'}),
        DOMURL = window.URL || window.webkitURL || window,
        url = DOMURL.createObjectURL(svg);

    /* create particle img obj */
    var img = new Image();
    img.addEventListener('load', function(){
      p.img.obj = img;
      p.img.loaded = true;
      DOMURL.revokeObjectURL(url);
      pJS.tmp.count_svg++;
    });
    img.src = url;

  };


  pJS.fn.vendors.destroypJS = function(){
    cancelAnimationFrame(pJS.fn.drawAnimFrame);
    canvas_el.remove();
    pJSDom = null;
    destroy;
  };


  pJS.fn.vendors.drawShape = function(c, startX, startY, sideLength, sideCountNumerator, sideCountDenominator){

    // By Programming Thomas - https://programmingthomas.wordpress.com/2013/04/03/n-sided-shapes/
    var sideCount = sideCountNumerator * sideCountDenominator;
    var decimalSides = sideCountNumerator / sideCountDenominator;
    var interiorAngleDegrees = (180 * (decimalSides - 2)) / decimalSides;
    var interiorAngle = Math.PI - Math.PI * interiorAngleDegrees / 180; // convert to radians
    c.save();
    c.beginPath();
    c.translate(startX, startY);
    c.moveTo(0,0);
    for (var i = 0; i < sideCount; i++) {
      c.lineTo(sideLength,0);
      c.translate(sideLength,0);
      c.rotate(interiorAngle);
    }
    //c.stroke();
    c.fill();
    c.restore();

  };

  pJS.fn.vendors.exportImg = function(){
    window.open(pJS.canvas.el.toDataURL('image/png'), '_blank');
  };


  pJS.fn.vendors.loadImg = function(type){

    pJS.tmp.img_error = undefined;

    if(pJS.particles.shape.image.src != ''){

      if(type == 'svg'){

        var xhr = new XMLHttpRequest();
        xhr.open('GET', pJS.particles.shape.image.src);
        xhr.onreadystatechange = function (data) {
          if(xhr.readyState == 4){
            if(xhr.status == 200){
              pJS.tmp.source_svg = data.currentTarget.response;
              pJS.fn.vendors.checkBeforeDraw();
            }else{
              console.log('Error pJS - Image not found');
              pJS.tmp.img_error = true;
            }
          }
        }
        xhr.send();

      }else{

        var img = new Image();
        img.addEventListener('load', function(){
          pJS.tmp.img_obj = img;
          pJS.fn.vendors.checkBeforeDraw();
        });
        img.src = pJS.particles.shape.image.src;

      }

    }else{
      console.log('Error pJS - No image.src');
      pJS.tmp.img_error = true;
    }

  };


  pJS.fn.vendors.draw = function(){

    if(pJS.particles.shape.type == 'image'){

      if(pJS.tmp.img_type == 'svg'){

        if(pJS.tmp.count_svg >= pJS.particles.number.value){
          pJS.fn.particlesDraw();
          if(!pJS.particles.move.enable) cancelRequestAnimFrame(pJS.fn.drawAnimFrame);
          else pJS.fn.drawAnimFrame = requestAnimFrame(pJS.fn.vendors.draw);
        }else{
          //console.log('still loading...');
          if(!pJS.tmp.img_error) pJS.fn.drawAnimFrame = requestAnimFrame(pJS.fn.vendors.draw);
        }

      }else{

        if(pJS.tmp.img_obj != undefined){
          pJS.fn.particlesDraw();
          if(!pJS.particles.move.enable) cancelRequestAnimFrame(pJS.fn.drawAnimFrame);
          else pJS.fn.drawAnimFrame = requestAnimFrame(pJS.fn.vendors.draw);
        }else{
          if(!pJS.tmp.img_error) pJS.fn.drawAnimFrame = requestAnimFrame(pJS.fn.vendors.draw);
        }

      }

    }else{
      pJS.fn.particlesDraw();
      if(!pJS.particles.move.enable) cancelRequestAnimFrame(pJS.fn.drawAnimFrame);
      else pJS.fn.drawAnimFrame = requestAnimFrame(pJS.fn.vendors.draw);
    }

  };


  pJS.fn.vendors.checkBeforeDraw = function(){

    // if shape is image
    if(pJS.particles.shape.type == 'image'){

      if(pJS.tmp.img_type == 'svg' && pJS.tmp.source_svg == undefined){
        pJS.tmp.checkAnimFrame = requestAnimFrame(check);
      }else{
        //console.log('images loaded! cancel check');
        cancelRequestAnimFrame(pJS.tmp.checkAnimFrame);
        if(!pJS.tmp.img_error){
          pJS.fn.vendors.init();
          pJS.fn.vendors.draw();
        }

      }

    }else{
      pJS.fn.vendors.init();
      pJS.fn.vendors.draw();
    }

  };


  pJS.fn.vendors.init = function(){

    /* init canvas + particles */
    pJS.fn.retinaInit();
    pJS.fn.canvasInit();
    pJS.fn.canvasSize();
    pJS.fn.canvasPaint();
    pJS.fn.particlesCreate();
    pJS.fn.vendors.densityAutoParticles();

    /* particles.line_linked - convert hex colors to rgb */
    pJS.particles.line_linked.color_rgb_line = hexToRgb(pJS.particles.line_linked.color);

  };


  pJS.fn.vendors.start = function(){

    if(isInArray('image', pJS.particles.shape.type)){
      pJS.tmp.img_type = pJS.particles.shape.image.src.substr(pJS.particles.shape.image.src.length - 3);
      pJS.fn.vendors.loadImg(pJS.tmp.img_type);
    }else{
      pJS.fn.vendors.checkBeforeDraw();
    }

  };




  /* ---------- pJS - start ------------ */


  pJS.fn.vendors.eventsListeners();

  pJS.fn.vendors.start();
};

/* ---------- global functions - vendors ------------ */

Object.deepExtend = function(destination, source) {
  for (var property in source) {
    if (source[property] && source[property].constructor &&
     source[property].constructor === Object) {
      destination[property] = destination[property] || {};
      arguments.callee(destination[property], source[property]);
    } else {
      destination[property] = source[property];
    }
  }
  return destination;
};

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(callback){
      window.setTimeout(callback, 1000 / 60);
    };
})();

window.cancelRequestAnimFrame = ( function() {
  return window.cancelAnimationFrame         ||
    window.webkitCancelRequestAnimationFrame ||
    window.mozCancelRequestAnimationFrame    ||
    window.oCancelRequestAnimationFrame      ||
    window.msCancelRequestAnimationFrame     ||
    clearTimeout
} )();

function hexToRgb(hex){
  // By Tim Down - http://stackoverflow.com/a/5624139/3493650
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
     return r + r + g + g + b + b;
  });
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
  } : null;
};

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
};

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}


/* ---------- particles.js functions - start ------------ */

window.pJSDom = [];

window.particlesJS = function(tag_id, params){

  //console.log(params);

  /* no string id? so it's object params, and set the id with default id */
  if(typeof(tag_id) != 'string'){
    params = tag_id;
    tag_id = 'particles-js';
  }

  /* no id? set the id to default id */
  if(!tag_id){
    tag_id = 'particles-js';
  }

  /* pJS elements */
  var pJS_tag = document.getElementById(tag_id),
      pJS_canvas_class = 'particles-js-canvas-el',
      exist_canvas = pJS_tag.getElementsByClassName(pJS_canvas_class);

  /* remove canvas if exists into the pJS target tag */
  if(exist_canvas.length){
    while(exist_canvas.length > 0){
      pJS_tag.removeChild(exist_canvas[0]);
    }
  }

  /* create canvas element */
  var canvas_el = document.createElement('canvas');
  canvas_el.className = pJS_canvas_class;

  /* set size canvas */
  canvas_el.style.width = "100%";
  canvas_el.style.height = "100%";

  /* append canvas */
  var canvas = document.getElementById(tag_id).appendChild(canvas_el);

  /* launch particle.js */
  if(canvas != null){
    pJSDom.push(new pJS(tag_id, params));
  }

};

window.particlesJS.load = function(tag_id, path_config_json, callback){

  /* load json config */
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path_config_json);
  xhr.onreadystatechange = function (data) {
    if(xhr.readyState == 4){
      if(xhr.status == 200){
        var params = JSON.parse(data.currentTarget.response);
        window.particlesJS(tag_id, params);
        if(callback) callback();
      }else{
        console.log('Error pJS - XMLHttpRequest status: '+xhr.status);
        console.log('Error pJS - File config not found');
      }
    }
  };
  xhr.send();

};
