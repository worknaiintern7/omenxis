import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !email || !password) return Alert.alert('Error', 'All fields are required');
    if (password !== confirm) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(username, email, password);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed';
      console.log('Register error:', JSON.stringify(err?.response?.data));
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>♟ Chess Game</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#64748b"
            value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748b"
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748b"
            value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#64748b"
            value={confirm} onChangeText={setConfirm} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: 32, fontWeight: '800', color: '#60a5fa', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 16, marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#94a3b8', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#60a5fa', fontWeight: '700' },
});
