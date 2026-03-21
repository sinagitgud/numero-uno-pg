import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../_layout';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    // TODO: Phase 2 — persist via PATCH /api/auth/language
  };

  const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Business Owner',
    SALES_MANAGER: 'Sales Manager',
    OPS_MANAGER: 'Operations Manager',
    TENANT: 'Tenant',
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.role}>{ROLE_LABELS[user?.role || ''] || user?.role}</Text>

      {/* Settings */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('profile.language')}</Text>
          <View style={styles.langToggle}>
            <Text style={styles.langLabel}>{i18n.language === 'hi' ? 'हिंदी' : 'English'}</Text>
            <Switch
              value={i18n.language === 'hi'}
              onValueChange={toggleLanguage}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t('profile.version', { version: '1.0.0' })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  role: { fontSize: 14, color: Colors.textMuted, marginTop: 4, marginBottom: 32 },
  section: { width: '90%', backgroundColor: Colors.card, borderRadius: 12, padding: 4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  label: { fontSize: 15, color: Colors.text },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langLabel: { fontSize: 14, color: Colors.textMuted },
  logoutButton: { borderWidth: 1, borderColor: Colors.danger, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40, marginTop: 16 },
  logoutText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
  version: { position: 'absolute', bottom: 32, color: Colors.textMuted, fontSize: 12 },
});
