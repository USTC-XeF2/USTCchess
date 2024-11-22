exports.key = 'promote'
exports.name = '升变'
exports.author = 'XeF2'
exports.version = '1.1.0'
exports.afterMove = (chessboard, _from, to) => {
  const chess = exports.API.getChess(chessboard, to)
  if (chess.attr.promoted) return
  if (!chess.attr.promoteConditions) return
  if (exports.API.checkCondition(chess.attr.promoteConditions, to)) {
    chess.attr.promoted = true
    chess.name += '+'
    chess.attr.unpromotedMoveRanges = chess.moveRanges
    chess.moveRanges = chess.attr.promotedMoveRanges
  }
}
