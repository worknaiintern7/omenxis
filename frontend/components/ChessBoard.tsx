import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';

const BOARD_SIZE = Dimensions.get('window').width - 16;
const SQUARE_SIZE = BOARD_SIZE / 8;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_UNICODE: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

interface Props {
  depth: number;
  hintsOn: boolean;
  level: number;
  onGameOver: (result: 'win' | 'loss' | 'draw', moves: number) => void;
}

export default function ChessBoard({ depth, hintsOn, level, onGameOver }: Props) {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [captureMoves, setCaptureMoves] = useState<Square[]>([]);
  const [threatenedSquares, setThreatenedSquares] = useState<Square[]>([]);
  const [predictedSquares, setPredictedSquares] = useState<Square[]>([]);
  const [hintFrom, setHintFrom] = useState<Square | null>(null);
  const [hintTo, setHintTo] = useState<Square | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // ── Evaluation ──────────────────────────────────────────
  function evaluate(c: Chess): number {
    const board = c.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) continue;
        const v = PIECE_VALUES[p.type] || 0;
        score += p.color === 'w' ? v : -v;
      }
    }
    return score;
  }

  function minimax(c: Chess, d: number, alpha: number, beta: number, isMax: boolean): number {
    if (d === 0 || c.isGameOver()) return evaluate(c);
    const moves = c.moves();
    moves.sort((a, b) => (b.includes('x') ? 1 : 0) - (a.includes('x') ? 1 : 0));
    if (isMax) {
      let best = -Infinity;
      for (const m of moves) {
        c.move(m); best = Math.max(best, minimax(c, d - 1, alpha, beta, false)); c.undo();
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        c.move(m); best = Math.min(best, minimax(c, d - 1, alpha, beta, true)); c.undo();
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function getBestMove(c: Chess, forColor: Color) {
    const moves = c.moves({ verbose: true });
    if (!moves.length) return null;
    let bestMove = moves[0];
    let bestVal = forColor === 'b' ? Infinity : -Infinity;
    for (const m of moves) {
      c.move(m);
      const val = minimax(c, Math.max(depth - 1, 1), -Infinity, Infinity, forColor === 'b');
      c.undo();
      if (forColor === 'b' ? val < bestVal : val > bestVal) { bestVal = val; bestMove = m; }
    }
    return bestMove;
  }

  // ── Threat Detection ────────────────────────────────────
  function getThreatenedWhiteSquares(c: Chess): Square[] {
    const threatened: Square[] = [];
    const board = c.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p || p.color !== 'w') continue;
        const sq = (FILES[f] + RANKS[r]) as Square;
        // Temporarily switch turn to black to check attacks
        const fenParts = c.fen().split(' ');
        fenParts[1] = 'b';
        const tempChess = new Chess(fenParts.join(' '));
        const blackMoves = tempChess.moves({ verbose: true });
        if (blackMoves.some(m => m.to === sq)) threatened.push(sq);
      }
    }
    return threatened;
  }

  function getPredictedAiSquares(fromSq: Square, toSq: Square): Square[] {
    const temp = new Chess(chess.fen());
    const mv = temp.move({ from: fromSq, to: toSq, promotion: 'q' });
    if (!mv) return [];
    const aiMove = getBestMove(temp, 'b');
    if (!aiMove) return [];
    const squares: Square[] = [aiMove.from as Square, aiMove.to as Square];
    return squares;
  }

  // ── AI Move ─────────────────────────────────────────────
  const makeAiMove = useCallback((c: Chess) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const moves = c.moves({ verbose: true });
      if (!moves.length) { setIsAiThinking(false); return; }
      let move;
      if (level === 1 && Math.random() < 0.35) {
        move = moves[Math.floor(Math.random() * moves.length)];
      } else {
        move = getBestMove(c, 'b') || moves[0];
      }
      c.move(move);
      setFen(c.fen());
      setThreatenedSquares(getThreatenedWhiteSquares(c));
      setPredictedSquares([]);
      setIsAiThinking(false);
      checkGameOver(c);
    }, 100);
  }, [depth, level]);

  function checkGameOver(c: Chess) {
    if (c.isCheckmate()) {
      onGameOver(c.turn() === 'w' ? 'loss' : 'win', c.history().length);
    } else if (c.isDraw()) {
      onGameOver('draw', c.history().length);
    }
  }

  // ── Square Press ────────────────────────────────────────
  const onSquarePress = (sq: Square) => {
    if (chess.turn() !== 'w' || chess.isGameOver() || isAiThinking) return;
    const piece = chess.get(sq);

    if (!selected) {
      if (!piece || piece.color !== 'w') return;
      const moves = chess.moves({ square: sq, verbose: true });
      setSelected(sq);
      setValidMoves(moves.filter(m => !chess.get(m.to as Square)).map(m => m.to as Square));
      setCaptureMoves(moves.filter(m => !!chess.get(m.to as Square)).map(m => m.to as Square));
      setHintFrom(null); setHintTo(null);
    } else {
      if (sq === selected) {
        setSelected(null); setValidMoves([]); setCaptureMoves([]); setPredictedSquares([]);
        return;
      }
      // Show threat prediction on hover over target
      if (validMoves.includes(sq) || captureMoves.includes(sq)) {
        const predicted = getPredictedAiSquares(selected, sq);
        setPredictedSquares(predicted);
      }
      const move = chess.move({ from: selected, to: sq, promotion: 'q' });
      if (!move) {
        if (piece && piece.color === 'w') {
          const moves = chess.moves({ square: sq, verbose: true });
          setSelected(sq);
          setValidMoves(moves.filter(m => !chess.get(m.to as Square)).map(m => m.to as Square));
          setCaptureMoves(moves.filter(m => !!chess.get(m.to as Square)).map(m => m.to as Square));
        } else {
          setSelected(null); setValidMoves([]); setCaptureMoves([]); setPredictedSquares([]);
        }
        return;
      }
      setFen(chess.fen());
      setSelected(null); setValidMoves([]); setCaptureMoves([]);
      if (chess.isGameOver()) { checkGameOver(chess); return; }
      makeAiMove(chess);
    }
  };

  // ── Hint ────────────────────────────────────────────────
  const showHint = () => {
    if (!hintsOn || chess.turn() !== 'w') return;
    const best = getBestMove(chess, 'w');
    if (!best) return;
    setHintFrom(best.from as Square);
    setHintTo(best.to as Square);
    setSelected(null); setValidMoves([]); setCaptureMoves([]);
  };

  // ── Undo ────────────────────────────────────────────────
  const undoMove = () => {
    if (chess.history().length < 2) return;
    chess.undo(); chess.undo();
    setFen(chess.fen());
    setSelected(null); setValidMoves([]); setCaptureMoves([]);
    setThreatenedSquares(getThreatenedWhiteSquares(chess));
    setPredictedSquares([]); setHintFrom(null); setHintTo(null);
  };

  const resetGame = () => {
    chess.reset(); setFen(chess.fen());
    setSelected(null); setValidMoves([]); setCaptureMoves([]);
    setThreatenedSquares([]); setPredictedSquares([]);
    setHintFrom(null); setHintTo(null);
  };

  // ── Render ───────────────────────────────────────────────
  const board = chess.board();

  const getSquareColor = (sq: Square): string => {
    if (selected === sq) return '#eab308';
    if (hintFrom === sq) return '#22c55e';
    if (hintTo === sq) return '#3b82f6';
    if (predictedSquares.includes(sq)) return '#fbbf24';
    if (threatenedSquares.includes(sq)) return '#ef444488';
    return null as any;
  };

  const status = chess.isCheckmate()
    ? (chess.turn() === 'w' ? '😔 Checkmate — You Lost' : '🏆 Checkmate — You Win!')
    : chess.isDraw() ? '🤝 Draw!'
    : chess.inCheck() ? (chess.turn() === 'w' ? '⚠️ You are in Check!' : '⚠️ Check!')
    : isAiThinking ? '🤔 AI Thinking...'
    : chess.turn() === 'w' ? '♟ Your Turn' : "🤖 Computer's Turn";

  return (
    <View style={styles.container}>
      {/* Status */}
      <Text style={[styles.status, chess.inCheck() && { color: '#fbbf24' }]}>{status}</Text>

      {/* Board */}
      <View style={styles.board}>
        {RANKS.map((rank, ri) => (
          <View key={rank} style={styles.row}>
            {FILES.map((file, fi) => {
              const sq = (file + rank) as Square;
              const piece = board[ri][fi];
              const isLight = (ri + fi) % 2 === 0;
              const overlayColor = getSquareColor(sq);
              const isValidMove = validMoves.includes(sq);
              const isCaptureMove = captureMoves.includes(sq);
              const isThreatened = threatenedSquares.includes(sq);

              return (
                <TouchableOpacity
                  key={sq}
                  style={[
                    styles.square,
                    { backgroundColor: isLight ? '#f0d9b5' : '#b58863' },
                    overlayColor ? { backgroundColor: overlayColor } : null,
                  ]}
                  onPress={() => onSquarePress(sq)}
                  activeOpacity={0.8}
                >
                  {/* Piece */}
                  {piece && (
                    <Text style={[
                      styles.piece,
                      piece.color === 'w' ? styles.whitePiece : styles.blackPiece,
                      isThreatened && piece.color === 'w' ? styles.threatenedPiece : null,
                    ]}>
                      {PIECE_UNICODE[piece.color + piece.type]}
                    </Text>
                  )}

                  {/* Valid move dot */}
                  {isValidMove && !piece && (
                    <View style={styles.moveDot} />
                  )}

                  {/* Capture ring */}
                  {isCaptureMove && (
                    <View style={styles.captureRing} />
                  )}

                  {/* Predicted AI move dot */}
                  {predictedSquares.includes(sq) && (
                    <View style={styles.predictDot} />
                  )}

                  {/* Rank label */}
                  {fi === 0 && <Text style={styles.rankLabel}>{rank}</Text>}
                  {/* File label */}
                  {ri === 7 && <Text style={styles.fileLabel}>{file}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={undoMove}>
          <Text style={styles.btnText}>↩ Undo</Text>
        </TouchableOpacity>
        {hintsOn && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#22c55e' }]} onPress={showHint}>
            <Text style={styles.btnText}>💡 Hint</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#3b82f6' }]} onPress={resetGame}>
          <Text style={styles.btnText}>↺ Restart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  status: {
    fontSize: 15, fontWeight: '700', color: '#f8fafc',
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, marginBottom: 10, textAlign: 'center',
  },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, borderWidth: 3, borderColor: '#1e293b', borderRadius: 4 },
  row: { flexDirection: 'row' },
  square: { width: SQUARE_SIZE, height: SQUARE_SIZE, justifyContent: 'center', alignItems: 'center' },
  piece: { fontSize: SQUARE_SIZE * 0.72, textAlign: 'center', includeFontPadding: false },
  whitePiece: { color: '#ffffff', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  blackPiece: { color: '#1a1a1a', textShadowColor: '#555', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 1 },
  threatenedPiece: { textShadowColor: '#ef4444', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  moveDot: {
    width: SQUARE_SIZE * 0.3, height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15, backgroundColor: 'rgba(34,197,94,0.75)',
    position: 'absolute',
  },
  captureRing: {
    width: SQUARE_SIZE * 0.88, height: SQUARE_SIZE * 0.88,
    borderRadius: SQUARE_SIZE * 0.44, borderWidth: 4,
    borderColor: 'rgba(239,68,68,0.85)', position: 'absolute',
  },
  predictDot: {
    width: SQUARE_SIZE * 0.25, height: SQUARE_SIZE * 0.25,
    borderRadius: SQUARE_SIZE * 0.125, backgroundColor: 'rgba(251,191,36,0.8)',
    position: 'absolute',
  },
  rankLabel: { position: 'absolute', top: 2, left: 3, fontSize: 9, color: '#00000066', fontWeight: '700' },
  fileLabel: { position: 'absolute', bottom: 2, right: 3, fontSize: 9, color: '#00000066', fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
