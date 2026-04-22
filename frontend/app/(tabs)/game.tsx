import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { gameAPI } from '../../services/api';
import ChessBoard from '../../components/ChessBoard';

const LEVEL_COLORS: Record<string, string> = {
  '1': '#22c55e', '2': '#84cc16', '3': '#f59e0b', '4': '#f97316', '5': '#ef4444',
};
const LEVEL_NAMES: Record<string, string> = {
  '1': 'Beginner', '2': 'Easy', '3': 'Medium', '4': 'Hard', '5': 'Expert',
};

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level: string; depth: string; hints: string; trial: string }>();
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState(0); // remount board on restart
  const startTime = useRef(Date.now());

  const level = params.level || '1';
  const depth = parseInt(params.depth || '2');
  const hintsOn = params.hints === '1';
  const trialMode = params.trial === '1';
  const levelColor = LEVEL_COLORS[level] || '#3b82f6';
  const levelName = LEVEL_NAMES[level] || 'Beginner';

  const handleGameOver = async (result: 'win' | 'loss' | 'draw', moves: number) => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    const title = result === 'win' ? '🏆 You Won!' : result === 'loss' ? '😔 You Lost' : '🤝 Draw!';
    const subtitle = `Level ${levelName} · ${moves} moves · ${duration}s`;

    if (trialMode) {
      Alert.alert(title, `${subtitle}\n(Trial — not saved)`, [
        { text: 'Play Again', onPress: restartGame },
        { text: 'Back', onPress: () => router.push('/(tabs)/level-select') },
      ]);
      return;
    }

    setSaving(true);
    try {
      await gameAPI.saveGame({ result, moves, duration, pgn: '' });
    } catch {}
    setSaving(false);

    Alert.alert(title, subtitle, [
      { text: 'Play Again', onPress: restartGame },
      { text: 'Dashboard', onPress: () => router.push('/(tabs)') },
    ]);
  };

  const restartGame = () => {
    startTime.current = Date.now();
    setKey(k => k + 1);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/level-select')}>
          <Text style={styles.back}>← Levels</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>vs Computer</Text>
          <View style={[styles.badge, { backgroundColor: `${levelColor}22`, borderColor: `${levelColor}66` }]}>
            <Text style={[styles.badgeText, { color: levelColor }]}>
              {levelName}{trialMode ? ' · Trial' : ''}{hintsOn ? ' · Hints' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={restartGame}>
          <Text style={styles.restart}>↺ New</Text>
        </TouchableOpacity>
      </View>

      {saving && (
        <View style={styles.savingRow}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <ChessBoard
          key={key}
          depth={depth}
          hintsOn={hintsOn}
          level={parseInt(level)}
          onGameOver={handleGameOver}
        />
      </ScrollView>
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
  back: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  headerCenter: { alignItems: 'center', gap: 4 },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  restart: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 16 },
  savingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', paddingVertical: 6,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  savingText: { color: '#60a5fa', fontSize: 13 },
});
