// app/posts.tsx (Updated for base64 images)
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Text, 
  Alert, 
  RefreshControl,
  TouchableOpacity,
  Image
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Avatar, 
  IconButton, 
  Button,
  FAB,
  Chip
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { 
  Post, 
  getPosts, 
  deletePost, 
  toggleLike, 
  getUserLikes,
  subscribeToPosts 
} from '../app/firebaseService';

export default function PostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    loadPosts();
    loadUserLikes();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPosts((updatedPosts) => {
      setPosts(updatedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loadPosts = async () => {
    try {
      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    if (!user) return;
    
    try {
      const likes = await getUserLikes(user.uid);
      setUserLikes(likes);
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    await loadUserLikes();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const isLiked = await toggleLike(postId, user.uid, user.displayName || 'Anonymous');
      
      if (isLiked) {
        setUserLikes([...userLikes, postId]);
      } else {
        setUserLikes(userLikes.filter(id => id !== postId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
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

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = userLikes.includes(item.id);
    const isOwner = user?.uid === item.userId;

    return (
      <Card style={styles.postCard}>
        <Card.Content>
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={item.userName.substring(0, 2).toUpperCase()}
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.userName}</Text>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
            {isOwner && (
              <IconButton
                icon="delete"
                size={20}
                onPress={() => handleDeletePost(item.id)}
              />
            )}
          </View>

          <Title style={styles.postTitle}>{item.title}</Title>
          <Paragraph style={styles.postContent}>{item.content}</Paragraph>

          {item.imageData && (
            <Image source={{ uri: item.imageData }} style={styles.postImage} />
          )}

          <View style={styles.postActions}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item.id)}
              >
                <IconButton
                  icon={isLiked ? "heart" : "heart-outline"}
                  iconColor={isLiked ? "#ff5252" : "#666"}
                  size={20}
                />
                <Text style={styles.actionText}>{item.likesCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/post-details?postId=${item.id}`)}
              >
                <IconButton icon="comment-outline" iconColor="#666" size={20} />
                <Text style={styles.actionText}>{item.commentsCount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => router.push('/create-post')}
      />
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
  },
  postsList: {
    padding: 16,
  },
  postCard: {
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});