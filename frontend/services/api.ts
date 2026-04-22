import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Expo Go on physical device, always use machine IP
const API_URL = 'http://192.168.1.5:5000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateFcmToken: (fcmToken: string) => api.put('/auth/fcm-token', { fcmToken }),
};

export const gameAPI = {
  saveGame: (data: { result: string; moves: number; duration: number; pgn: string }) =>
    api.post('/game/save', data),
  getHistory: () => api.get('/game/history'),
  getStats: () => api.get('/game/stats'),
};

export default api;
