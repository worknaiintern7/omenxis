import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSocket, disconnectSocket } from '../../services/socket';

export default function MultiplayerGameScreen() {
  const { roomId, white, black } = useLocalSearchParams<{
    roomId: string; white: string; black: string;
  }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [myColor, setMyColor] = useState<'white' | 'black'>('white');
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const socket = getSocket();

    socket.on('assign_color', ({ color }: { color: 'white' | 'black' }) => {
      setMyColor(color);
      const flipped = color === 'black';
      webViewRef.current?.injectJavaScript(`
        board.orientation('${color}');
        playerColor = '${color === 'white' ? 'w' : 'b'}';
        updateStatus();
        true;
      `);
      setStatus(color === 'white' ? "Your turn (White)" : "Waiting for White...");
    });

    socket.on('opponent_move', ({ move, fen }: { move: string; fen: string }) => {
      webViewRef.current?.injectJavaScript(`
        game.move(${JSON.stringify(move)});
        board.position(game.fen());
        updateStatus();
        true;
      `);
    });

    socket.on('opponent_disconnected', () => {
      Alert.alert('Opponent Left', 'Your opponent disconnected. You win!', [
        { text: 'Back to Lobby', onPress: () => router.push('/(tabs)/multiplayer') },
      ]);
    });

    socket.on('game_ended', ({ result }: { result: string }) => {
      Alert.alert('Game Over', `Result: ${result}`, [
        { text: 'Back to Lobby', onPress: () => router.push('/(tabs)/multiplayer') },
      ]);
    });

    return () => {
      socket.off('assign_color');
      socket.off('opponent_move');
      socket.off('opponent_disconnected');
      socket.off('game_ended');
    };
  }, []);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const socket = getSocket();

      if (data.type === 'move') {
        socket.emit('make_move', { roomId, move: data.move, fen: data.fen });
        setStatus(myColor === 'white' ? "Black's turn" : "White's turn");
      }
      if (data.type === 'gameOver') {
        socket.emit('game_over', { roomId, result: data.result });
        Alert.alert(
          data.result === 'win' ? '🏆 You Won!' : data.result === 'loss' ? '😔 You Lost' : '🤝 Draw!',
          '',
          [{ text: 'Back to Lobby', onPress: () => router.push('/(tabs)/multiplayer') }]
        );
      }
      if (data.type === 'status') {
        setStatus(data.message);
      }
    } catch {}
  };

  const multiplayerHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.css">
<style>
body{font-family:sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:16px;text-align:center}
#board{width:100%;max-width:500px;margin:0 auto;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.7);border:4px solid #1e293b}
.highlight-square{box-shadow:inset 0 0 0 5px rgba(234,179,8,0.9)!important}
</style>
</head>
<body>
<div id="board"></div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.js"></script>
<script>
const game = new Chess();
let playerColor = 'w';
let selectedSquare = null;

function clearHighlights(){ $('#board .square-55d63').removeClass('highlight-square'); }

const board = Chessboard('board', {
  draggable: false,
  position: 'start',
  showNotation: false,
  pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
});

$('#board').on('click', '.square-55d63', function() {
  if (game.game_over() || game.turn() !== playerColor) return;
  const sq = $(this).attr('data-square');
  const pc = game.get(sq);
  if (!selectedSquare) {
    if (!pc || pc.color !== playerColor) return;
    selectedSquare = sq;
    $(this).addClass('highlight-square');
  } else {
    const mv = game.move({ from: selectedSquare, to: sq, promotion: 'q' });
    if (!mv) {
      if (pc && pc.color === playerColor) {
        selectedSquare = sq; clearHighlights(); $(this).addClass('highlight-square');
      } else { selectedSquare = null; clearHighlights(); }
    } else {
      board.position(game.fen());
      selectedSquare = null; clearHighlights();
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'move', move: mv.san, fen: game.fen() }));
      updateStatus();
      if (game.game_over()) {
        const result = game.in_checkmate() ? (game.turn() === playerColor ? 'loss' : 'win') : 'draw';
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'gameOver', result }));
      }
    }
  }
});

function updateStatus() {
  let msg = '';
  if (game.game_over()) {
    msg = game.in_checkmate() ? 'Checkmate!' : 'Draw!';
  } else {
    msg = game.turn() === playerColor ? 'Your turn' : "Opponent's turn";
    if (game.in_check()) msg += ' (Check!)';
  }
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'status', message: msg }));
}
</script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          disconnectSocket();
          router.push('/(tabs)/multiplayer');
        }}>
          <Text style={styles.back}>← Leave</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomId}>Room: {roomId}</Text>
          <Text style={styles.players}>{white} ⚪ vs ⚫ {black}</Text>
        </View>
        <View style={[styles.colorBadge, { backgroundColor: myColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }]}>
          <Text style={styles.colorText}>{myColor === 'white' ? '⚪' : '⚫'} You</Text>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Chess Board */}
      <WebView
        ref={webViewRef}
        source={{ html: multiplayerHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  back: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  roomId: { color: '#64748b', fontSize: 12 },
  players: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  colorBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  colorText: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  statusBar: {
    backgroundColor: 'rgba(59,130,246,0.1)', padding: 10, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(59,130,246,0.2)',
  },
  statusText: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#0f172a' },
});
