import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import APIService from '../services/api';
import WebSocketService from '../services/websocket';
import ReceiptService from '../services/receipt';

const THEME = {
    background: '#0a0c1b',
    cardBg: '#1a1f4d',
    primary: '#7c7cff',
    secondary: '#00f2fe',
    success: '#4ade80',
    error: '#ff6b6b',
    text: '#ffffff',
    textSecondary: '#7c7cff',
    textMuted: '#7c7cff80',
    border: '#7c7cff40',
};

const SERVICES = {
    Food: [
        { name: 'Coffee', price: 500 },
        { name: 'Sandwich', price: 1000 },
        { name: 'Lunch Meal', price: 2000 },
    ],
    Transport: [
        { name: 'Bus Ticket', price: 300 },
        { name: 'Moto Ride', price: 500 },
        { name: 'Taxi', price: 1500 },
    ],
    Services: [
        { name: 'Printing', price: 200 },
        { name: 'Laundry', price: 1000 },
        { name: 'Haircut', price: 2000 },
    ],
};

const PaymentScreen = ({ route }) => {
    const { username } = route.params || { username: 'Salesperson' };

    const [uid, setUid] = useState('');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [cardDetected, setCardDetected] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Food');
    const [selectedService, setSelectedService] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        const handleWebSocketMessage = (message) => {
            if (message.type === 'mqtt') {
                if (message.topic.includes('/card/status')) {
                    setUid(message.data.uid);
                    setCurrentBalance(message.data.balance);
                    setCardDetected(true);
                } else if (message.topic.includes('/card/payment/result')) {
                    setLoading(false);
                    if (message.data.success) {
                        setUid(message.data.uid); // Ensure UID is set for receipt
                        setCurrentBalance(message.data.new_balance);
                        setSuccessData({
                            uid: message.data.uid,
                            amount: message.data.amount,
                            new_balance: message.data.new_balance,
                            serviceName: selectedService ? selectedService.name : 'Custom Payment',
                            category: selectedCategory,
                            username: username
                        });
                        Alert.alert('✅ Payment Success', `New Balance: ${message.data.new_balance} RWF`);
                        setSelectedService(null);
                        setCustomAmount('');
                    } else {
                        Alert.alert('❌ Payment Failed', message.data.message || 'Transaction could not be completed');
                    }
                }
            }
        };

        WebSocketService.addListener(handleWebSocketMessage);
        return () => {
            WebSocketService.removeListener(handleWebSocketMessage);
        };
    }, []);

    const getAmount = () => {
        if (selectedService) return selectedService.price;
        if (customAmount) return parseInt(customAmount);
        return 0;
    };

    const handleProcessPayment = async () => {
        const amount = getAmount();
        const serviceName = selectedService ? selectedService.name : 'Custom Payment';

        if (!uid) {
            Alert.alert('Error', 'Please scan an RFID card first');
            return;
        }

        if (amount <= 0) {
            Alert.alert('Error', 'Please select a service or enter an amount');
            return;
        }

        if (amount > currentBalance) {
            Alert.alert('Insufficient Balance', `Card balance (${currentBalance} RWF) is less than required (${amount} RWF)`);
            return;
        }

        setLoading(true);
        try {
            const result = await APIService.payment(
                uid,
                amount,
                selectedCategory,
                serviceName,
                'Salesperson'
            );

            if (result.success) {
                Alert.alert('Info', 'Please present card to reader to authorize payment');
            } else {
                Alert.alert('Error', result.message || 'Payment request failed');
                setLoading(false);
            }
        } catch (error) {
            Alert.alert('Error', 'Network error occurred');
            setLoading(false);
        }
    };

    const amountToPay = getAmount();
    const remainingBalance = currentBalance - amountToPay;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, <Text style={{ color: THEME.secondary }}>{username}</Text></Text>
                <Text style={styles.screenTitle}>💳 Process Payment</Text>
            </View>

            {/* Card Status Section */}
            <View style={[styles.card, cardDetected && styles.cardActive]}>
                <Text style={styles.cardHeader}>
                    {cardDetected ? '💳 Card Ready' : '📇 Scan RFID Card'}
                </Text>
                {cardDetected ? (
                    <>
                        <Text style={styles.uidText}>{uid}</Text>
                        <View style={styles.balanceContainer}>
                            <Text style={styles.balanceValue}>{currentBalance}</Text>
                            <Text style={styles.balanceUnit}>RWF</Text>
                        </View>
                        <Text style={styles.balanceLabel}>Available Balance</Text>
                    </>
                ) : (
                    <View style={styles.waitingContainer}>
                        <ActivityIndicator color={THEME.primary} size="large" />
                        <Text style={styles.waitingText}>Waiting for customer card...</Text>
                    </View>
                )}
            </View>

            {/* Category Selection */}
            <Text style={styles.sectionTitle}>Select Category</Text>
            <View style={styles.categoryRow}>
                {Object.keys(SERVICES).map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.categoryButton,
                            selectedCategory === cat ? styles.activeCategory : styles.inactiveCategory
                        ]}
                        onPress={() => {
                            setSelectedCategory(cat);
                            setSelectedService(null);
                        }}
                    >
                        <Text style={[styles.categoryButtonText, selectedCategory === cat && { color: '#000' }]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Service Grid */}
            <Text style={styles.sectionTitle}>Select Service</Text>
            <View style={styles.serviceGrid}>
                {SERVICES[selectedCategory].map((service) => (
                    <TouchableOpacity
                        key={service.name}
                        style={[
                            styles.serviceCard,
                            selectedService?.name === service.name ? styles.activeService : styles.inactiveService
                        ]}
                        onPress={() => {
                            setSelectedService(service);
                            setCustomAmount('');
                        }}
                    >
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.servicePrice}>{service.price} RWF</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Custom Amount */}
            <Text style={styles.sectionTitle}>Or Enter Custom Amount</Text>
            <TextInput
                style={styles.input}
                value={customAmount}
                onChangeText={(text) => {
                    setCustomAmount(text);
                    setSelectedService(null);
                }}
                keyboardType="numeric"
                placeholder="Enter custom amount RWF"
                placeholderTextColor={THEME.textMuted}
            />

            {/* Payment Summary */}
            {(selectedService || customAmount) && (
                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Amount:</Text>
                        <Text style={styles.summaryValue}>{amountToPay} RWF</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Remaining:</Text>
                        <Text style={[styles.summaryValue, { color: remainingBalance < 0 ? THEME.error : THEME.secondary }]}>
                            {remainingBalance} RWF
                        </Text>
                    </View>
                </View>
            )}

            {/* Pay Button */}
            <TouchableOpacity
                style={[styles.payButton, (!uid || loading || (amountToPay > currentBalance)) && styles.buttonDisabled]}
                onPress={handleProcessPayment}
                disabled={!uid || loading || (amountToPay > currentBalance)}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.payButtonText}>💸 Process Payment</Text>
                )}
            </TouchableOpacity>

            {/* Receipt Modal/Buttons */}
            {successData && (
                <View style={styles.successContainer}>
                    <Text style={styles.successMessage}>🎉 Payment Successful! Your receipt is ready.</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.receiptButton}
                            onPress={() => ReceiptService.generateReceipt(successData, 'PAYMENT')}
                        >
                            <Text style={styles.receiptButtonText}>📄 Download Receipt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.receiptButton, { backgroundColor: THEME.primary }]}
                            onPress={() => setSuccessData(null)}
                        >
                            <Text style={styles.receiptButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginTop: 20,
        marginBottom: 24,
    },
    welcomeText: {
        color: THEME.text,
        fontSize: 16,
        opacity: 0.9,
    },
    screenTitle: {
        color: THEME.primary,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 4,
    },
    card: {
        backgroundColor: THEME.cardBg,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: THEME.border,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    cardActive: {
        borderColor: THEME.secondary,
        borderWidth: 1.5,
    },
    cardHeader: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    uidText: {
        color: THEME.secondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
        marginBottom: 16,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    balanceValue: {
        color: THEME.secondary,
        fontSize: 48,
        fontWeight: 'bold',
        textShadowColor: THEME.secondary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    balanceUnit: {
        color: THEME.secondary,
        fontSize: 18,
        marginLeft: 8,
        fontWeight: '600',
    },
    balanceLabel: {
        color: THEME.textMuted,
        fontSize: 14,
        marginTop: 4,
    },
    waitingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    waitingText: {
        color: THEME.textMuted,
        marginTop: 12,
    },
    sectionTitle: {
        color: THEME.secondary,
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 12,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    categoryButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
    },
    activeCategory: {
        backgroundColor: THEME.secondary,
        borderColor: THEME.secondary,
    },
    inactiveCategory: {
        backgroundColor: 'transparent',
        borderColor: THEME.border,
    },
    categoryButtonText: {
        color: THEME.textSecondary,
        fontWeight: 'bold',
    },
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    serviceCard: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        backgroundColor: THEME.cardBg,
    },
    activeService: {
        borderColor: THEME.secondary,
        backgroundColor: '#7c7cff20',
    },
    inactiveService: {
        borderColor: THEME.border,
    },
    serviceName: {
        color: THEME.text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    servicePrice: {
        color: THEME.secondary,
        fontSize: 14,
        marginTop: 4,
    },
    input: {
        backgroundColor: THEME.cardBg,
        color: THEME.text,
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    summaryBox: {
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#7c7cff20',
        borderLeftWidth: 4,
        borderLeftColor: THEME.secondary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    summaryLabel: {
        color: THEME.text,
        fontSize: 15,
    },
    summaryValue: {
        color: THEME.secondary,
        fontWeight: 'bold',
        fontSize: 15,
    },
    payButton: {
        backgroundColor: THEME.error,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginVertical: 32,
        shadowColor: THEME.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    successContainer: {
        marginTop: 20,
        padding: 20,
        backgroundColor: THEME.cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: THEME.success,
        alignItems: 'center',
    },
    successMessage: {
        color: THEME.success,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    receiptButton: {
        flex: 1,
        backgroundColor: THEME.success,
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    receiptButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 13,
    },
});

export default PaymentScreen;
