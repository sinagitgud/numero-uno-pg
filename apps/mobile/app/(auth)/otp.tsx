import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../_layout';

export default function OtpScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    // TODO: Phase 2 — Firebase confirmationResult.confirm(otp)
    // On success → call POST /api/auth/register → check isActive
    // If active → navigate to correct dashboard
    // If not active → navigate to pending screen
    Alert.alert('Phase 2', 'OTP verification will be fully wired in Phase 2');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← {t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('auth.enterOtp')}</Text>
      <Text style={styles.subtitle}>{t('auth.otpSent', { phone })}</Text>

      <TextInput
        style={styles.otpInput}
        placeholder="● ● ● ● ● ●"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        textAlign="center"
        fontSize={28}
        letterSpacing={12}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('common.confirm')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resend}>
        <Text style={styles.resendText}>{t('auth.resendOtp')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, paddingTop: 80 },
  back: { marginBottom: 32 },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32 },
  otpInput: { borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, height: 64, marginBottom: 24, color: Colors.text },
  button: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resend: { alignItems: 'center', marginTop: 16 },
  resendText: { color: Colors.primary, fontSize: 14 },
});
