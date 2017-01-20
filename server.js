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
  this.width = 640;                       // la longeur du jeu (pour la map)
  this.height = 480;                      // La hauteur du jeu (pour la map)
  this.wallWidth = 12;                    // L'épaisseur des murs
  this.court = new Court(this);           // Création du map
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
    player.setPlayerPosition(player.localId, this.width); // Placer le joueur
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
    this.sendCourt(this.court); // Envoyer le map au joueur
    this.sendPackage('init', { players: this.players, balls: this.balls }); // Envoyer les infos de toutes les joueurs et balls existant au nouveau joueur
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

  // Fonction pour voir si la balle est touché
  this.ballIntercept = function(ball, player, dx, dy, ai) {
    var intercept; // Booléen: true si il y a une interception, false sinon
    if(dx < 0) { // Si le ball bouge vers la gauche
      var right = player.right + ball.radius
      intercept = this.intercept(ball.x, ball.y,
                                 ball.x + dx, ball.y + dy,
                                 right, player.top - ball.radius,
                                 right, player.bottom + ball.radius,
                                 'right', ai); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté droite du joueur
    } else if(dx > 0) { // Sinon si le ball bouge vers la droite
      var left = player.left - ball.radius;
      intercept = this.intercept(ball.x, ball.y,
                                 ball.x + dx, ball.y + dy,
                                 left, player.top - ball.radius,
                                 left, player.bottom + ball.radius,
                                 'left', ai); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté gauche du joueur
    } // fin si
    if(!intercept) { // Si il n'y a pas encore eu d'interception
      if (dy < 0) { // Si le ball bouge vers le haut
        var bottom = player.bottom + ball.radius;
        intercept = this.intercept(ball.x, ball.y,
                                   ball.x + dx, ball.y + dy,
                                   player.left - ball.radius, bottom,
                                   player.right + ball.radius, bottom,
                                   'bottom', ai); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté haute du joueur
      } else if (dy > 0) { // Sinon si le ball bouge vers le bas
        var top = player.top - ball.radius;
        intercept = this.intercept(ball.x, ball.y,
                                   ball.x + dx, ball.y + dy,
                                   player.left - ball.radius, top,
                                   player.right + ball.radius, top,
                                   'top', ai); // Appel de la fonction d'interception pour calculer si il y a une interception avec le coté bas du joueur
      } // fin si
    } // fin si
    return intercept;
  } // fin ballIntercept

  this.intercept = function(x1, y1, x2, y2, x3, y3, x4, y4, d, ai) { // fonction pour calculer si il y une interception
    // Fonction pour calculer l'intersection de deux segments de lignes (fait à partir d'un formule mathématique, retrouvable sur wikipedia, ...)
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
  } // fin intercept

  this.goal = function(localId, ball) { // si il y a eu un but
    if(this.playerCount == 2) { // le score est seulement compter si il y a deux joueurs connecté (le score contre un bot n'es pas compté)
      var player = this.players[localId];
      player.score += 1; // Incrementation du score du joueur qui à fait le but
      // if(player.score < 10) {
      //   this.sendPackage('scored', player.id);
      //   ball.reset(localId);
      // }
      this.sendPackage('addToChat', this.players[1].score + ' - ' + this.players[2].score); // Envoyer le score au joueurs
    }
    ball.reset(localId); // Remettre la ball en jeu du coté du joueur qui à fait le but
  }

  this.ai = function(ai, ball) { // Fonction pour gerer le AI
    if((ball.x < ai.left && ball.spdX < 0) || (ball.x > ai.right && ball.spdX > 0)) {
      ai.moveUp = false;
      ai.moveDown = false;
      return;
    } // Le AI bouge pas si la ball ne bouge pas vers le joueur et on sort de la fonction

    this.predict(ai, ball); // Predire l'arrivé du ball

    if(ai.prediction) { // Si il y a eu une prediction
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
    } // fin si
  } // fin ai

  this.predict = function(ai, ball) {
    // if(ai.prediction &&
    //    (ai.prediction.spdX * ball.spdX > 0) &&
    //    (ai.prediction.spdY * ball.spdY > 0) &&
    //    (ai.prediction.since < ai.level.aiReaction)) {
    //   ai.prediction.since += 1/60;
    //   return;
    // }

    var intercept = this.ballIntercept(ball, { left: ai.left, right: ai.right, top: -4800, bottom: 4800 }, ball.x + ball.spdX * 10, ball.x + ball.spdY * 10, true );

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
