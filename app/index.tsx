// index.tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Button } from 'react-native-paper';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to chat
    // If not, they can choose to login or signup
    if (user) {
      router.replace('/chat');
    }
  }, [user, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoText}>GC</Text>
            </View>
          </View>
          
          <Text style={styles.title}>Global Chat App</Text>
          <Text style={styles.subtitle}>Connect with people around the world in real-time</Text>
          
          <View style={styles.featureContainer}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🌍</Text>
              </View>
              <Text style={styles.featureTitle}>Global Community</Text>
              <Text style={styles.featureText}>Chat with people from all over the world</Text>
            </View>
            
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>💬</Text>
              </View>
              <Text style={styles.featureTitle}>Real-time Chat</Text>
              <Text style={styles.featureText}>Instantly connect with others</Text>
            </View>
            
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🔒</Text>
              </View>
              <Text style={styles.featureTitle}>Secure</Text>
              <Text style={styles.featureText}>Your data is protected</Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              onPress={() => router.push('/login')}
              icon="login"
            >
              Login
            </Button>
            
            <Button
              mode="outlined"
              style={styles.signupButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.signupButtonLabel}
              onPress={() => router.push('/signup')}
              icon="account-plus"
            >
              Create Account
            </Button>
          </View>
        </View>
        
        <Text style={styles.footer}>© 2025 Global Chat</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#6200ee',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 40,
    width: '100%',
    maxWidth: 600,
  },
  feature: {
    alignItems: 'center',
    width: '30%',
    minWidth: 100,
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0ebfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#333',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  loginButton: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  signupButton: {
    borderRadius: 8,
    borderColor: '#6200ee',
    borderWidth: 1,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButtonLabel: {
    fontSize: 16,
    color: '#6200ee',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});