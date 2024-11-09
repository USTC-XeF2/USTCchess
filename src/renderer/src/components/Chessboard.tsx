import '../assets/chessboard.css'

//import React, { useEffect, useState } from 'react'
import { Chessboard, Position } from 'src/types/chessboard'
import getColor from '../game'
import { MouseEventHandler } from 'react'

interface ChessboardComponentProps {
  chessboard: Chessboard
  intersection: boolean // 交叉点模式
  reverse?: boolean // 反方视角
  getAvailableMoves: (pos: Position) => Promise<Position[]>
  canMove?: (pos: Position) => Promise<boolean>
  move?: (from: Position, to: Position) => void
}

function colorCell(x: number, y: number, targetColor: string, underLine: boolean = false): void {
  const targetCell = document.getElementById(`cell-${x}-${y}`)
  if (targetCell) {
    targetCell.style.textDecoration = ''
    targetCell.style.backgroundColor = targetColor
    if (underLine) targetCell.style.textDecoration = 'underline'
  }
}

function ableCell(x: number, y: number, mod: boolean = true): boolean {
  const targetCell = document.getElementById(`cell-${x}-${y}`)
  if (!targetCell) return false
  if (targetCell.style.backgroundColor == 'white') return false
  if (mod && targetCell.style.textDecoration == 'underline') return false
  if (!mod && targetCell.style.textDecoration != 'underline') return false
  return true
}

function ChessboardComponent({
  chessboard,
  intersection,
  reverse = false,
  getAvailableMoves,
  canMove = undefined,
  move
}: ChessboardComponentProps): JSX.Element {
  const cellSize = 50
  /*let [originChoose, setOriginChoose] = useState<Position>()
  const getOriginChoose = (): Promise<void> =>
    window.electronAPI.contact('get-origin').then((res) => {
      if (res.status === 'success') setOriginChoose(res.data as Position)
    })

  useEffect(() => {
    getOriginChoose()
  }, [])*/
  const width = chessboard[0].length
  const height = chessboard.length
  function findOrigin(): Position | null {
    for (let i = 0; i < height; i++)
      for (let j = 0; j < width; j++) if (ableCell(i, j, false)) return [i, j]
    return null
  }
  function cleanBoard(): void {
    for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) colorCell(i, j, 'white')
  }
  function chooseCell(x: number, y: number): MouseEventHandler<HTMLDivElement> {
    return async () => {
      if (ableCell(x, y) && move) {
        const originCell = findOrigin()
        if (!originCell) return
        const targetCell: Position = [x, y]
        move(originCell, targetCell)
        console.log('A move from', originCell, 'to', targetCell)
        cleanBoard()
        return
      }
      if (ableCell(x, y, false)) {
        cleanBoard()
        return
      }
      cleanBoard()
      if (canMove ? await canMove([x, y]) : false) {
        colorCell(x, y, 'yellow', true)
        const ableMoves = await getAvailableMoves([x, y])
        for (let i = 0; i < ableMoves.length; i++)
          colorCell(
            ableMoves[i][0],
            ableMoves[i][1],
            chessboard[ableMoves[i][0]][ableMoves[i][1]] ? 'orange' : 'greenyellow'
          )
      }
    }
  }
  function renderRows(): JSX.Element[] {
    const rowsJSX: JSX.Element[] = []
    for (let i = 0; i < height; i++) {
      const cellsJSX: JSX.Element[] = []
      for (let j = 0; j < width; j++) {
        const rvsi = reverse ? height - i - 1 : i,
          rvsj = reverse ? width - j - 1 : j
        const chess = chessboard[rvsi][rvsj]
        const cellStyle: React.CSSProperties = {
          width: cellSize,
          height: cellSize
        }
        cellStyle.color = chess ? getColor(chess.camp) : 'black'
        cellsJSX.push(
          <div style={cellStyle} id={`cell-${rvsi}-${rvsj}`} onClick={chooseCell(rvsi, rvsj)}>
            {chess?.name}
          </div>
        )
      }
      rowsJSX.push(<div id={`row-${i}`}>{cellsJSX}</div>)
    }
    if (!findOrigin()) {
      for (let i = 0; i < height; i++)
        for (let j = 0; j < width; j++) {
          const nowCell = document.getElementById(`cell-${i}-${j}`)
          if (nowCell) {
            nowCell.addEventListener('mouseenter', async () => {
              if (await findOrigin()) return
              const effectedCells = await getAvailableMoves([i, j])
              colorCell(i, j, 'white', true)
              for (let k = 0; k < effectedCells.length; k++)
                colorCell(
                  effectedCells[k][0],
                  effectedCells[k][1],
                  chessboard[effectedCells[k][0]][effectedCells[k][1]] ? 'orange' : 'greenyellow'
                )
            })
            nowCell.addEventListener('mouseleave', async () => {
              if (await findOrigin()) return
              const effectedCells = await getAvailableMoves([i, j])
              colorCell(i, j, 'white')
              for (let k = 0; k < effectedCells.length; k++)
                colorCell(effectedCells[k][0], effectedCells[k][1], 'white')
            })
          }
        }
    }
    if (!intersection) {
      rowsJSX.push(
        <canvas
          id="background"
          width={`${width * cellSize}`}
          height={`${height * cellSize}`}
        ></canvas>
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
