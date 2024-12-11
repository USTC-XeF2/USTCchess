import '../assets/chessboard.css'

import { useEffect, useState } from 'react'
import { theme } from 'antd'
import { Group, Layer, Stage, Rect, Text, Line } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { Chessboard, Position } from 'src/types/chessboard'

interface ChessboardComponentProps {
  chessboard: Chessboard
  getSize: () => {
    width: number
    height: number
  }
  intersection: boolean
  reverse?: boolean
  draggable?: boolean
  getAvailableMoves: (pos: Position) => Promise<Position[]>
  canMove?: (pos: Position) => Promise<boolean>
  move?: (from: Position, to: Position) => void
}

const isEqualPosition = (pos1: Position, pos2: Position): boolean =>
  pos1[0] === pos2[0] && pos1[1] === pos2[1]

function ChessboardComponent({
  chessboard,
  getSize,
  intersection,
  reverse = false,
  draggable = false,
  getAvailableMoves,
  canMove,
  move
}: ChessboardComponentProps): JSX.Element {
  const [maxWidth, setMaxWidth] = useState<number>(0)
  const [maxHeight, setMaxHeight] = useState<number>(0)
  const [hoverPosition, setHoverPosition] = useState<Position>()
  const [selectedPosition, setSelectedPosition] = useState<Position>()
  const [availableMoves, setAvailableMoves] = useState<Position[]>([])
  const [canMoveCache, setCanMoveCache] = useState<boolean>()

  useEffect(() => {
    const handleResize = (): void => {
      const { width, height } = getSize()
      setMaxWidth(width)
      setMaxHeight(height)
    }

    window.addEventListener('resize', handleResize)
    handleResize()
  }, [])

  const isInAvailableMoves = (pos: Position): boolean => {
    return availableMoves.some((p) => isEqualPosition(p, pos))
  }

  const width = chessboard[0].length
  const height = chessboard.length
  const getReversePosition = (pos: Position): Position => [
    reverse ? height - pos[0] - 1 : pos[0],
    reverse ? width - pos[1] - 1 : pos[1]
  ]

  const enterCell = async (pos: Position): Promise<void> => {
    setHoverPosition(pos)
    setCanMoveCache(await canMove?.(pos))
    if (selectedPosition) return
    setAvailableMoves(await getAvailableMoves(pos))
  }
  const leaveCell = (): void => {
    setHoverPosition(undefined)
    if (selectedPosition) return
    setAvailableMoves([])
  }
  const chooseCell = async (pos: Position): Promise<void> => {
    if (isInAvailableMoves(pos)) {
      move?.(selectedPosition!, pos)
    } else if (canMoveCache) {
      if (selectedPosition && isEqualPosition(selectedPosition, pos)) {
        setSelectedPosition(undefined)
      } else {
        setSelectedPosition(pos)
        setAvailableMoves(await getAvailableMoves(pos))
      }
      return
    } else if (!selectedPosition) return
    setSelectedPosition(undefined)
    setAvailableMoves([])
  }
  const onDragStart = async (e: KonvaEventObject<DragEvent>, pos: Position): Promise<void> => {
    if (!canMoveCache) return e.target.stopDrag()
    e.target.moveToTop()
    setSelectedPosition(undefined)
    setAvailableMoves(await getAvailableMoves(pos))
  }
  const onDragEnd = (e: KonvaEventObject<DragEvent>, pos: Position): void => {
    const revPos = getReversePosition(pos)
    const to: Position = getReversePosition([
      Math.round(e.target.y() / cellSize),
      Math.round(e.target.x() / cellSize)
    ])
    e.target.position({ x: revPos[1] * cellSize + padding, y: revPos[0] * cellSize + padding })
    if (pos && isInAvailableMoves(to)) {
      move?.(pos, to)
      setSelectedPosition(undefined)
      setAvailableMoves([])
    }
  }

  const { token } = theme.useToken()

  const cellSize = Math.min(maxWidth / width, maxHeight / height)
  const padding = intersection ? cellSize * 0.05 : 0
  const borderColor = token.colorBgSpotlight

  const getCell = (i: number, j: number): JSX.Element => {
    const pos: Position = getReversePosition([i, j])
    const chess = chessboard[pos[0]][pos[1]]
    const isSelected = selectedPosition && isEqualPosition(selectedPosition, pos)
    const isAvailable = isInAvailableMoves(pos)
    const fillColor = isAvailable
      ? chess
        ? token.colorErrorBgFilledHover
        : token.colorSuccessBgHover
      : isSelected
        ? token.colorWarningBgHover
        : intersection && !chess
          ? 'transparent'
          : hoverPosition && isEqualPosition(hoverPosition, pos)
            ? token.colorBorderSecondary
            : token.colorBgElevated
    return (
      <Group
        key={`cell-${i}-${j}`}
        x={cellSize * j + padding}
        y={cellSize * i + padding}
        onMouseEnter={() => enterCell(pos)}
        onMouseLeave={leaveCell}
        onClick={() => chooseCell(pos)}
        draggable={draggable && Boolean(chess)}
        onDragStart={(e) => onDragStart(e, pos)}
        onDragEnd={(e) => onDragEnd(e, pos)}
        onContextMenu={() => chess && window.electronAPI.showChessInfo(chess, reverse)}
      >
        <Rect
          width={cellSize - padding * 2}
          height={cellSize - padding * 2}
          fill={fillColor}
          stroke={borderColor}
          strokeWidth={intersection && !chess ? 0 : cellSize * 0.01}
          cornerRadius={intersection ? cellSize / 2 : 0}
        />
        {chess && (
          <Text
            x={cellSize * 0.05 + padding}
            y={cellSize * 0.05 + padding}
            width={cellSize * 0.9 - padding * 4}
            height={cellSize * 0.9 - padding * 4}
            text={chess.name}
            fontSize={cellSize / 3.5}
            align="center"
            verticalAlign="middle"
            fill={chess.camp === 1 ? 'red' : chess.camp === 2 ? 'blue' : 'green'}
            fontStyle={chess.isChief ? 'bold' : 'normal'}
            listening={false}
          />
        )}
      </Group>
    )
  }

  return (
    <Stage id="board" width={cellSize * width} height={cellSize * height}>
      <Layer>
        {intersection && (
          <>
            {Array.from({ length: height }, (_, i) => (
              <Line
                key={`h-line-${i}`}
                points={[
                  cellSize * 0.5,
                  cellSize * (i + 0.5),
                  cellSize * (width - 0.5),
                  cellSize * (i + 0.5)
                ]}
                stroke={borderColor}
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: width }, (_, j) => (
              <Line
                key={`v-line-${j}`}
                points={[
                  cellSize * (j + 0.5),
                  cellSize * 0.5,
                  cellSize * (j + 0.5),
                  cellSize * (height - 0.5)
                ]}
                stroke={borderColor}
                strokeWidth={1}
                listening={false}
              />
            ))}
          </>
        )}
        {Array.from({ length: height }, (_, i) =>
          Array.from({ length: width }, (_, j) => getCell(i, j))
        ).flat()}
      </Layer>
      {!intersection && (
        <Layer>
          <Rect
            x={0}
            y={0}
            width={cellSize * width}
            height={cellSize * height}
            stroke={borderColor}
            strokeWidth={5}
            fill="transparent"
            listening={false}
          />
        </Layer>
      )}
    </Stage>
  )
}

export default ChessboardComponent
