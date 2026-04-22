import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { gameAPI } from '../../services/api';

interface GameRecord {
  _id: string;
  result: 'win' | 'loss' | 'draw';
  moves: number;
  duration: number;
  playedAt: string;
}

export default function HistoryScreen() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameAPI.getHistory()
      .then((res) => setGames(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resultColor = { win: '#22c55e', loss: '#ef4444', draw: '#f59e0b' };
  const resultIcon = { win: '🏆', loss: '😔', draw: '🤝' };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game History</Text>
      {loading ? (
        <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} />
      ) : games.length === 0 ? (
        <Text style={styles.empty}>No games played yet. Start playing!</Text>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.resultIcon}>{resultIcon[item.result]}</Text>
                <View>
                  <Text style={[styles.result, { color: resultColor[item.result] }]}>
                    {item.result.toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>{item.moves} moves · {item.duration}s</Text>
                </View>
              </View>
              <Text style={styles.date}>
                {new Date(item.playedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', marginBottom: 24 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultIcon: { fontSize: 28 },
  result: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#64748b', fontSize: 13, marginTop: 2 },
  date: { color: '#64748b', fontSize: 13 },
});
