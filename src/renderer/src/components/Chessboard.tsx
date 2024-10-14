import { Chessboard, ChessboardSetting } from 'src/types/chessboard'

function ChessboardComponent({
  chessboard,
  setting
}: {
  chessboard: Chessboard
  setting: ChessboardSetting
}): JSX.Element {
  const cellStyle = {
    width: '50px',
    height: '50px',
    border: '1px solid black',
    display: 'inline-block'
  }
  const rowStyle = {
    width: `${setting.width * 50}px`,
    display: 'flex',
    justifyContent: 'space-between'
  }
  function renderRows(): JSX.Element[] {
    const rowsJSX: JSX.Element[] = []
    for (let i = 0; i < setting.height; i++) {
      const cellsJSX: JSX.Element[] = []
      for (let j = 0; j < setting.width; j++) {
        cellsJSX.push(
          <div style={cellStyle} key={`cell-${i}-${j}`}>
            {chessboard[i][j]?.cardID}
          </div>
        )
      }
      rowsJSX.push(
        <div style={rowStyle} key={`row-${i}`}>
          {cellsJSX}
        </div>
      )
    }
    return rowsJSX
  }

  return (
    <>
      <div id="board">{renderRows()}</div>
    </>
  )
}

export default ChessboardComponent
