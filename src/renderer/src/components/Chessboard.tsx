import '../assets/chessboard.css'

import { Card, Chessboard } from 'src/types/chessboard'

interface ChessboardComponentProps {
  chessboard: Chessboard
  intersection: boolean // 交叉点模式
  reverse?: boolean // 反方视角
  getCard: (id: number) => Card
}

//未来加入接口：onClick(x, y) => void //点击棋子的回调

function ChessboardComponent({
  chessboard,
  intersection,
  reverse = false,
  getCard
}: ChessboardComponentProps): JSX.Element {
  console.log(intersection, reverse)
  const width = chessboard[0].length
  const height = chessboard.length
  const cellStyle: React.CSSProperties = {
    width: '50px',
    height: '50px'
  }
  function renderRows(): JSX.Element[] {
    const rowsJSX: JSX.Element[] = []
    for (let i = 0; i < height; i++) {
      const cellsJSX: JSX.Element[] = []
      for (let j = 0; j < width; j++) {
        const chess = chessboard[i][j]
        cellsJSX.push(
          <div style={cellStyle} key={`cell-${i}-${j}`}>
            {chess ? getCard(chess.cardID).name : ''}
          </div>
        )
      }
      rowsJSX.push(<div key={`row-${i}`}>{cellsJSX}</div>)
    }
    return rowsJSX
  }

  return <div id="board">{renderRows()}</div>
}

export default ChessboardComponent
