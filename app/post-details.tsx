// app/post-details.tsx (Fixed)
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Alert,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Avatar,
  IconButton,
  TextInput,
  Button,
  Divider
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  Post,
  Comment,
  getPost, // Make sure this function exists
  getComments,
  createComment,
  deleteComment,
  toggleLike,
  getUserLikes,
  subscribeToComments,
  validateComment
} from '../app/firebaseService';

export default function PostDetailsScreen() {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [commentError, setCommentError] = useState('');

  const router = useRouter();
  const { user } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Post not found', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    loadPostDetails();
    loadUserLikes();

    // Subscribe to real-time comments
    const unsubscribe = subscribeToComments(postId, (updatedComments) => {
      setComments(updatedComments);
    });

    return () => unsubscribe();
  }, [user, postId]);

  const loadPostDetails = async () => {
    if (!postId) return;

    try {
      // Fixed: Use getPost instead of getPosts
      const postData = await getPost(postId);
      if (postData) {
        setPost(postData);
      } else {
        Alert.alert('Error', 'Post not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    if (!user || !postId) return;

    try {
      const likes = await getUserLikes(user.uid);
      setIsLiked(likes.includes(postId));
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !postId || !post) return;

    try {
      const liked = await toggleLike(postId, user.uid, user.displayName || 'Anonymous');
      setIsLiked(liked);
      
      // Update local post state
      setPost({
        ...post,
        likesCount: liked ? post.likesCount + 1 : post.likesCount - 1
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const validateCommentForm = () => {
    const errors = validateComment({ content: newComment });
    if (errors.length > 0) {
      setCommentError(errors[0]);
      return false;
    }
    setCommentError('');
    return true;
  };

  const handleSubmitComment = async () => {
    if (!validateCommentForm() || !user || !postId || !post) return;

    try {
      setSubmittingComment(true);
      
      await createComment({
        postId: postId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || undefined,
        content: newComment.trim()
      });

      setNewComment('');
      
      // Update local post state
      setPost({
        ...post,
        commentsCount: post.commentsCount + 1
      });
    } catch (error: any) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!postId || !post) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId, postId);
              
              // Update local post state
              setPost({
                ...post,
                commentsCount: Math.max(0, post.commentsCount - 1)
              });
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderComment = (comment: Comment) => {
    const isOwner = user?.uid === comment.userId;

    return (
      <View key={comment.id} style={styles.commentContainer}>
        <Avatar.Text
          size={32}
          label={comment.userName.substring(0, 2).toUpperCase()}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUserName}>{comment.userName}</Text>
            <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
            {isOwner && (
              <IconButton
                icon="delete"
                size={16}
                onPress={() => handleDeleteComment(comment.id)}
                style={styles.deleteCommentButton}
              />
            )}
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Content */}
        <Card style={styles.postCard}>
          <Card.Content>
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <Avatar.Text
                  size={40}
                  label={post.userName.substring(0, 2).toUpperCase()}
                  style={styles.avatar}
                />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <Text style={styles.timeText}>{formatTime(post.createdAt)}</Text>
                </View>
              </View>
            </View>

            <Title style={styles.postTitle}>{post.title}</Title>
            <Paragraph style={styles.postContent}>{post.content}</Paragraph>

            {post.imageData && (
              <Image source={{ uri: post.imageData }} style={styles.postImage} />
            )}

            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
              >
                <IconButton
                  icon={isLiked ? "heart" : "heart-outline"}
                  iconColor={isLiked ? "#ff5252" : "#666"}
                  size={24}
                />
                <Text style={styles.actionText}>{post.likesCount} likes</Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <IconButton icon="comment-outline" iconColor="#666" size={24} />
                <Text style={styles.actionText}>{post.commentsCount} comments</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {comments.length === 0 ? (
            <View style={styles.noCommentsContainer}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            comments.map(renderComment)
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          label="Add a comment..."
          value={newComment}
          onChangeText={(text) => {
            setNewComment(text);
            if (commentError) {
              const errors = validateComment({ content: text });
              setCommentError(errors.length > 0 ? errors[0] : '');
            }
          }}
          onBlur={() => {
            const errors = validateComment({ content: newComment });
            setCommentError(errors.length > 0 ? errors[0] : '');
          }}
          multiline
          style={styles.commentInput}
          error={!!commentError}
          maxLength={500}
        />
        {commentError ? (
          <Text style={styles.errorText}>{commentError}</Text>
        ) : null}
        
        <Button
          mode="contained"
          onPress={handleSubmitComment}
          loading={submittingComment}
          disabled={submittingComment || !newComment.trim()}
          style={styles.submitButton}
          icon="send"
        >
          Comment
        </Button>
      </View>
    </KeyboardAvoidingView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff5252',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  postCard: {
    margin: 16,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6200ee',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 8,
  },
  commentAvatar: {
    backgroundColor: '#6200ee',
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  commentTime: {
    color: '#666',
    fontSize: 12,
    flex: 1,
  },
  deleteCommentButton: {
    margin: 0,
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#333',
  },
  commentInputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  submitButton: {
    borderRadius: 8,
  },
});