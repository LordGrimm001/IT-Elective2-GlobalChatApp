// app/profile.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Avatar, HelperText, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, updateUserName } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [nameError, setNameError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const router = useRouter();
  
  if (!user) {
    router.replace('/login');
    return null;
  }
  
  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError('Display name cannot be empty');
      return false;
    }
    setNameError('');
    return true;
  };
  
  const handleUpdateProfile = async () => {
    if (!validateName(displayName)) {
      return;
    }
    
    try {
      setIsUpdating(true);
      await updateUserName(displayName);
      setSuccessMsg('Your profile has been updated successfully');
      setShowSuccess(true);
      
      // Give the user time to see the success message before redirecting
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      Alert.alert('Update Failed', error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getInitials = () => {
    if (!displayName) return 'U';
    
    const names = displayName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>
            
            <View style={styles.avatarContainer}>
              <Avatar.Text 
                size={100} 
                label={getInitials()}
                style={styles.avatar}
              />
            </View>
            
            <View style={styles.formContainer}>
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  if (nameError) validateName(text);
                }}
                onBlur={() => validateName(displayName)}
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
                error={!!nameError}
              />
              {nameError ? <HelperText type="error">{nameError}</HelperText> : null}
              
              <View style={styles.emailContainer}>
                <Text style={styles.emailLabel}>Email</Text>
                <Text style={styles.emailText}>
                  {user.email}
                </Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={handleUpdateProfile} 
                  loading={isUpdating}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon="content-save"
                >
                  Update Profile
                </Button>
                
                <Button 
                  mode="outlined" 
                  onPress={() => router.back()} 
                  style={styles.cancelButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.cancelButtonLabel}
                  icon="arrow-left"
                >
                  Go Back
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={3000}
        style={styles.successSnackbar}
      >
        {successMsg}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#6200ee',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    backgroundColor: '#6200ee',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  emailContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  emailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderRadius: 8,
    borderColor: '#6200ee',
    borderWidth: 1,
  },
  cancelButtonLabel: {
    fontSize: 16,
    color: '#6200ee',
  },
  successSnackbar: {
    backgroundColor: '#4caf50',
  },
});