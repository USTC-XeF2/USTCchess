import { Chessboard } from 'src/types/chessboard'

function ChessboardComponent({ chessboard }: { chessboard: Chessboard }): JSX.Element {
  return <>{JSON.stringify(chessboard)}</>
}

export default ChessboardComponent
