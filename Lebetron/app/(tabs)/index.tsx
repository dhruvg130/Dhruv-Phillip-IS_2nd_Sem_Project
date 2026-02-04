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
import { supabase } from '../../lib/supabase'; // ✅ use relative if @/ is red
import { useAuth } from '../../hooks/auth-context';

export default function HomeScreen() {
  const { session, loading: authLoading } = useAuth();
  const loggedIn = !!session;

  const [mode, setMode] = useState<'login' | 'signup'>('login');

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

  const handleSignup = async () => {
    setMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    // If email confirmations are ON, user may need to confirm before login works
    if (!data.session) {
      setMsg('Check your email to confirm your account, then log in.');
      setMode('login');
      setLoading(false);
      return;
    }

    // Optional: create a profile row right away (only if you created profiles table + RLS)
    const userId = data.session.user.id;
    await supabase.from('profiles').upsert({
      id: userId,
      email: data.session.user.email,
    });

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMsg('Enter your email first.');
      return;
    }

  

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) setMsg(error.message);
    else setMsg('Check your email for the reset link.');
  };

  const handleLogout = async () => {
      setMsg('');
      const { error } = await supabase.auth.signOut();
      if (error) setMsg(error.message);
    };
    
  return (
    <View style={styles.page}>
      {/* Your real home content behind the modal */}
      <Text style={styles.homeTitle}>Home</Text>
      <Text style={styles.homeText}>Welcome to your front page 👋</Text>

      {loggedIn && (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.loggedInAs}>Logged in as {session?.user?.email}</Text>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Forced auth modal */}
      <Modal
        visible={!loggedIn}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <Pressable style={styles.backdrop} onPress={() => {}}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('login');
                  setMsg('');
                }}
              >
                <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('signup');
                  setMsg('');
                }}
              >
                <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

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
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={mode === 'login' ? handleLogin : handleSignup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {mode === 'login' ? 'Log In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>
                {mode === 'login' && (
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgot}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                {mode === 'signup' && (
                  <Text style={styles.smallNote}>
                    By signing up, you may need to confirm your email depending on Supabase settings.
                  </Text>
                )}
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

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0b152b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#1d4ed8',
  },
  toggleText: { color: '#94a3b8', fontWeight: '700' },
  toggleTextActive: { color: 'white' },

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
  showText: { color: '#60a5fa', fontWeight: '700' },

  msg: { color: '#fca5a5', marginBottom: 10, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: 'white', fontWeight: '800' },

  forgot: { color: '#94a3b8', marginTop: 12, textAlign: 'center' },
  smallNote: { color: '#94a3b8', marginTop: 10, fontSize: 12, textAlign: 'center' },
  loggedInAs: {
  color: '#94a3b8',
  marginBottom: 10,
},

logoutBtn: {
  alignSelf: 'flex-start',
  backgroundColor: '#1e293b',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#334155',
},

logoutText: {
  color: '#f87171',
  fontWeight: '800',
},
}); 

