import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';

const LEVELS = [
  { id: 1, label: 'Level 1', title: 'Beginner',     desc: 'Random moves, perfect for first-timers', depth: 1, color: '#22c55e', icon: '🌱' },
  { id: 2, label: 'Level 2', title: 'Easy',         desc: 'Basic strategy, captures when possible',  depth: 2, color: '#84cc16', icon: '🐣' },
  { id: 3, label: 'Level 3', title: 'Intermediate', desc: 'Thinks 3 moves ahead',                    depth: 3, color: '#f59e0b', icon: '⚔️' },
  { id: 4, label: 'Level 4', title: 'Hard',         desc: 'Aggressive play with deep search',        depth: 4, color: '#f97316', icon: '🔥' },
  { id: 5, label: 'Level 5', title: 'Expert',       desc: 'Near-perfect play, very challenging',     depth: 5, color: '#ef4444', icon: '💀' },
];

export default function LevelSelectScreen() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [hintsOn, setHintsOn] = useState(false);
  const [trialMode, setTrialMode] = useState(false);

  const handlePlay = () => {
    router.push({
      pathname: '/(tabs)/game',
      params: {
        level: selectedLevel,
        depth: LEVELS[selectedLevel - 1].depth,
        hints: hintsOn ? '1' : '0',
        trial: trialMode ? '1' : '0',
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.push('/(tabs)')}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🤖 Play vs Computer</Text>
      <Text style={styles.subtitle}>Choose your difficulty</Text>

      {/* Level Cards */}
      <View style={styles.levels}>
        {LEVELS.map((lvl) => {
          const selected = selectedLevel === lvl.id;
          return (
            <TouchableOpacity
              key={lvl.id}
              style={[styles.levelCard, selected && { borderColor: lvl.color, backgroundColor: `${lvl.color}18` }]}
              onPress={() => setSelectedLevel(lvl.id)}
            >
              <View style={styles.levelLeft}>
                <Text style={styles.levelIcon}>{lvl.icon}</Text>
                <View>
                  <Text style={styles.levelLabel}>{lvl.label}</Text>
                  <Text style={[styles.levelTitle, { color: lvl.color }]}>{lvl.title}</Text>
                  <Text style={styles.levelDesc}>{lvl.desc}</Text>
                </View>
              </View>
              {selected && (
                <View style={[styles.selectedDot, { backgroundColor: lvl.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Options */}
      <View style={styles.optionsCard}>
        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionTitle}>💡 Hints & Next Move Suggestions</Text>
            <Text style={styles.optionDesc}>Shows best move suggestions for beginners</Text>
          </View>
          <Switch
            value={hintsOn}
            onValueChange={setHintsOn}
            trackColor={{ false: '#1e293b', true: '#3b82f6' }}
            thumbColor={hintsOn ? '#fff' : '#64748b'}
          />
        </View>

        <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }]}>
          <View>
            <Text style={styles.optionTitle}>🎯 Trial Mode</Text>
            <Text style={styles.optionDesc}>Practice freely — game won't be saved</Text>
          </View>
          <Switch
            value={trialMode}
            onValueChange={setTrialMode}
            trackColor={{ false: '#1e293b', true: '#f59e0b' }}
            thumbColor={trialMode ? '#fff' : '#64748b'}
          />
        </View>
      </View>

      {/* Play Button */}
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: LEVELS[selectedLevel - 1].color }]}
        onPress={handlePlay}
      >
        <Text style={styles.playBtnText}>
          ▶  Play as {LEVELS[selectedLevel - 1].title}
          {trialMode ? ' (Trial)' : ''}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  back: { color: '#60a5fa', fontSize: 16, fontWeight: '600', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  levels: { gap: 10, marginBottom: 24 },
  levelCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  levelIcon: { fontSize: 28 },
  levelLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  levelTitle: { fontSize: 16, fontWeight: '700', marginTop: 1 },
  levelDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
  optionsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24, gap: 16,
  },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 2 },
  optionDesc: { fontSize: 12, color: '#64748b', maxWidth: 220 },
  playBtn: {
    borderRadius: 16, padding: 18, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  playBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
