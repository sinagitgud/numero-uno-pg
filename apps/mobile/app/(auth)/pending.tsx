import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../_layout';

export default function PendingScreen() {
  const { t } = useTranslation();
  const { logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.title}>{t('auth.pendingApproval')}</Text>
      <Text style={styles.subtitle}>
        Your registration request has been sent. Please wait for the manager to approve your account.
      </Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.background },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: { borderWidth: 1, borderColor: Colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  buttonText: { color: Colors.danger, fontWeight: '600' },
});
