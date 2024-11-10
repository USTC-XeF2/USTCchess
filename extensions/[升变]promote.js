exports.key = 'promote'
exports.name = '升变'
exports.author = 'XeF2'
exports.version = '1.0.0'
exports.afterMove = (chessboard, _from, to) => {
  const chess = exports.API.getChess(chessboard, to)
  if (chess.attr.promoted) return
  const variables = {
    row: to[0],
    column: to[1]
  }
  const expression = chess.attr.promoteConditions?.replace(/(\w+)/g, (match) => {
    return typeof variables[match] !== 'undefined' ? variables[match] : match
  })
  if (!expression) return
  if (Function(`return ${expression}`)()) {
    chess.attr.promoted = true
    chess.name += '+'
    chess.attr.unpromotedMoveRanges = chess.moveRanges
    chess.moveRanges = chess.attr.promotedMoveRanges
  }
}
