exports.key = 'Chinese-chess'
exports.name = '中国象棋'
exports.author = 'XeF2'
exports.version = '1.0.1'
exports.modifyMove = (chessboard, pos, availableMoves) => {
  const chess = chessboard[pos[0]][pos[1]]
  if (chess.id === 5 || chess.id === 6) {
    availableMoves.length = 0
    exports.API.traverseMoveRanges(chessboard, pos, (newPos, dir, step) => {
      const targetChess = exports.API.getChess(chessboard, newPos)
      if (targetChess && !exports.API.canEat(chess.camp, targetChess.camp)) return true
      if (step === 2) availableMoves.push(newPos)
      return Boolean(targetChess)
    })
  } else if (chess.id === 7 || chess.id === 8) {
    const moveRanges = [
      [1, 8, 2],
      [3, 2, 4],
      [5, 4, 6],
      [7, 6, 8]
    ]
    for (const range of moveRanges) {
      const newPos = exports.API.getNewPos(pos, range[0])
      if (!exports.API.isInChessboard(chessboard, newPos)) continue
      const targetChess = exports.API.getChess(chessboard, newPos)
      if (targetChess) continue
      for (const nextDir of range.slice(1)) {
        const nextPos = exports.API.getNewPos(newPos, nextDir)
        if (!exports.API.isInChessboard(chessboard, nextPos)) continue
        const nextChess = exports.API.getChess(chessboard, nextPos)
        if (nextChess && !exports.API.canEat(chess.camp, nextChess.camp)) continue
        availableMoves.push(nextPos)
      }
    }
  } else if (chess.id === 11 || chess.id === 12) {
    availableMoves.length = 0
    const isSkipChess = []
    exports.API.traverseMoveRanges(chessboard, pos, (newPos, dir) => {
      const targetChess = exports.API.getChess(chessboard, newPos)
      if (isSkipChess.includes(dir)) {
        if (targetChess && exports.API.canEat(chess.camp, targetChess.camp))
          availableMoves.push(newPos)
        return Boolean(targetChess)
      } else if (targetChess) {
        isSkipChess.push(dir)
      } else {
        availableMoves.push(newPos)
      }
      return false
    })
  }
}
exports.afterMove = (chessboard, _from, _to, turn) => {
  for (let j = 3; j < 6; j++) {
    let hasChief = false
    for (let i = 0; i < 10; i++) {
      const chess = exports.API.getChess(chessboard, [i, j])
      if (chess?.isChief) {
        if (hasChief) {
          exports.API.endGame(3 - turn, '将帅不能照面')
        } else {
          hasChief = true
        }
      } else if (chess && hasChief) {
        break
      }
    }
  }
}
