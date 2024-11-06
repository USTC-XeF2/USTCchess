import '../assets/chessboard.css'

import { Chessboard, Position } from 'src/types/chessboard'

interface ChessboardComponentProps {
  chessboard: Chessboard
  intersection: boolean // 交叉点模式
  reverse?: boolean // 反方视角
  getAvailableMoves: (pos: Position) => Promise<Position[]>
  move?: (from: Position, to: Position) => void
}

function ChessboardComponent({
  chessboard,
  intersection,
  reverse = false,
  getAvailableMoves,
  move
}: ChessboardComponentProps): JSX.Element {
  console.log(getAvailableMoves, move)
  const width = chessboard[0].length
  const height = chessboard.length
  function renderRows(): JSX.Element[] {
    const rowsJSX: JSX.Element[] = []
    for (let i = 0; i < height; i++) {
      const cellsJSX: JSX.Element[] = []
      for (let j = 0; j < width; j++) {
        const chess = chessboard[reverse ? height - i - 1 : i][reverse ? width - j - 1 : j]
        const cellStyle: React.CSSProperties = {
          width: '50px',
          height: '50px'
        }
        cellStyle.color = chess
          ? chess.camp == 1
            ? 'red'
            : chess.camp == 2
              ? 'blue'
              : 'green'
          : 'black'
        cellsJSX.push(
          <div style={cellStyle} key={`cell-${i}-${j}`}>
            {chess?.name}
          </div>
        )
      }
      rowsJSX.push(<div id={`row-${i}`}>{cellsJSX}</div>)
    }
    if (!intersection) {
      rowsJSX.push(
        <canvas id="background" width={`${width * 50}`} height={`${height * 50}`}></canvas>
      )
      rowsJSX.push(<script></script>)
    }
    return rowsJSX
  }
  if (intersection) {
    return <div id="board">{renderRows()}</div>
  } else return <div id="iboard">{renderRows()}</div>
}

export default ChessboardComponent
