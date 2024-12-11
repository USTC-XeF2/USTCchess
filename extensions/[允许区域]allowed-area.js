exports.key = 'allowed-area'
exports.name = '允许区域'
exports.author = 'XeF2'
exports.version = '1.0.0'
exports.modifyMove = (chessboard, pos, availableMoves) => {
  const chess = exports.API.getChess(chessboard, pos)
  if (!chess.attr.allowedArea) return
  for (let i = availableMoves.length - 1; i >= 0; i--) {
    if (!exports.API.checkCondition(chess.attr.allowedArea, availableMoves[i])) {
      availableMoves.splice(i, 1)
    }
  }
}
