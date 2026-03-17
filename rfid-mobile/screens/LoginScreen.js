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

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter both username and password');
            return;
        }

        setLoading(true);
        try {
            const result = await APIService.login(username, password);
            if (result.success) {
                // Redirect based on role
                if (result.role === 'Admin' || result.role === 'Developer') {
                    navigation.navigate('Dashboard', { username: result.username });
                } else if (result.role === 'Agent') {
                    navigation.navigate('TopUp', { username: result.username });
                } else if (result.role === 'Salesperson') {
                    navigation.navigate('Payment', { username: result.username });
                } else {
                    // Default fallback
                    navigation.navigate('Dashboard', { username: result.username });
                }
            } else {
                Alert.alert('Login Failed', result.message || 'Invalid credentials');
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
                    <Text style={styles.title}>RFID System</Text>
                    <Text style={styles.subtitle}>Secure Payment Access</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your username"
                        placeholderTextColor={THEME.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor={THEME.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.loginButtonText}>LOGIN</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Signup')}
                        style={styles.signupLink}
                    >
                        <Text style={styles.signupLinkText}>
                            Don't have an account? <Text style={{ color: THEME.secondary }}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by RFID Team TopDog ⚡</Text>
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
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: THEME.secondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 2,
        textShadowColor: THEME.secondary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 16,
        color: THEME.textSecondary,
        opacity: 0.8,
    },
    form: {
        width: '100%',
        backgroundColor: THEME.cardBg,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: THEME.border,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
    label: {
        color: THEME.secondary,
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: THEME.background,
        color: THEME.text,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    loginButton: {
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
    loginButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    signupLinkText: {
        color: THEME.textMuted,
        fontSize: 14,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        color: THEME.textMuted,
        fontSize: 12,
        fontStyle: 'italic',
    },
});

export default LoginScreen;
