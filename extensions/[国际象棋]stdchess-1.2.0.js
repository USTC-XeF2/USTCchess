exports.key = 'stdchess'
exports.name = '国际象棋'
exports.author = 'ArcanaEden'
exports.version = '1.2.0'
canBeAttacked = (chessboard, pos, checkingcamp) => {
  for(var i=0;i<chessboard.length;i++)for(var j=0;j<chessboard[0].length;j++){
    var chess1 = exports.API.getChess(chessboard, [i,j])
    if(!chess1) continue
    if(!chess1.attr.moveRangeTemp) continue
    for(var s of chess1.attr.moveRangeTemp){
      //if(exports.API.canEat(chess1.camp, chess2.camp))exports.API.setChess(chessboard, [i,j], king)
       if(s[0]==pos[0] && s[1]==pos[1])
      if(exports.API.canEat(chess1.camp, checkingcamp)){
        return true
      }}
  }
  return false
}
exports.modifyMove = (chessboard, pos, availableMoves) => {
  const chess = chessboard[pos[0]][pos[1]]
  if (chess.id === 5 || chess.id === 6) {
    const moveRanges = [
      [1, 8, 2],
      [3, 2, 4],
      [5, 4, 6],
      [7, 6, 8]
    ]
    for (const range of moveRanges) {
      const newPos = exports.API.getNewPos(pos, range[0])
      if (!exports.API.isInChessboard(chessboard, newPos)) continue
      for (const nextDir of range.slice(1)) {
        const nextPos = exports.API.getNewPos(newPos, nextDir)
        if (!exports.API.isInChessboard(chessboard, nextPos)) continue
        const nextChess = exports.API.getChess(chessboard, nextPos)
        if (nextChess && !exports.API.canEat(chess.camp, nextChess.camp)) continue
        availableMoves.push(nextPos)
      }
    }
  }
  else if(chess.id === 11 || chess.id === 12){
    const dir=[[2,8],[4,6]], move=[1,5]
    for (const range of dir[chess.camp - 1]) {
        const newPos = exports.API.getNewPos(pos, range)
        if (!exports.API.isInChessboard(chessboard, newPos)) continue
        const nextChess = exports.API.getChess(chessboard, newPos)
        if (!nextChess || !exports.API.canEat(chess.camp, nextChess.camp)) continue
        availableMoves.push(newPos) // Capture diagonally
    }
    const r=move[chess.camp - 1]
    const newPos = exports.API.getNewPos(pos, r)
    if (exports.API.isInChessboard(chessboard, newPos)) {
        const nextChess = exports.API.getChess(chessboard, newPos)
        if(!nextChess){
          availableMoves.push(newPos) // Normal move (cannot capture)
          if(pos[0] <= 1 || pos[0] >= 6){
              const nextPos = exports.API.getNewPos(newPos, r)
              if (exports.API.isInChessboard(chessboard, nextPos)) {
                  const nextChess = exports.API.getChess(chessboard, nextPos)
                  if(!nextChess)availableMoves.push(nextPos) // Move 2 grids if in second rank
              }
          }
        }
    }
    if(pos[0] == 3 || pos[0] == 4){
      const EnPassantDir = [[3,2,4],[7,8,6]]
      chess.attr.EnPassant = []
      for (const range of EnPassantDir) {
        const newPos = exports.API.getNewPos(pos, range[0])
        if (!exports.API.isInChessboard(chessboard, newPos)) continue
        const nextChess = exports.API.getChess(chessboard, newPos)
        if(!nextChess) continue
        if(nextChess.id != 23 - chess.id) continue
        if(nextChess.attr.promoted) continue // To Be Changed
        var detectPos = exports.API.getNewPos(newPos, [1,5][chess.camp - 1], 2)
        if(nextChess.attr.lastPos[0] != detectPos[0]) continue
        if(nextChess.attr.lastPos[1] != detectPos[1]) continue
        if(!nextChess.attr.justMoved) continue
        availableMoves.push(exports.API.getNewPos(pos, range[chess.camp]))
        chess.attr.EnPassant.push(exports.API.getNewPos(pos, range[chess.camp])) // En Passant
      }
    }
  }
  else if(chess.id === 1 || chess.id === 2){
    /*
    const move = [1,2,3,4,5,6,7,8]
    for (const range of move){
      const newPos = exports.API.getNewPos(pos, range)
      if(!exports.API.isInChessboard(newPos)) continue
      const nextChess = exports.API.getChess(chessboard, newPos)
      if (nextChess && !exports.API.canEat(chess.camp, nextChess.camp)) continue
      if (canBeAttacked(newPos,chess.camp)) continue
      availableMoves.push(newPos)
    }
    */
    const dir=[[3,3],[7,4]]
    for (const range of dir) {
      var kingPos = [[7,0][chess.camp - 1],4]
      var king = exports.API.getChess(chessboard, kingPos)
      if(king.id !== 1 && king.id !== 2) continue
      if(king.attr.lastPos) continue
      var rookPos = exports.API.getNewPos(kingPos, range[0], range[1])
      var rook = exports.API.getChess(chessboard, rookPos)
      if(rook.id !== 7 && rook.id !== 8) continue
      if(rook.attr.lastPos) continue
      var flag = 0
      flag |= canBeAttacked(kingPos,chess.camp)
      for(var i=0; i<2; i++){
        kingPos = exports.API.getNewPos(kingPos, range[0])
        flag |= canBeAttacked(kingPos,chess.camp)
        if(exports.API.getChess(chessboard, kingPos)) flag = 1
      }
      if(flag) continue
      availableMoves.push(kingPos) // Castling
    }
  }
  chess.attr.moveRangeTemp = availableMoves
  API.setChess(chessboard, pos, chess)
}
exports.afterMove = (chessboard, _from, _to, turn) => {
  for(var i=0;i<chessboard.length;i++)for(var j=0;j<chessboard[0].length;j++){
    var chess1 = exports.API.getChess(chessboard, [i,j])
    if(!chess1) continue
    if(chess1.id === 11 || chess1.id === 12){
      chess1.attr.justMoved = false
      exports.API.setChess(chessboard, [i,j], chess1)
    }
  }
  var chess = exports.API.getChess(chessboard, _to)
  chess.attr.lastPos = _from
  chess.attr.justMoved = true
  exports.API.setChess(chessboard, _to, chess)
  if(chess.id === 2){
    if(_from[0] == 0 && _from[1] == 4 && _to[0] == 0){
      if(_to[1] == 2) exports.API.moveChess(chessboard, [0,0], [0,3])
      if(_to[1] == 6) exports.API.moveChess(chessboard, [0,7], [0,5])
    }
  }
  else if(chess.id === 1){
    if(_from[0] == 7 && _from[1] == 4 && _to[0] == 7){
      if(_to[1] == 2) exports.API.moveChess(chessboard, [7,0], [7,3])
      if(_to[1] == 6) exports.API.moveChess(chessboard, [7,7], [7,5])
    }
  }
  else if(chess.id === 11 || chess.id === 12){
    for(var pos of chess.attr.EnPassant){
      if(pos[0] == _to[0] && pos[1] == _to[1]){
        exports.API.setChess(chessboard, [_from[0],_to[1]], null)
      }
    }
  }
}
