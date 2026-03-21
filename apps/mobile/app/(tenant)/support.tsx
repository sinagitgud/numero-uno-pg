import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { Colors } from '../_layout';

const CATEGORIES = ['MAINTENANCE', 'FOOD', 'CLEANLINESS', 'WIFI', 'ROOMMATE', 'BILLING', 'GENERAL'];

export default function TenantSupportScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return Alert.alert('Select a category', 'Please choose a category for your request');
    if (!description.trim()) return Alert.alert('Add description', 'Please describe your issue');

    setSubmitting(true);
    try {
      await api.post('/tickets', { category: selected, description: description.trim() });
      Alert.alert('Submitted!', 'Your request has been raised. We\'ll get back to you soon.');
      setSelected('');
      setDescription('');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('tickets.newTicket')}</Text>

      {/* Category selection */}
      <Text style={styles.label}>{t('tickets.category')}</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, selected === cat && styles.catChipSelected]}
            onPress={() => setSelected(cat)}
          >
            <Text style={[styles.catText, selected === cat && styles.catTextSelected]}>
              {t(`tickets.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>{t('tickets.description')}</Text>
      <TextInput
        style={styles.textarea}
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
        placeholder={t('tickets.typeMessage')}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? t('common.loading') : t('common.submit')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  catChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  catText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  catTextSelected: { color: '#fff' },
  textarea: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.card, minHeight: 120, marginBottom: 24 },
  button: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
