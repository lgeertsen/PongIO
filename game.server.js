var gameServer = {
  games: {},
  gameCount: 0
}

gameServer.findGame = function(player) {
  console.log("Looking for a game. We have: " + this.gameCount + " games");
}
