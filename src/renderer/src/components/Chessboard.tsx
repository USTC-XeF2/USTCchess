import '../assets/chessboard.css'

import { Card, Chessboard } from 'src/types/chessboard'

interface ChessboardComponentProps {
  chessboard: Chessboard
  intersection: boolean // 交叉点模式
  reverse?: boolean // 反方视角
  getCard: (id: number) => Card
}

//未来加入接口：onClick(x, y) => void //点击棋子的回调
function onClick(x: number, y: number): void {
  const cellName = `cell-${x}-${y}`
  const cellDiv = document.getElementById(cellName)
  if (cellDiv) cellDiv.style.backgroundColor = 'yellow'
}

function ChessboardComponent({
  chessboard,
  intersection,
  reverse = false,
  getCard
}: ChessboardComponentProps): JSX.Element {
  //intersection = false
  console.log(intersection, reverse)
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
          ? getCard(chess.cardID).camp == 0
            ? 'green'
            : getCard(chess.cardID).camp == 1
              ? 'red'
              : getCard(chess.cardID).camp == 2
                ? 'blue'
                : 'black'
          : 'black'
        cellsJSX.push(
          <div style={cellStyle} id={`cell-${i}-${j}`}>
            {chess ? getCard(chess.cardID).name : ''}
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

export { ChessboardComponent, onClick }

export default ChessboardComponent
