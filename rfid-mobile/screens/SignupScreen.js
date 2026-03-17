import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import APIService from '../services/api';

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

const SignupScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('Agent'); // Default role
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        // Validation
        if (!username || !password || !confirmPassword) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 4) {
            Alert.alert('Error', 'Password must be at least 4 characters');
            return;
        }

        setLoading(true);
        try {
            const result = await APIService.signup(username, password, role);
            if (result.success) {
                Alert.alert('Success', 'Account created successfully!', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                ]);
            } else {
                Alert.alert('Signup Failed', result.message || 'Check your details and try again');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the RFID Payment System</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter username"
                        placeholderTextColor={THEME.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter password"
                        placeholderTextColor={THEME.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm password"
                        placeholderTextColor={THEME.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <Text style={styles.label}>Select Your Role</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'Agent' ? styles.activeRole : styles.inactiveRole
                            ]}
                            onPress={() => setRole('Agent')}
                        >
                            <Text style={styles.roleEmoji}>💰</Text>
                            <Text style={styles.roleTitle}>Agent</Text>
                            <Text style={styles.roleSubtitle}>Wallet Top-Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'Salesperson' ? styles.activeRole : styles.inactiveRole
                            ]}
                            onPress={() => setRole('Salesperson')}
                        >
                            <Text style={styles.roleEmoji}>💳</Text>
                            <Text style={styles.roleTitle}>Salesperson</Text>
                            <Text style={styles.roleSubtitle}>Process Payments</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.signupButtonText}>SIGN UP</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.loginLink}
                    >
                        <Text style={styles.loginLinkText}>
                            Already have an account? <Text style={{ color: THEME.secondary }}>Login</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    contentContainer: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: THEME.secondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    subtitle: {
        fontSize: 16,
        color: THEME.textSecondary,
        opacity: 0.8,
    },
    form: {
        width: '100%',
    },
    label: {
        color: THEME.secondary,
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: THEME.cardBg,
        color: THEME.text,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    roleCard: {
        width: '48%',
        padding: 16,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        backgroundColor: THEME.cardBg,
    },
    activeRole: {
        borderColor: THEME.secondary,
        backgroundColor: '#7c7cff20',
    },
    inactiveRole: {
        borderColor: THEME.border,
    },
    roleEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    roleTitle: {
        color: THEME.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    roleSubtitle: {
        color: THEME.textMuted,
        fontSize: 12,
        textAlign: 'center',
    },
    signupButton: {
        backgroundColor: THEME.secondary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 32,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    signupButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    loginLinkText: {
        color: THEME.textMuted,
        fontSize: 14,
    },
});

export default SignupScreen;
