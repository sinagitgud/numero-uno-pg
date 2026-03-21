import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../_layout';

export default function TenantHomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<any>(null);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenantRes, invoiceRes]: any[] = await Promise.all([
          api.get('/tenants/me'),
          api.get('/invoices/my'),
        ]);
        setTenant(tenantRes.data);
        // Get current month invoice
        const now = new Date();
        const current = invoiceRes.data?.find(
          (inv: any) => inv.month === now.getMonth() + 1 && inv.year === now.getFullYear()
        );
        setCurrentInvoice(current);
      } catch {}
    };
    fetchData();
  }, []);

  const balance = currentInvoice
    ? Number(currentInvoice.amountDue) - Number(currentInvoice.amountPaid)
    : null;

  const isPaid = currentInvoice?.status === 'PAID';

  return (
    <ScrollView style={styles.container}>
      {/* Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Namaste, {user?.name?.split(' ')[0]} 🙏</Text>
        <Text style={styles.property}>
          {tenant?.bed?.room?.property?.name} · Room {tenant?.bed?.room?.number} · {tenant?.bed?.label}
        </Text>
      </View>

      {/* Rent Status Card */}
      <View style={[styles.rentCard, isPaid ? styles.paidCard : styles.dueCard]}>
        <Text style={styles.rentMonth}>
          {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <Text style={styles.rentAmount}>
          {isPaid ? '✅ Rent Paid' : `₹${balance?.toLocaleString('en-IN') || 0} Due`}
        </Text>
        {!isPaid && currentInvoice && (
          <Text style={styles.rentSub}>
            Paid ₹{Number(currentInvoice.amountPaid).toLocaleString('en-IN')} of ₹{Number(currentInvoice.amountDue).toLocaleString('en-IN')}
          </Text>
        )}
        {!isPaid && (
          <TouchableOpacity style={styles.payButton}>
            <Text style={styles.payButtonText}>{t('rent.payNow')} 💳</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Info */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Monthly Rent</Text>
          <Text style={styles.infoValue}>₹{Number(tenant?.rate || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Security Deposit</Text>
          <Text style={styles.infoValue}>₹{Number(tenant?.securityReceived || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Check-in</Text>
          <Text style={styles.infoValue}>
            {tenant?.checkIn ? new Date(tenant.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Rent Due</Text>
          <Text style={styles.infoValue}>1st of month</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingBottom: 24 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  property: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  rentCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  paidCard: { backgroundColor: Colors.success },
  dueCard: { backgroundColor: Colors.secondary },
  rentMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  rentAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  rentSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  payButton: { marginTop: 16, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  payButtonText: { color: Colors.secondary, fontWeight: '700', fontSize: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  infoCard: { width: '46%', margin: '2%', backgroundColor: Colors.card, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  infoLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
