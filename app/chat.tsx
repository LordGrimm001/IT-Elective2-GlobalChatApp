// app/chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { TextInput, Button, Avatar, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db } from '../app/_layout';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';

type Message = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Date;
  userAvatar?: string;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user, logout } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  // Effect to redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Effect for message loading
  useEffect(() => {
    if (!user) return;
    
    let unsubscribe: () => void;
    
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'asc')
      );
      
      unsubscribe = onSnapshot(
        messagesQuery,
        (querySnapshot) => {
          const messageList: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt || Date.now());

            messageList.push({
              id: doc.id,
              text: data.text || '',
              userId: data.userId || '',
              userName: data.userName || 'Anonymous',
              createdAt: timestamp,
              userAvatar: data.userAvatar || undefined
            });
          });
          
          setMessages(messageList);
          setLoading(false);
          
          // Scroll to bottom after short delay
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (err) => {
          console.error("Firestore error:", err);
          setError("Failed to load messages. Please check your connection.");
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Firebase setup error:", err);
      setError("Failed to connect to chat service.");
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;

    try {
      setSending(true);
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        userAvatar: user.photoURL || null
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      setError("Failed to log out. Please try again.");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.userId === user?.uid;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Avatar.Text
            size={32}
            label={item.userName.substring(0, 2).toUpperCase()}
            style={styles.avatar}
          />
        )}

        <View style={styles.messageContentContainer}>
          {!isCurrentUser && (
            <Text style={styles.userName}>{item.userName}</Text>
          )}

          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              {item.text}
            </Text>
            <Text style={[
              styles.timeText,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => {
            setError(null);
            setLoading(true);
          }} 
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Chat</Text>
        <View style={styles.headerRight}>
          <IconButton 
            icon="account-edit" 
            size={24} 
            onPress={() => router.push('/profile')} 
          />
          <IconButton 
            icon="logout" 
            size={24} 
            onPress={handleLogout} 
          />
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 100, android: 80 })}
      >
        <View style={styles.inputContainer}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            style={styles.input}
            multiline
            maxLength={500}
          />
          <Button
            mode="contained"
            onPress={handleSend}
            loading={sending}
            disabled={!messageText.trim() || sending}
            style={styles.sendButton}
            labelStyle={styles.sendButtonLabel}
            icon="send"
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6200ee',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff5252',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9e9e9e',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  headerRight: {
    flexDirection: 'row',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    backgroundColor: '#6200ee',
  },
  messageContentContainer: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 12,
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#555',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#e9e9eb',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#ffffff',
  },
  otherUserText: {
    color: '#000000',
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#666666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#808080',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    maxHeight: 100,
    fontSize: 16,
  
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 24,
    paddingHorizontal: 8,
  },
  sendButtonLabel: {
    fontSize: 14,
  },
});