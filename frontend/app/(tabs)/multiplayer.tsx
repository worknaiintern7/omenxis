import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket } from '../../services/socket';

export default function MultiplayerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'waiting' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  const handleFindGame = () => {
    setLoading(true);
    setMode('waiting');
    const socket = connectSocket();

    socket.emit('find_game', { username: user?.username });

    socket.on('game_found', ({ roomId, white, black }: any) => {
      setLoading(false);
      router.push({
        pathname: '/(tabs)/multiplayer-game',
        params: { roomId, white, black },
      });
    });

    socket.on('waiting', () => {
      setLoading(true);
    });
  };

  const handleCreateRoom = () => {
    setLoading(true);
    const socket = connectSocket();
    socket.emit('create_room', { username: user?.username });

    socket.on('room_created', ({ roomId }: { roomId: string }) => {
      setCreatedRoomId(roomId);
      setLoading(false);
      setMode('waiting');
    });

    socket.on('game_found', ({ roomId, white, black }: any) => {
      router.push({
        pathname: '/(tabs)/multiplayer-game',
        params: { roomId, white, black },
      });
    });
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return Alert.alert('Error', 'Enter a room code');
    setLoading(true);
    const socket = connectSocket();
    socket.emit('join_room', { roomId: roomCode.toUpperCase(), username: user?.username });

    socket.on('game_found', ({ roomId, white, black }: any) => {
      setLoading(false);
      router.push({
        pathname: '/(tabs)/multiplayer-game',
        params: { roomId, white, black },
      });
    });

    socket.on('error', ({ message }: { message: string }) => {
      setLoading(false);
      Alert.alert('Error', message);
    });
  };

  const handleCancel = () => {
    disconnectSocket();
    setMode('menu');
    setCreatedRoomId('');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>👥 Play vs People</Text>
      <Text style={styles.subtitle}>Challenge real players online</Text>

      {mode === 'menu' && (
        <View style={styles.options}>
          {/* Quick Match */}
          <TouchableOpacity style={styles.optionCard} onPress={handleFindGame}>
            <Text style={styles.optionIcon}>⚡</Text>
            <Text style={styles.optionTitle}>Quick Match</Text>
            <Text style={styles.optionDesc}>Get matched with a random player instantly</Text>
          </TouchableOpacity>

          {/* Create Private Room */}
          <TouchableOpacity style={styles.optionCard} onPress={handleCreateRoom}>
            <Text style={styles.optionIcon}>🔒</Text>
            <Text style={styles.optionTitle}>Create Private Room</Text>
            <Text style={styles.optionDesc}>Share room code with a friend to play</Text>
          </TouchableOpacity>

          {/* Join Room */}
          <TouchableOpacity style={[styles.optionCard, { paddingBottom: 16 }]} onPress={() => setMode('join')}>
            <Text style={styles.optionIcon}>🔗</Text>
            <Text style={styles.optionTitle}>Join Room</Text>
            <Text style={styles.optionDesc}>Enter a room code to join a friend's game</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting State */}
      {mode === 'waiting' && (
        <View style={styles.waitingCard}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.waitingText}>
            {createdRoomId ? 'Waiting for opponent...' : 'Finding opponent...'}
          </Text>
          {createdRoomId ? (
            <View style={styles.roomCodeBox}>
              <Text style={styles.roomCodeLabel}>Share this code with your friend:</Text>
              <Text style={styles.roomCode}>{createdRoomId}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Join Room Input */}
      {mode === 'join' && (
        <View style={styles.joinCard}>
          <Text style={styles.joinLabel}>Enter Room Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ABC123"
            placeholderTextColor="#64748b"
            value={roomCode}
            onChangeText={(t) => setRoomCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRoom} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.joinBtnText}>Join Game</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('menu')}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#60a5fa', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 32 },
  options: { gap: 16 },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  optionIcon: { fontSize: 32, marginBottom: 10 },
  optionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  optionDesc: { fontSize: 13, color: '#64748b' },
  waitingCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  waitingText: { fontSize: 18, color: '#94a3b8', fontWeight: '600' },
  roomCodeBox: {
    backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  roomCodeLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  roomCode: { fontSize: 36, fontWeight: '800', color: '#3b82f6', letterSpacing: 6 },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, paddingHorizontal: 24,
    paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  cancelText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  joinCard: { gap: 16, marginTop: 20 },
  joinLabel: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 16, color: '#f8fafc', fontSize: 24, fontWeight: '800',
    textAlign: 'center', letterSpacing: 6,
  },
  joinBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
