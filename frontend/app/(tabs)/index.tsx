import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { gameAPI } from '../../services/api';

interface Stats {
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameAPI.getStats()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const winRate = stats && stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.username}>♟ {user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {loading ? (
        <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Games Played" value={stats?.gamesPlayed ?? 0} color="#3b82f6" />
          <StatCard label="Wins" value={stats?.gamesWon ?? 0} color="#22c55e" />
          <StatCard label="Losses" value={stats?.gamesLost ?? 0} color="#ef4444" />
          <StatCard label="Win Rate" value={`${winRate}%`} color="#f59e0b" />
        </View>
      )}

      {/* Play Buttons */}
      <TouchableOpacity style={styles.playButton} onPress={() => router.push('/(tabs)/level-select')}>
        <Text style={styles.playButtonText}>🤖  Play vs Computer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.multiplayerButton} onPress={() => router.push('/(tabs)/multiplayer')}>
        <Text style={styles.multiplayerButtonText}>👥  Play vs People</Text>
      </TouchableOpacity>

      {/* History Button */}
      <TouchableOpacity style={styles.historyButton} onPress={() => router.push('/(tabs)/history')}>
        <Text style={styles.historyButtonText}>📋  View Game History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 32,
  },
  greeting: { fontSize: 14, color: '#94a3b8' },
  username: { fontSize: 24, fontWeight: '800', color: '#f8fafc' },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 20, borderTopWidth: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  playButton: {
    backgroundColor: '#3b82f6', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  playButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  multiplayerButton: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  multiplayerButtonText: { color: '#22c55e', fontSize: 18, fontWeight: '700' },
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  historyButtonText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
});
