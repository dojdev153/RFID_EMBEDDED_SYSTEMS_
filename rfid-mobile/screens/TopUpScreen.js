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
    background: '#0a0c1b',      // Deep navy background
    cardBg: '#1a1f4d',          // Dark blue card background
    primary: '#7c7cff',         // Purple primary
    secondary: '#00f2fe',       // Cyan secondary/accent
    success: '#4ade80',         // Green for top-ups
    error: '#ff6b6b',           // Red for payments/errors
    text: '#ffffff',            // White text
    textSecondary: '#7c7cff',   // Purple secondary text
    textMuted: '#7c7cff80',     // Purple 50% opacity
    border: '#7c7cff40',        // Purple 25% opacity
};

const TopUpScreen = ({ route }) => {
    const { username } = route.params || { username: 'Agent' };

    const [uid, setUid] = useState('');
    const [amount, setAmount] = useState('');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [cardDetected, setCardDetected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        const handleCardUpdate = (message) => {
            if (message.type === 'mqtt') {
                if (message.topic.includes('/card/status')) {
                    setUid(message.data.uid);
                    setCurrentBalance(message.data.balance);
                    setCardDetected(true);
                    Alert.alert('💳 Card Detected', `UID: ${message.data.uid}\nBalance: ${message.data.balance} RWF`);
                } else if (message.topic.includes('/card/balance')) {
                    setCurrentBalance(message.data.new_balance);
                    setSuccessData({
                        uid: message.data.uid,
                        amount: message.data.amount,
                        balance_after: message.data.new_balance,
                        balance_before: message.data.new_balance - message.data.amount,
                        username: username
                    });
                    Alert.alert('✅ Success', `New Balance: ${message.data.new_balance} RWF`);
                    setLoading(false);
                }
            }
        };

        WebSocketService.addListener(handleCardUpdate);
        return () => {
            WebSocketService.removeListener(handleCardUpdate);
        };
    }, []);

    const handleTopUp = async () => {
        if (!uid) {
            Alert.alert('Error', 'Please scan an RFID card first');
            return;
        }

        if (!amount || parseInt(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const result = await APIService.topup(uid, parseInt(amount));
            if (result.success) {
                Alert.alert('Info', 'Please present card to reader now to complete top-up');
                // Let them wait for the balance update from WebSocket
            } else {
                Alert.alert('Error', result.message || 'Top-up failed');
                setLoading(false);
            }
        } catch (error) {
            Alert.alert('Error', 'Network error occurred');
            setLoading(false);
        }
    };

    const quickAmounts = [500, 1000, 2000];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, <Text style={{ color: THEME.secondary }}>{username}</Text></Text>
                <Text style={styles.screenTitle}>💰 Wallet Top-Up Agent</Text>
            </View>

            <View style={[styles.card, cardDetected && styles.cardActive]}>
                <Text style={styles.cardHeader}>
                    {cardDetected ? '💳 Card Detected' : '📇 Scan RFID Card'}
                </Text>

                {cardDetected ? (
                    <>
                        <Text style={styles.uidText}>{uid}</Text>
                        <View style={styles.balanceContainer}>
                            <Text style={styles.balanceValue}>{currentBalance}</Text>
                            <Text style={styles.balanceUnit}>RWF</Text>
                        </View>
                        <Text style={styles.balanceLabel}>Current Balance</Text>
                    </>
                ) : (
                    <View style={styles.waitingContainer}>
                        <ActivityIndicator color={THEME.primary} size="large" />
                        <Text style={styles.waitingText}>Waiting for card...</Text>
                    </View>
                )}
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Card UID</Text>
                <TextInput
                    style={[styles.input, { color: THEME.secondary, fontWeight: 'bold' }]}
                    value={uid}
                    editable={false}
                    placeholder="Scan RFID card..."
                    placeholderTextColor={THEME.textMuted}
                />

                <Text style={styles.label}>Top-Up Amount (RWF)</Text>
                <View style={styles.quickAmountRow}>
                    {quickAmounts.map((amt) => (
                        <TouchableOpacity
                            key={amt}
                            style={styles.quickButton}
                            onPress={() => setAmount(amt.toString())}
                        >
                            <Text style={styles.quickButtonText}>{amt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="Or enter custom amount"
                    placeholderTextColor={THEME.textMuted}
                />

                <TouchableOpacity
                    style={[styles.button, (!uid || loading) && styles.buttonDisabled]}
                    onPress={handleTopUp}
                    disabled={!uid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>⚡ Smart Top-Up</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Receipt Section */}
            {successData && (
                <View style={styles.successContainer}>
                    <Text style={styles.successMessage}>🎉 Top-Up Successful! Your receipt is ready.</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.receiptButton}
                            onPress={() => ReceiptService.generateReceipt(successData, 'TOPUP')}
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

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    💡 Scan the RFID card, enter the amount, and click 'Smart Top-Up'. Then present the card to the reader within 10 seconds.
                </Text>
            </View>
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
        // Glassmorphism effect
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
        letterSpacing: 1,
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
        textShadowRadius: 10, // Neon glow effect
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
        fontSize: 15,
    },
    form: {
        width: '100%',
    },
    label: {
        color: THEME.secondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
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
    quickAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    quickButton: {
        width: '30%',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: THEME.primary,
        alignItems: 'center',
        backgroundColor: '#7c7cff10',
    },
    quickButtonText: {
        color: THEME.secondary,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: THEME.secondary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 32,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoBox: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#7c7cff20',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: THEME.secondary,
    },
    infoText: {
        color: THEME.text,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default TopUpScreen;
