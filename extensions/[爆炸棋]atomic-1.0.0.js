exports.key = 'atomic'
exports.name = '爆炸棋'
exports.author = 'ArcanaEden'
exports.version = '1.0.0'
ClearPieces = (chessboard, pos) => {
  const dir = [1,2,3,4,5,6,7,8]
  for (const range of dir){
    const newPos = exports.API.getNewPos(pos, range)
    if(!exports.API.isInChessboard(chessboard, newPos)) continue
    const chess = exports.API.getChess(chessboard, newPos)
    if(!chess) continue
    if(chess.id === 11 || chess.id === 12) continue
    exports.API.setChess(chessboard, newPos, null)
    if (chess.isChief) exports.API.endGame(chess.camp === 1 ? 2 : 1)
  }
}
exports.onDeath = (chessboard, pos, oldChess) => {
  ClearPieces(chessboard, pos)
}
exports.afterMove = (chessboard, _from, _to, turn) => {
  var chess = exports.API.getChess(chessboard, _to)
  if(chess.id === 11 || chess.id === 12){
    for(var pos of chess.attr.EnPassant){
      if(pos[0] == _to[0] && pos[1] == _to[1]){
        ClearPieces(chessboard, _to)
      }
    }
  }
}