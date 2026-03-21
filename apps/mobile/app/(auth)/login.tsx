import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../_layout';

/**
 * Login screen — phone number entry for OTP login (tenants)
 * and email/password toggle for staff (owner/managers).
 *
 * Firebase Auth integration is wired in Phase 2.
 */
export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  const handlePhoneLogin = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    // TODO: Phase 2 — Firebase signInWithPhoneNumber
    router.push({ pathname: '/(auth)/otp', params: { phone: `+91${phone}` } });
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password');
      return;
    }
    setLoading(true);
    // TODO: Phase 2 — Firebase signInWithEmailAndPassword
    Alert.alert('Coming soon', 'Email login will be fully wired in Phase 2');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Language toggle */}
      <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
        <Text style={styles.langText}>{i18n.language === 'en' ? 'हिंदी' : 'English'}</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>{t('common.appName')}</Text>
        <Text style={styles.tagline}>PG Management Made Simple</Text>
      </View>

      {/* Login mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, loginMode === 'phone' && styles.modeBtnActive]}
          onPress={() => setLoginMode('phone')}
        >
          <Text style={[styles.modeBtnText, loginMode === 'phone' && styles.modeBtnTextActive]}>
            {t('auth.enterPhone')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, loginMode === 'email' && styles.modeBtnActive]}
          onPress={() => setLoginMode('email')}
        >
          <Text style={[styles.modeBtnText, loginMode === 'email' && styles.modeBtnTextActive]}>
            {t('auth.emailLogin')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Phone login */}
      {loginMode === 'phone' && (
        <View style={styles.form}>
          <View style={styles.phoneInput}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePhoneLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.login')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Email login */}
      {loginMode === 'email' && (
        <View style={styles.form}>
          <TextInput
            style={[styles.input, styles.fullInput]}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, styles.fullInput]}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.login')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center' },
  langToggle: { position: 'absolute', top: 56, right: 24 },
  langText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  header: { alignItems: 'center', marginBottom: 40 },
  appName: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  tagline: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.border, borderRadius: 8, marginBottom: 24, padding: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textMuted, fontWeight: '500' },
  modeBtnTextActive: { color: '#fff' },
  form: { gap: 12 },
  phoneInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.card },
  countryCode: { paddingHorizontal: 12, fontSize: 16, color: Colors.text, fontWeight: '600' },
  input: { flex: 1, height: 48, fontSize: 16, color: Colors.text },
  fullInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 16, backgroundColor: Colors.card, height: 48, flex: 0 },
  button: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
