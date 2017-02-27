// Mettre bibliothèque express dans une variable
var express = require('express');
// Creation d'une application express
var app = express();
// Creation d'un server express
var server = require('http').Server(app);
// Utilisation de socket.io par le server express
var io = require('socket.io')(server, {});

var SOCKET_LIST = {};

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



///////////////////////////
//        HELPERS        //
///////////////////////////

random = function(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

randomChoice = function() {
  return arguments[this.random(0, arguments.length)];
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

getEquation = function(x1, y1, x2, y2) {
  var b = ((x1 * y2) - (x2 * y1)) / (x1 - x2);
  var a = (y1 - b) / x1;
  return { a: a, b: b};
}

var NAMES = ["ninja", "chair", "pancake", "statue", "unicorn", "rainbows", "laser", "senor", "bunny", "captain", "nibblets", "cupcake", "carrot", "gnomes", "glitter", "potato", "salad", "toejam", "curtains", "beets", "toilet", "exorcism", "stick figures", "mermaid eggs", "sea barnacles", "dragons", "jellybeans", "snakes", "dolls", "bushes", "cookies", "apples", "ice cream", "ukulele", "kazoo", "banjo", "opera singer", "circus", "trampoline", "carousel", "carnival", "locomotive", "hot air balloon", "praying mantis", "animator", "artisan", "artist", "colorist", "inker", "coppersmith", "director", "designer", "flatter", "stylist", "leadman", "limner", "make-up artist", "model", "musician", "penciller", "producer", "scenographer", "set decorator", "silversmith", "teacher", "auto mechanic", "beader", "bobbin boy", "clerk of the chapel", "filling station attendant", "foreman", "maintenance engineering", "mechanic", "miller", "moldmaker", "panel beater", "patternmaker", "plant operator", "plumber", "sawfiler", "shop foreman", "soaper", "stationary engineer", "wheelwright", "woodworkers"];



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
  this.maxPlayers = 6;                    // Le nombre max des joueurs dans le jeu
  this.players = {};                      // La liste des joueurs dans le jeu
  this.players[player.localId] = player;  // Ajouter le premier à la liste des joueurs
  this.playerCount = 1;                   // Le nombre de joueurs dans le jeu
  this.playerPosition = 332;
  this.width = 800;                       // la longeur du jeu (pour la map)
  this.height = 800;                      // La hauteur du jeu (pour la map)
  this.wallWidth = 12;                    // L'épaisseur des murs
  this.map = new Map(this.playerPosition);           // Création du map
  this.ballCount = 1;                     // Le nombre de balls dans le jeu
  this.constructBalls = function() {      // Creation de tout les balls
    var balls = [];
    for(var n = 0 ; n < this.ballCount ; n++)
      balls.push(new Ball(this.id)); // Création d'une balle et la mettre dans la liste balls
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
    var goal = this.map.goals[player.localId];
    player.x = (goal.px1 + goal.px2) / 2;
    player.y = (goal.py1 + goal.py2) / 2;
    var angle = Math.abs(Math.atan2(player.y, player.x)) * 180 / Math.PI;
    if(goal.angle2 == 0) {
      player.angle = (goal.angle1 + 360) / 2;
    } else {
      player.angle = (goal.angle1 + goal.angle2) / 2;
    }
    player.rotation = goal.rotation;
    player.position = goal.length/2;
    player.destination = player.position;
    player.goal = goal;
  } // fin assignAttributesToPlayer

  this.joinPlayer = function(player) { // Ajouter un joueur au jeu
    var i = 1;
    var joined = false;
    while(!joined && i <= this.maxPlayers) {
      if(this.players[i].isAI) {
        player.localId = i;
        this.removePack.push(this.players[i].id);
        joined = true;
      }
      i++;
    }
    this.players[player.localId] = player; // Le joueur est ajouté au liste des joueurs du jeu
    this.playerCount++; // Incrementation du compteur de joueurs
    this.assignAttributesToPlayer(player); // Ajouter des attributs au joueur
    player.joinedGame = true; // Le joueur à rejoint un jeu
    this.sendMap(); // Envoyer le map au joueur
    for(var i in this.players) {
        this.pushPlayerToInitPack(this.players[i]); // Mettre le joueur dans le pack d'initialization
    }
    for(var i in this.balls) { // Pour tout les balls
      this.pushBallToInitPack(this.balls[i]); // Mettre le ball dans le pack d'initialization
    }
    this.initPlayers();
  } // fin joinPlayer

  this.createAI = function() { // Fonction pour la creation d'un AI
    var aiSocket = { id: random(1, 1000000000) }; // Attribution d'un id
    var name = NAMES[random(0, NAMES.length)] + "[AI]";
    var color = COLORS[random(0, COLORS.length)].hexValue;
    var ai = new Player(aiSocket, name, color ,true); // Creation d'un joueur AI
    Player.list[ai.id] = ai; // Ajout au liste des joueurs
    var i = 1;
    var joined = false;
    while(!joined && i <= this.maxPlayers) {
      if(this.players[i] == undefined) {
        ai.localId = i;
        joined = true;
      }
      i++
    }
    this.players[ai.localId] = ai; // Ajouter le AI au liste des joueurs du jeu
    this.assignAttributesToPlayer(ai); // Ajouter des attributs au AI
    this.pushPlayerToInitPack(ai); // Fonction pour signaler les autres joueurs qu'un AI a rejoint la partie
    this.initPlayers();
  } // fin createAI

  this.goal = function(id, loser) { // si il y a eu un but
    // if(this.playerCount == 2) { // le score est seulement compter si il y a deux joueurs connecté (le score contre un bot n'es pas compté)
    //   var player = this.players[localId];
    //   player.score += 1; // Incrementation du score du joueur qui à fait le but
    //   this.sendPackage('addToChat', this.players[1].score + ' - ' + this.players[2].score); // Envoyer le score au joueurs
    // }
    var p = this.players[id];
    var l = this.players[loser];
    if(p) {
      p.score += 1;
      this.sendPackage('scored', { id: p.id, score: p.score});
    } else {
      l.score -= 1;
      this.sendPackage('scored', { id: l.id, score: l.score});
    }
  }

  // Fonction pour envoyer la map
  this.sendMap = function() {
    this.sendPackage('map', { playerY: this.playerY, walls: this.map.walls, goals: this.map.goals });
  }

  // Fonction pour mettre en joueur dan le pack d'initialization
  this.pushPlayerToInitPack = function(player) {
    this.initPack.players.push({
      isAI: player.isAI,
      id: player.id,
      localId: player.localId,
      username: player.username,
      angle: player.angle,
      rotation: player.rotation,
      position: player.position,
      x: player.x,
      y: player.y,
      x1: player.x1,
      y1: player.y1,
      x2: player.x2,
      y2: player.y2,
      width: player.width,
      height: player.height,
      length: player.goal.length,
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
      speed: ball.speed,
      accel: ball.accel,
      spdX: ball.spdX,
      spdY: ball.spdY,
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

  this.count = 0;

  //Fonction pour la gestion de l'ia
  this.ai = function() {
    for(var i in this.balls) {
      var ball = this.balls[i];
      var b = new Ball();
      b.x = ball.x;
      b.y = ball.y;
      b.spdX = ball.spdX;
      b.spdY = ball.spdY;
      b.game = ball.game;
      var newPosition = b.accelerate();
      //var interception = intercept(b.x, b.y, newPosition.x, newPosition.y, player.goal.x1, player.goal.y1, player.goal.x2, player.goal.y2, false);
      var interception;
      var i = 0;
      while(!interception && i < 1000) {
        interception = b.update(this.players, this.map.walls, this.map.goals, true);
        i++
      }

      if(interception) {
        if(interception.player) {
          // var p = this.players[interception.id];
          // if(p.isAI && i < p.distance) {
          //   p.destination = this.position;
          //   p.distance = i;
          // }
        } else {
          var g = this.map.goals[interception.id];
          //console.log("found interception in goal " + g.localId);
          var p = this.players[g.localId];
          if(p.isAI) {
            //console.log("interception at: " + interception.x + " " + interception.y);
            var d = Math.sqrt(Math.pow(interception.x-g.x2, 2) + Math.pow(interception.y-g.y2, 2));
            if(!p.destination || i < p.distance) {
              p.destination = d;
              p.distance = i;
            }
          }
        }
      }

      for(var i in this.players) {
        var p = this.players[i];
        if(p.isAI && !p.destination) {
          var d = random(0, p.goal.length);
          p.destination = d;
        }
      }
    }
  }

  // Fonction pour le mise a jour des joueurs
  this.updatePlayers = function() {
    var pack = [];
    // for(var i in this.balls) {
    //   var ball = this.balls[i];
    //   this.ai(ball); // Appel de la fonction ai pour chaque ball dans le jeu
    // }

    for(var i in this.players) { // Pour chaque joueur
      var player = this.players[i];
        player.update();
        if(player.isAI) {
          pack.push({
          id: player.id,
          position: player.position,
          x: player.x,
          y: player.y,
          destination: player.destination});
        } else {
          pack.push({
          id: player.id,
          position: player.position,
          x: player.x,
          y: player.y,
          moveLeft: player.moveLeft,
          moveRight: player.moveRight});
        }
    }
    return pack;
  }

  // Fonction pour la mise à jour des balls
  this.updateBalls = function() {
    var pack = [];
    for(var i in this.balls) { // Pour chaque ball
      var ball = this.balls[i];

      ball.update(this.players, this.map.walls, this.map.goals, false); // Mettre à jour le ball
      if(ball.color !== undefined) {
        pack.push({
          id: ball.id,
          x: ball.x,
          y: ball.y,
          spdX: ball.spdX,
          spdY: ball.spdY,
          color: ball.color
        });
        ball.color = undefined;
      } else {
        pack.push({
          id: ball.id,
          x: ball.x,
          spdX: ball.spdX,
          spdY: ball.spdY,
          y: ball.y
        });
      }
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
  this.playerY = player.y;
  this.sendMap(); // Envoyer la map au joueurs
  this.pushPlayerToInitPack(player); // Mettre le joueur dans le pack d'initialization
  for(var i = 0; i < this.maxPlayers-1; i++) {
    this.createAI();  // Mettre des AI sur tout les places vide du jeu
  }
  for(var i in this.balls) { // Pour tout les balls
    this.pushBallToInitPack(this.balls[i]); // Mettre le ball dans le pack d'initialization
  }
  this.ai();
}//Fin de la classe game



///////////////////////////
//          MAP          //
///////////////////////////

// La classe pour la map
var Map = function(p) {
  // var w = game.width; // La longeur de la map
  // var h = game.height; // La largeur de la map
  // var ww = game.wallWidth; // L'épaisseur des murs
  //
  // this.wallWidth = game.wallWidth;

  //this.ww = ww;

  this.walls = {};
  this.goals = {};

  console.log("REAL WALLS");
  var wall = new Wall(55, 65);
  this.walls[wall.id] = wall;

  wall = new Wall(115, 125);
  this.walls[wall.id] = wall;

  wall = new Wall(175, 185);
  this.walls[wall.id] = wall;

  wall = new Wall(235, 245);
  this.walls[wall.id] = wall;

  wall = new Wall(295, 305);
  this.walls[wall.id] = wall;

  wall = new Wall(355, 5);
  this.walls[wall.id] = wall;


  // console.log("TEMP WALLS");
  // var wall = new Wall(60, 120);
  // Wall.list[wall.id] = wall;
  //
  // wall = new Wall(180, 240);
  // Wall.list[wall.id] = wall;
  //
  // wall = new Wall(300, 0);
  // Wall.list[wall.id] = wall;


  var goal = new Goal(65, 115, 1, p);
  this.goals[goal.localId] = goal;

  goal = new Goal(125, 175, 3, p);
  this.goals[goal.localId] = goal;

  goal = new Goal(185, 235, 5, p);
  this.goals[goal.localId] = goal;

  goal = new Goal(245, 295, 2, p);
  this.goals[goal.localId] = goal;

  goal = new Goal(305, 355, 4, p);
  this.goals[goal.localId] = goal;

  goal = new Goal(5, 55, 6, p);
  this.goals[goal.localId] = goal;
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

  // if(this.angle2 == 0) {
  //   this.rotation = this.angle2 + (360 - this.angle1);
  // } else {
  //   this.rotation = this.angle2 + (this.angle2 - this.angle1);
  // }

  //this.rotation = 180 + ((180 - Math.abs(this.angle1 - this.angle2)) / 2) - this.angle1;

  if(this.angle1 < this.angle2) {
    this.rotation = this.angle2 + ((180 - Math.abs(this.angle1 - this.angle2)) / 2);
  } else {
    this.rotation = 360 + this.angle2 + ((180 - Math.abs(this.angle1 - this.angle2 - 360)) / 2);
  }

  console.log("ROTATION: " + this.rotation);

  return this;
}

Wall.list = {}



///////////////////////////
//         GOAL          //
///////////////////////////

var Goal = function(angle1, angle2, localId, pos) {
  this.id = random(1, 1000000);
  this.localId = localId;
  this.angle1 = angle1;
  this.angle2 = angle2;
  this.x1 = Math.cos(angle1 * Math.PI / 180) * 350;
  this.y1 = Math.sin(angle1 * Math.PI / 180) * 350;
  this.x2 = Math.cos(angle2 * Math.PI / 180) * 350;
  this.y2 = Math.sin(angle2 * Math.PI / 180) * 350;
  this.px1 = Math.cos(angle1 * Math.PI / 180) * pos;
  this.py1 = Math.sin(angle1 * Math.PI / 180) * pos;
  this.px2 = Math.cos(angle2 * Math.PI / 180) * pos;
  this.py2 = Math.sin(angle2 * Math.PI / 180) * pos;

  var eq = getEquation(this.x1, this.y1, this.x2, this.y2);

  this.a = eq.a;
  this.b = eq.b;

  eq = getEquation(this.px1, this.py1, this.px2, this.py2);

  this.pa = eq.a;
  this.pb = eq.b;

  this.length = Math.sqrt(Math.pow(this.x1 - this.x2, 2) + Math.pow(this.y1 - this.y2, 2));

  if(this.angle1 < this.angle2) {
    this.rotation = this.angle2 + ((180 - Math.abs(this.angle1 - this.angle2)) / 2);
  } else {
    this.rotation = 360 + this.angle2 + ((180 - Math.abs(this.angle1 - this.angle2 - 360)) / 2);
  }
}

Goal.list = {}



///////////////////////////
//         BALL          //
///////////////////////////

// Classe pour des balls
var Ball = function(game) {
  this.id = random(1, 1000000000); // Attribution d'un id au ball
  this.radius = 5; // Le rayon du ball
  this.x = 0;
  this.y = 0;
  this.speed = 6;
  this.accel = 1;
  var a = random(0, 360);
  this.spdX = Math.cos(a / 180 * Math.PI) * this.speed;
  this.spdY = Math.sin(a / 180 * Math.PI) * this.speed;
  // this.color = "rgb(" + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ")";
  this.color = 'black';
  this.game = game;
  this.player = 0;

  // this.targets = {
  //   players: {},
  //   walls: {},
  //   goals: {}
  // };
  // for(var i in game.players) {
  //   this.targets.players[i] = game.players[i];
  // }
  // for(var i in game.map.walls) {
  //   this.targets.walls[i] = game.map.walls[i];
  // }
  // for(var i in game.map.goals) {
  //   this.targets.goals[i] = game.map.goals[i];
  // }

  this.findIntercept = function(newPos, players, walls, debug) {
    var foundIntercept;
    for(var i in players) {
      if(!foundIntercept) {
        p = players[i];
        foundIntercept = intercept(this.x, this.y, newPos.dx, newPos.dy, p.x1, p.y1, p.x2, p.y2, false);
        if(foundIntercept) {
          foundIntercept.rotation = p.rotation;
          foundIntercept.isPlayer = true;
          foundIntercept.id = p.localId;
        }
      }
    }
    if(!foundIntercept) {
      for(var i in walls) {
        if(!foundIntercept) {
          w = walls[i];
          //foundIntercept = this.ballIntercept(w, newPos.dx, newPos.dy, true);
          foundIntercept = intercept(this.x, this.y, newPos.x, newPos.y, w.x1, w.y1, w.x2, w.y2, false);
          if(foundIntercept) {
            if(debug) {
            }
            foundIntercept.rotation = w.rotation;
          }
        }
      }
    }
    return foundIntercept;
  }

  this.findGoal = function(newPos, goals) {
    var goal
    for(var i in goals) {
      if(!goal) {
        g = goals[i];
        goal = intercept(this.x, this.y, newPos.x, newPos.y, g.x1, g.y1, g.x2, g.y2, true);
        if(goal) {
          goal.id = goals[i].localId;
        }
      }
    }
    return goal;
  }

  this.changeCours = function(foundIntercept) {
    this.x = foundIntercept.x;
    this.y = foundIntercept.y;
    if(foundIntercept.isPlayer) {
      var p = gameServer.rooms[this.game].players[foundIntercept.id];
      var d = Math.sqrt(Math.pow(foundIntercept.x-p.x, 2) + Math.pow(foundIntercept.y-p.y, 2));
      var d2 = Math.sqrt(Math.pow(foundIntercept.x-p.x1, 2) + Math.pow(foundIntercept.y-p.y1, 2));
      var perc = d/p.width;
      var angle = 45 * perc;
      if(d2 < p.width) {
        angle *= -1;
      }
      this.spdX = Math.cos((90 + angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
      this.spdY = Math.sin((90 + angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
      this.player = foundIntercept.id;
      this.color = gameServer.rooms[this.game].players[foundIntercept.id].color;
    } else {
      this.spdX = Math.cos((foundIntercept.angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
      this.spdY = Math.sin((foundIntercept.angle + foundIntercept.rotation) / 180 * Math.PI) * this.speed;
    }
    this.x += this.spdX * 0.1;
    this.y += this.spdY * 0.1;
  }

  this.update = function(players, walls, goals, forAI) {
    var newPos = this.accelerate();
    var item, foundIntercept, goal, rotation, id;
    var isPlayer = false;
    foundIntercept = this.findIntercept(newPos, players, walls, !forAI);
    if(!foundIntercept) {
      goal = this.findGoal(newPos, goals);
    }

    this.speed = newPos.speed;
    this.spdX = newPos.spdX;
    this.spdY = newPos.spdY;

    if(goal) {
      if(forAI) {
        return {id: goal.id, x: goal.x, y: goal.y};
      }
      gameServer.rooms[this.game].goal(this.player, goal.id);
      this.reset();
      //console.log(goal);
      //this.game.goal(1, this);
      //this.reset(1);

      // this.x = goal.x;
      // this.y = goal.y;
    }

    if(foundIntercept) {
      if(forAI && foundIntercept.isPlayer) {
        return {id: foundIntercept.id, player: true};
      }
      this.changeCours(foundIntercept);
      var x = this.x + this.spdX;
      var y = this.y + this.spdY;
      var pos = {
        x: x,
        y: y
      }
      var secondIntercept, secondGoal;
      secondIntercept = this.findIntercept(pos, players, walls, false);
      if(!secondIntercept) {
        secondGoal = this.findGoal(pos, goals);
      }
      if(secondGoal) {
        if(forAI) {
          return {id: secondGoal.id, x: secondGoal.x, y: secondGoal.y};
        }
        this.reset();
      }
      if(secondIntercept) {
        console.log(secondIntercept);
        this.changeCours(secondIntercept);
      }
    }

    this.x += this.spdX;
    this.y += this.spdY;

    this.setSides();

    if(foundIntercept && !forAI && foundIntercept.isPlayer) {
      gameServer.rooms[this.game].ai();
    }
  }

  this.reset = function() {
    this.x = 0;
    this.y = 0;
    this.speed = 6;
    this.player = 0;
    this.color = '#000';
    var a = random(0, 360);
    this.spdX = Math.cos(a / 180 * Math.PI) * this.speed;
    this.spdY = Math.sin(a / 180 * Math.PI) * this.speed;
    this.setSides();
    gameServer.rooms[this.game].ai();
  }

  this.setSides = function() {
    this.left   = this.x - this.radius;
    this.top    = this.y - this.radius;
    this.right  = this.x + this.radius;
    this.bottom = this.y + this.radius;
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

  this.setSides();
}// fin de la classe ball



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

var Player = function(socket, username, color, isAI) {
  this.isAI = isAI;
  this.id = socket.id;
  this.username = username;
  this.x = 0;
  this.y = 0;
  this.x1 = 0;
  this.y1 = 0;
  this.x2 = 0;
  this.y2 = 0;
  this.width = 30;
  this.height = 60;
  this.speed = 4;
  this.color = color;
  //this.color = "rgb(" + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ", " + Math.round(random(0,255)) + ")";
  //this.color = 'white';
  this.score = 0;

  this.moveRight = false;
  this.moveLeft = false;
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
    var x = Math.cos(this.rotation / 180 * Math.PI) * this.width;
    var y = Math.sin(this.rotation / 180 * Math.PI) * this.width;
    this.x1 = this.x + x;
    this.y1 = this.y + y;
    x *= -1;
    y *= -1;
    this.x2 = this.x + x;
    this.y2 = this.y + y;
  }

  this.getPosition = function() {
    var x = Math.cos(this.angle * Math.PI / 180) * 350;
    var y = Math.sin(this.angle * Math.PI / 180) * 350;
    var point = intercept(0, 0, x, y, this.goal.px1, this.goal.py1, this.goal.px2, this.goal.py2, false);
    return point;
  }

  this.update = function() {
    if(this.isAI && this.destination) {
      if(Math.abs(this.destination - this.position) > 20 || this.position < this.width+this.speed || this.position > this.goal.length-this.width-this.speed) {
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
    } else if(this.moveRight && this.position < this.goal.length-this.width-this.speed) {
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
};

Player.list = {};

Player.onconnect = function(socket, data) {
  var player = new Player(socket, data.username, data.color, false);
  Player.list[player.id] = player;
  gameServer.findGame(player);

  socket.on('keyPress', function(data) {
    if(data.inputId === 'left') {
      player.moveLeft = data.state;
    } else if(data.inputId === 'right') {
      player.moveRight = data.state;
    }
    //else
    // if(data.inputId === 'up') {
    //   player.moveUp = data.state;
    // } else if(data.inputId === 'down') {
    //   player.moveDown = data.state;
    // }
  });

  socket.on('sendMessage', function(data) {
    var room = gameServer.rooms[player.roomId];
    for(var i in room.players) {
      if(!room.players[i].isAI) {
        var socket = SOCKET_LIST[room.players[i].id];
        socket.emit('addToChat', { id: data.id, msg: data.msg });
      }
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
