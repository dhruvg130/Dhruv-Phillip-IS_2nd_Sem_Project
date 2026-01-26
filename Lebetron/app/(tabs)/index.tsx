import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth-context';

export default function HomeScreen() {
  const { session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleLogin = async () => {
    setMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setMsg(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setMsg('');
    if (!email.trim()) {
      setMsg('Enter your email first.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setMsg(error.message);
    else setMsg('Check your email for the reset link.');
  };

  const loggedIn = !!session;

  return (
    <View style={styles.page}>
      {/* Your real home content */}
      <Text style={styles.homeTitle}>Home</Text>
      <Text style={styles.homeText}>Welcome to your front page 👋</Text>

      {/* Force-login modal overlay */}
      <Modal
        visible={!loggedIn}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}} // Android back button does nothing
      >
        {/* Full-screen dim background. Pressable used so taps don't close modal */}
        <Pressable style={styles.backdrop} onPress={() => {}}>
          <View style={styles.card}>
            <Text style={styles.title}>Log In</Text>

            {authLoading ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
                <Text style={styles.subtle}>Loading session…</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPw}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.showBtn}>
                    <Text style={styles.showText}>{showPw ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                {!!msg && <Text style={styles.msg}>{msg}</Text>}

                <TouchableOpacity
                  style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginText}>Log In</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#0b1220' },
  homeTitle: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 6 },
  homeText: { color: '#cbd5e1' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#111c33',
    borderRadius: 16,
    padding: 18,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  subtle: { color: '#94a3b8', textAlign: 'center', marginTop: 8 },

  input: {
    backgroundColor: '#0b152b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: 'white',
    marginBottom: 12,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  showBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  showText: { color: '#60a5fa', fontWeight: '600' },

  msg: { color: '#fca5a5', marginBottom: 10, textAlign: 'center' },

  loginBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginText: { color: 'white', fontWeight: '700' },

  forgot: { color: '#94a3b8', marginTop: 12, textAlign: 'center' },
});
