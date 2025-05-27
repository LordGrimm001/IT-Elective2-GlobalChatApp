// app/create-post.tsx (Fixed - Remove undefined values)
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Card
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { createPost, validatePost, resizeImageToBase64 } from '../app/firebaseService';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');

  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    router.replace('/login');
    return null;
  }

  const validateForm = () => {
    const postData = { title, content };
    const errors = validatePost(postData);
    
    setTitleError('');
    setContentError('');
    
    errors.forEach(error => {
      if (error.includes('Title')) {
        setTitleError(error);
      } else if (error.includes('Content')) {
        setContentError(error);
      }
    });
    
    return errors.length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        try {
          setImageUri(result.assets[0].uri);
          // Convert to base64 for storage
          const base64Data = await resizeImageToBase64(result.assets[0].uri, 300, 0.5);
          setImageData(base64Data);
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to process image');
          setImageUri(null);
          setImageData(null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageData(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Create the post data object, only including defined values
      const postData: any = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        title: title.trim(),
        content: content.trim(),
      };

      // Only add optional fields if they have values
      if (user.photoURL) {
        postData.userAvatar = user.photoURL;
      }

      if (imageData) {
        postData.imageData = imageData;
      }

      await createPost(postData);

      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Create New Post</Text>
      
      <Card style={styles.formCard}>
        <Card.Content>
          <TextInput
            label="Post Title"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleError) {
                const errors = validatePost({ title: text, content });
                setTitleError(errors.find(e => e.includes('Title')) || '');
              }
            }}
            onBlur={() => {
              const errors = validatePost({ title, content });
              setTitleError(errors.find(e => e.includes('Title')) || '');
            }}
            style={styles.input}
            error={!!titleError}
            maxLength={100}
          />
          {titleError ? <HelperText type="error">{titleError}</HelperText> : null}
          
          <TextInput
            label="What's on your mind?"
            value={content}
            onChangeText={(text) => {
              setContent(text);
              if (contentError) {
                const errors = validatePost({ title, content: text });
                setContentError(errors.find(e => e.includes('Content')) || '');
              }
            }}
            onBlur={() => {
              const errors = validatePost({ title, content });
              setContentError(errors.find(e => e.includes('Content')) || '');
            }}
            multiline
            numberOfLines={6}
            style={[styles.input, styles.contentInput]}
            error={!!contentError}
            maxLength={2000}
          />
          {contentError ? <HelperText type="error">{contentError}</HelperText> : null}
          
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>
              {content.length}/2000 characters
            </Text>
          </View>

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.selectedImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <Text style={styles.removeImageText}>Remove Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              mode="outlined"
              onPress={pickImage}
              style={styles.imageButton}
              icon="camera"
            >
              Add Small Image (Max 75KB)
            </Button>
          )}

          <Text style={styles.imageNote}>
            Note: Images are stored as compressed data. Keep images small for best performance.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !title.trim() || !content.trim()}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
            >
              Create Post
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
            >
              Cancel
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#6200ee',
  },
  formCard: {
    elevation: 2,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  contentInput: {
    minHeight: 120,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  characterCountText: {
    fontSize: 12,
    color: '#666',
  },
  imageContainer: {
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeImageButton: {
    alignSelf: 'center',
    padding: 8,
  },
  removeImageText: {
    color: '#ff5252',
    fontWeight: 'bold',
  },
  imageButton: {
    marginBottom: 8,
    borderColor: '#6200ee',
  },
  imageNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    marginBottom: 12,
    borderRadius: 8,
  },
  cancelButton: {
    borderRadius: 8,
    borderColor: '#6200ee',
  },
  buttonContent: {
    height: 48,
  },
});