exports.key = 'flxg-chess'
exports.name = '废理兴工棋'
exports.author = 'XeF2, Lithium'
exports.version = '1.0.1'
exports.modifyMove = (chessboard, pos, availableMoves) => {
  const chess = exports.API.getChess(chessboard, pos)
  if (chess.id === 99) {
    exports.API.traverseMoveRanges(chessboard, pos, (newPos) => {
      const targetChess = exports.API.getChess(chessboard, newPos)
      if (targetChess?.camp) availableMoves.push(newPos)
      return Boolean(targetChess)
    })
  } else if (chess.id === 11 || chess.id === 12) {
    if (!chess.attr.promoted) return
    availableMoves.length = 0
    exports.API.traverseMoveRanges(chessboard, pos, (newPos) => {
      const targetChess = exports.API.getChess(chessboard, newPos)
      if (targetChess?.id === 101 || targetChess?.id === 102) return false
      if (targetChess && !exports.API.canEat(chess.camp, targetChess.camp)) return true
      availableMoves.push(newPos)
      return Boolean(targetChess)
    })
  }
}
