// Mettre bibliothèque express dans une variable
var express = require('express');
// Creation d'une application express
var app = express();
// Creation d'un server express
var server = require('http').Server(app);
// Utilisation de socket.io par le server express
var io = require('socket.io')(server, {});

var SOCKET_LIST = {};



///////////////////////////
//        HELPERS        //
///////////////////////////

random = function(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

randomChoice = function() {
  return arguments[this.random(0, arguments.length)];
}

intercept = function(x1, y1, x2, y2, x3, y3, x4, y4, d, debug) { // fonction pour calculer si il y une interception
  // Fonction pour calculer l'intersection de deux segments de lignes (fait à partir d'un formule mathématique, retrouvable sur wikipedia, ...)
  var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
  if(denom != 0) {
    var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
    if((ua >= 0) && (ua <= 1)) {
      var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
      if((ub >= 0) && (ub <= 1)) {
        var x = x1 + (ua * (x2-x1));
        var y = y1 + (ua * (y2-y1));
        return { x: x, y: y, d: d};
      }
    }
  }
  return null;
} // fin intercept



///////////////////////////
//        EXPRESS        //
///////////////////////////

// Creation du lien '/' et passer le fichier index.html au client
app.get('/', function(req, res) {
  console.log(":: HTTP :: Loading file: " + __dirname + "/index.html");
  res.sendFile(__dirname + '/client/index.html');
});

// Rendre le dossier client public
app.use('/client', express.static(__dirname + '/client'));

// Demarrer le serveur sur le port definie par le système sinon port 3000
server.listen(process.env.PORT || 3000);
console.log(":: Express :: Listening on port 3000");



///////////////////////////
//      GAME SERVER      //
///////////////////////////

// La classe GameServer gère la creation, ... des jeux
var GameServer = function() {
  this.roomCount = 0;  // Nombre de jeux en cours
  this.rooms = {};     // Liste des jeux

  // Fonction pour trouver un jeu pour un joueur
  this.findGame = function(player) {
    console.log("looking for a game. We have: " + this.roomCount + " games.");

    if(this.roomCount) { // Si il y a des jeux
      for(var i in this.rooms) { // On va regarder dans chaque chambre
        if(player.joinedGame) { // Si le joueur a rejoint une chambre on quitte le for loop
          break;
        } // fin if
        if(this.rooms[i].playerCount < this.rooms[i].maxPlayers) { // Si le nombre des joueurs dans le jeu est plus petit que le max des joueurs du jeu
          this.rooms[i].joinPlayer(player); // Appel de la fonction pour rejoindre un jeu
        } // fin if
      } // fin for

      if(!player.joinedGame) { // Si tout les jeux sont plein
        this.createGame(player); // Créer un nouveau jeu pour ce joueur
      }
    } else { // Si il n'y a pas des jeux
      this.createGame(player); // Créer un nouveau jeu pour ce joueur
    } // fin if
  } // fin findGame

  // Fontion pour créer un nouveau jeu pour un joueur
  this.createGame = function(player) {
    var room = new Game(player);  // Creation du jeu

    this.rooms[room.id] = room;  // Ajouter le jeu au liste des jeux

    this.roomCount++;  // Incrementer le compteur des jeux

    room.createAI();  // Mettre des AI sur tout les places vide du jeu
  } // fin createGame

  // Mettre a jour tout les chambres
  this.updateRooms = function() {
    for(var i in gameServer.rooms) { // Pour chaque chambre
      var room = gameServer.rooms[i];
      room.initPlayers(); // Si il y a un nouveau joueur, ce fonction envoie les donnees du nouveau joueur a tout les joueurs
      room.update(); // Envoie la mise du jeu à tout les joueurs (coordonées des joueurs, du ball)
      room.removePlayers(); // Si un joueur quitte le jeu, dire aux autres qui à quitté
    } // fin for
  } // fin updateRooms
}; // fin classe GameServer

// Creation du GameServer
var gameServer = new GameServer();



///////////////////////////
//         GAME          //
///////////////////////////

// Une objet de la classe game gère un jeu
var Game = function(player) { // Le premier joueur est passer à la création du jeu
  this.id = random(1, 1000000000);        // Le id du jeu
  player.localId = 1;                     // Le id local du joueur, c-a-d le nb du jouer dans le jeu
  this.maxPlayers = 2;                    // Le nombre max des joueurs dans le jeu
  this.players = {};                      // La liste des joueurs dans le jeu
  this.players[player.localId] = player;  // Ajouter le premier à la liste des joueurs
  this.playerCount = 1;                   // Le nombre de joueurs dans le jeu
  this.width = 800;                       // la longeur du jeu (pour la map)
  this.height = 800;                      // La hauteur du jeu (pour la map)
  this.wallWidth = 12;                    // L'épaisseur des murs
  this.map = new Map(this);           // Création du map
  this.ballCount = 1;                     // Le nombre de balls dans le jeu
  this.constructBalls = function() {      // Creation de tout les balls
    var balls = [];
    for(var n = 0 ; n < this.ballCount ; n++)
      balls.push(new Ball(this)); // Création d'une balle et la mettre dans la liste balls
    return balls; // Renvoyer la liste des balls
  }
  this.balls = this.constructBalls();     // Création de tout les balls pour le jeu

  this.initPack = { // Le pack de initialization
    players: [],
    balls: []
  };
  this.removePack = []; // Le pack pour le remove

  this.assignAttributesToPlayer = function(player) { // Donner des attributs à un jouer qui à rejoint le jeu
    player.roomId = this.id;  // Attribution de l'id du jeu au variable roomId du joueur
    player.minY = this.wallWidth; // Limite min de déplacement pour le joueur
    player.maxY = this.height - this.wallWidth - player.height; // Limite max de déplacement pour le joueur
    //player.setPlayerPosition(player.localId, this.width); // Placer le joueur
    var goal = Goal.list[player.localId];
    player.x = (goal.x1 + goal.x2) / 2;
    player.y = (goal.y1 + goal.y2) / 2;
    var angle = Math.abs(Math.atan2(player.y, player.x)) * 180 / Math.PI;
    player.angle = angle;
    console.log(angle);
    player.leftX = goal.angle1.x;
    player.leftY = goal.angle1.y;
    player.rightX = goal.angle2.x;
    player.rightY = goal.angle2.y;
    player.goal = goal;
  } // fin assignAttributesToPlayer

  this.joinPlayer = function(player) { // Ajouter un joueur au jeu
    if(this.players[1] !== undefined && !this.players[1].isAI) { // si le le jouer 1 existe, ou c'est pas un AI
      player.localId = 2; // Le joueur devient joueur 2
      this.removePack.push(this.players[2].id); // Le AI est supprimé
    } else {
      player.localId = 1; // Le joueur devient joueur 1
    }
    this.players[player.localId] = player; // Le joueur est ajouté au liste des joueurs du jeu
    this.playerCount++; // Incrementation du compteur de joueurs
    this.assignAttributesToPlayer(player); // Ajouter des attributs au joueur
    player.joinedGame = true; // Le joueur à rejoint un jeu
    this.sendMap({ ww: this.map.wallWidth, walls: Wall.list }); // Envoyer le map au joueur
    for(var i in this.players) {
      this.pushPlayerToInitPack(this.players[i]); // Mettre le joueur dans le pack d'initialization
    }
    for(var i in this.balls) { // Pour tout les balls
      this.pushBallToInitPack(this.balls[i]); // Mettre le ball dans le pack d'initialization
      this.balls[i].targets.players[player.id] = player;
    }
    this.initPlayers();
  } // fin joinPlayer

  this.createAI = function() { // Fonction pour la creation d'un AI
    var aiSocket = { id: random(1, 1000000000) }; // Attribution d'un id
    var ai = new Player(aiSocket, "AI", true); // Creation d'un joueur AI
    Player.list[ai.id] = ai; // Ajout au liste des joueurs
    if(this.players[1] !== undefined) { // Si il y a un jouer 1 dans le jeu
      ai.localId = 2; // Le AI devient joueur 2
    } else {
      ai.localId = 1; // le AI devient joueur 1
    } // fin if
    this.players[ai.localId] = ai; // Ajouter le AI au liste des joueurs du jeu
    this.assignAttributesToPlayer(ai); // Ajouter des attributs au AI
    this.pushPlayerToInitPack(ai); // Fonction pour signaler les autres joueurs qu'un AI a rejoint la partie
  } // fin createAI

  this.goal = function(localId) { // si il y a eu un but
    if(this.playerCount == 2) { // le score est seulement compter si il y a deux joueurs connecté (le score contre un bot n'es pas compté)
      var player = this.players[localId];
      player.score += 1; // Incrementation du score du joueur qui à fait le but
      this.sendPackage('addToChat', this.players[1].score + ' - ' + this.players[2].score); // Envoyer le score au joueurs
    }
  }

  // Fonction pour envoyer la map
  this.sendMap = function(map) {
    this.sendPackage('map', { wallWidth: map.wallWidth, walls: map.walls });
  }

  // Fonction pour mettre en joueur dan le pack d'initialization
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

  // Fonction pour mettre un ball dan le pack d'initialization
  this.pushBallToInitPack = function(ball) {
    this.initPack.balls.push({
      id: ball.id,
      radius: ball.radius,
      x: ball.x,
      y: ball.y,
      color: ball.color
    });
  }

  // Fonction pour envoyer le pack d'initialization au joueurs
  this.initPlayers = function() {
    this.sendPackage('init', this.initPack); // Appel de la fonction pour envoyer le packet
    this.initPack.players = []; // Vider la liste des joueurs dans le pack d'initialization
    this.initPack.balls = []; // Vider la liste des balls dans le pack d'initialization
  }

  // Fonction pour la mise a jour du jeu
  this.update = function() {
    var pack = {
      players: [],
      balls: []
    }; // Creation d'un pack
    pack.players = this.updatePlayers(); // Mettre a jour les joueurs et mettre les données dans le pack
    pack.balls = this.updateBalls(); // Mettre a jour les balls et mettre les données dans le pack
    this.sendPackage('update', pack); // Envoyer le pack au joueurs
  }

  // Fonction pour le mise a jour des joueurs
  this.updatePlayers = function() {
    var pack = [];
    for(var i in this.players) { // Pour chaque joueur
      var player = this.players[i];
      if(player.isAI) { // Si le joueur est un AI
        for(var i in this.balls) {
          var ball = this.balls[i];
          //this.ai(player, ball); // Appel de la fonction ai pour chaque ball dans le jeu
        }
        player.update(); // Mettre a jour le AI
          pack.push({
            id: player.id,
            x: player.x,
            y: player.y
          });
      } else { // Sinon mettre a jour le joueur
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

  // Fonction pour la mise à jour des balls
  this.updateBalls = function() {
    var pack = [];
    for(var i in this.balls) { // Pour chaque ball
      var ball = this.balls[i];

      ball.update(); // Mettre à jour le ball

      pack.push({
        id: ball.id,
        x: ball.x,
        y: ball.y
      });
    }
    return pack;
  }

  // Supprimer un joueur du jeu
  this.removePlayers = function() {
    this.sendPackage('remove', this.removePack);
    this.removePack = [];
  }

  // Envoyer un packet au joueurs du jeu
  this.sendPackage = function(type, pack) {
    for(var i in this.players) {
      var p = this.players[i];
      if(!p.isAI) {
        var socket = SOCKET_LIST[p.id];
        socket.emit(type, pack);
      }
    }
  }

  this.assignAttributesToPlayer(player); // Donner des attributs au joueur
  this.sendMap({ ww: this.map.wallWidth, walls: Wall.list }); // Envoyer la map au joueurs
  this.pushPlayerToInitPack(player); // Mettre le joueur dans le pack d'initialization
  for(var i in this.balls) { // Pour tout les balls
    this.pushBallToInitPack(this.balls[i]); // Mettre le ball dans le pack d'initialization
  }
} // Fin classe Game



///////////////////////////
//          MAP          //
///////////////////////////

// La classe pour la map
var Map = function(game) {
  var w = game.width; // La longeur de la map
  var h = game.height; // La largeur de la map
  var ww = game.wallWidth; // L'épaisseur des murs

  this.wallWidth = game.wallWidth;

  this.ww = ww;

  var wall = new Wall(150, 30);
  Wall.list[wall.id] = wall;

  wall = new Wall(210, 330);
  Wall.list[wall.id] = wall;

  var goal = new Goal(210, 150, 1);
  Goal.list[goal.localId] = goal;

  goal = new Goal(30, 330, 2);
  Goal.list[goal.localId] = goal;
} // fin classe Map



///////////////////////////
//         WALL          //
///////////////////////////

var Wall = function(angle1, angle2) {
  this.id = random(1, 1000000);
  this.angle1 = angle1;
  this.angle2 = angle2;
  this.x1 = Math.cos(angle1 * Math.PI / 180) * 350;
  this.y1 = Math.sin(angle1 * Math.PI / 180) * 350;
  this.x2 = Math.cos(angle2 * Math.PI / 180) * 350;
  this.y2 = Math.sin(angle2 * Math.PI / 180) * 350;

  return this;
}

Wall.list = {}



///////////////////////////
//         GOAL          //
///////////////////////////

var Goal = function(angle1, angle2, localId) {
  this.id = random(1, 1000000);
  this.localId = localId
  this.angle1 = angle1;
  this.angle2 = angle2;
  this.x1 = Math.cos(angle1 * Math.PI / 180) * 350;
  this.y1 = Math.sin(angle1 * Math.PI / 180) * 350;
  this.x2 = Math.cos(angle2 * Math.PI / 180) * 350;
  this.y2 = Math.sin(angle2 * Math.PI / 180) * 350;
  this.px1 = Math.cos(angle1 * Math.PI / 180) * 340;
  this.py1 = Math.sin(angle1 * Math.PI / 180) * 340;
  this.px2 = Math.cos(angle2 * Math.PI / 180) * 340;
  this.py2 = Math.sin(angle2 * Math.PI / 180) * 340;
}

Goal.list = {}



///////////////////////////
//         BALL          //
///////////////////////////

// Classe pour des balls
var Ball = function(game) {
  this.id = random(1, 1000000000); // Attribution d'un id au ball
  this.radius = 5; // Le rayon du ball
  this.x = -300;
  this.y = -150;
  this.speed = 4;
  this.accel = 4;
  this.spdX = this.speed;
  this.spdY = this.speed;
  // this.color = "rgb(" + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ")";
  this.color = 'white';
  this.game = game;

  this.targets = {
    players: {},
    walls: {},
    goals: {}
  };
  for(var i in game.players) {
    this.targets.players[i] = game.players[i];
  }
  for(var i in Wall.list) {
    this.targets.walls[i] = Wall.list[i];
  }
  for(var i in Goal.list) {
    this.targets.goals[i] = Goal.list[i];
  }

  this.update = function() {
    var newPos = this.accelerate();
    var item, intercept, goal;
    for(var i in this.targets.players) {
      if(!intercept) {
        p = this.targets.players[i];
        if(p.localId == 1) {
          intercept = this.ballIntercept(p, newPos.dx, newPos.dy, false);
        } else {
          intercept = this.ballIntercept(p, newPos.dx, newPos.dy, false);
        }
      }
    }
    if(!intercept) {
      for(var i in this.targets.walls) {
        if(!intercept) {
          w = this.targets.walls[i];
          intercept = this.ballIntercept(w, newPos.dx, newPos.dy, false);
        }
      }
    }
    if(!intercept) {
      for(var i in this.targets.goals) {
        if(!goal) {
          g = this.targets.goals[i];
          if(this.game.players[1].goal == g) {
            goal = this.ballIntercept(g, newPos.dx, newPos.dy, true);
          } else {
            goal = this.ballIntercept(g, newPos.dx, newPos.dy, false);
          }
        }
      }
    }
    this.spdX = newPos.spdX;
    this.spdY = newPos.spdY;
    this.x += this.spdX;
    this.y += this.spdY;

    if(goal) {
      console.log(goal);
      this.game.goal(1, this);
      this.reset(1);
    }

    if(intercept) { // Si le ball est touché par un joueur
      switch(intercept.d) {
        case 'left':
        case 'right':
          this.x = intercept.x;
          this.spdX = -this.spdX;
          break;
        case 'top':
        case 'bottom':
          this.y = intercept.y;
          this.spdY = -this.spdY
          break;
      }
    }

    this.setSides();
  }

  this.ballIntercept = function(item, dx, dy, debug) {
    var inter;
    if(dx < 0) { // Si le ball bouge vers la gauche
      var right = item.x2 + this.radius
      inter = intercept(this.x, this.y,
                                 this.x + dx, this.y + dy,
                                 right, item.y1 - this.radius,
                                 right, item.y2 + this.radius,
                                 'right', debug); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté droite du joueur
    } else if(dx > 0) { // Sinon si le ball bouge vers la droite
      var left = item.x1 - this.radius;
      inter = intercept(this.x, this.y,
                                 this.x + dx, this.y + dy,
                                 left, item.y1 - this.radius,
                                 left, item.y2 + this.radius,
                                 'left', debug); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté gauche du joueur
    } // fin si
    if(!inter) { // Si il n'y a pas encore eu d'interception
      if (dy < 0) { // Si le ball bouge vers le haut
        var bottom = item.y2 + this.radius;
        inter = intercept(this.x, this.y,
                                   this.x + dx, this.y + dy,
                                   item.x1 - this.radius, bottom,
                                   item.x2 + this.radius, bottom,
                                   'bottom', debug); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté haute du joueur
      } else if (dy > 0) { // Sinon si le ball bouge vers le bas
        var top = item.y2 - this.radius;
        inter = intercept(this.x, this.y,
                                   this.x + dx, this.y + dy,
                                   item.x1 - this.radius, top,
                                   item.x2 + this.radius, top,
                                   'top', debug); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté bas du joueur
      } // fin si
    } // fin si
    return inter;
  } // fin ballIntercept

  this.reset = function(id) {
    this.x = -300;
    this.y = -150;
    this.speed = 4;
    this.spdX = this.speed;
    this.spdY = this.speed;
    this.setSides();
  }

  this.setSides = function() {
    this.left   = this.x - this.radius;
    this.top    = this.y - this.radius;
    this.right  = this.x + this.radius;
    this.bottom = this.y + this.radius;
  }

  this.accelerate = function() {
    var accel = 1 + (this.accel * 1/60 * 1/60 * 0.5);
    var spdX2 = this.spdX * accel;
    var spdY2 = this.spdY * accel;
    var x2  = this.x + spdX2;
    var y2  = this.y + spdY2;
    return { dx: (x2-this.x), dy: (y2-this.y), x: x2, y: y2, spdX: spdX2, spdY: spdY2 };
    //return {x: x, y: y, dx: dx, dy: dy}
  }

  this.setSides();
}



///////////////////////////
//        PLAYER         //
///////////////////////////

var LEVELS = [
  { aiReaction: 0.2, aiError:  0 }, // 0:  ai is losing by 8
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
  this.x1 = 0;
  this.y1 = 0;
  this.x2 = 0;
  this.y2 = 0;
  this.width = 12;
  this.height = 60;
  this.speed = 0.75;
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
    this.setSides();
  }

  this.setSides = function() {
    this.x1 = this.x;
    this.y1 = this.y - (this.height/2);
    this.x2 = this.x;
    this.y2 = this.y + (this.height/2);
  }

  this.getPosition = function() {
    var x = Math.cos(this.angle * Math.PI / 180) * 350;
    var y = Math.sin(this.angle * Math.PI / 180) * 350;
    var point = intercept(0, 0, x, y, this.goal.px1, this.goal.py1, this.goal.px2, this.goal.py2, "lol", false);
    return point;
  }

  this.update = function() {
    var leftAngle = this.goal.angle1;
    var rightAngle = this.goal.angle2;
    if(leftAngle < this.angle) {
      leftAngle += 360;
    }
    if(rightAngle > this.angle) {
      rightAngle -= 360;
    }
    if(this.moveUp && this.angle < leftAngle-5) {
      this.angle += this.speed;
      point = this.getPosition();
      this.x = point.x;
      this.y = point.y;
    } else if(this.moveDown && this.angle > rightAngle+5) {
      this.angle -= this.speed;
      point = this.getPosition();
      this.x = point.x;
      this.y = point.y;
    }
    this.setSides();
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
