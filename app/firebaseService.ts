// services/firebaseService.ts (Updated with index fix and new collections)
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../app/_layout';

// Types for our collections
export interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  content: string;
  imageData?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// NEW COLLECTIONS
export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creatorName: string;
  memberCount: number;
  isPrivate: boolean;
  imageData?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorName: string;
  groupId?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  maxParticipants?: number;
  currentParticipants: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  status: 'going' | 'maybe' | 'not_going';
  joinedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'group_invite' | 'event_invite' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string; // postId, groupId, eventId, etc.
  createdAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creatorName: string;
  postCount: number;
  followerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicFollower {
  id: string;
  topicId: string;
  userId: string;
  userName: string;
  followedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    groupInvites: boolean;
    eventInvites: boolean;
    systemUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showOnlineStatus: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoPlayVideos: boolean;
  };
  updatedAt: Date;
}

// Validation functions
export const validateUserProfile = (profile: Partial<UserProfile>): string[] => {
  const errors: string[] = [];
  
  if (!profile.displayName?.trim()) {
    errors.push('Display name is required');
  } else if (profile.displayName.length < 2) {
    errors.push('Display name must be at least 2 characters');
  } else if (profile.displayName.length > 50) {
    errors.push('Display name must be less than 50 characters');
  }
  
  if (profile.bio && profile.bio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }
  
  return errors;
};

export const validatePost = (post: Partial<Post>): string[] => {
  const errors: string[] = [];
  
  if (!post.title?.trim()) {
    errors.push('Title is required');
  } else if (post.title.length < 3) {
    errors.push('Title must be at least 3 characters');
  } else if (post.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }
  
  if (!post.content?.trim()) {
    errors.push('Content is required');
  } else if (post.content.length < 10) {
    errors.push('Content must be at least 10 characters');
  } else if (post.content.length > 2000) {
    errors.push('Content must be less than 2000 characters');
  }
  
  return errors;
};

export const validateComment = (comment: Partial<Comment>): string[] => {
  const errors: string[] = [];
  
  if (!comment.content?.trim()) {
    errors.push('Comment content is required');
  } else if (comment.content.length < 1) {
    errors.push('Comment must have content');
  } else if (comment.content.length > 500) {
    errors.push('Comment must be less than 500 characters');
  }
  
  return errors;
};

export const validateGroup = (group: Partial<Group>): string[] => {
  const errors: string[] = [];
  
  if (!group.name?.trim()) {
    errors.push('Group name is required');
  } else if (group.name.length < 3) {
    errors.push('Group name must be at least 3 characters');
  } else if (group.name.length > 50) {
    errors.push('Group name must be less than 50 characters');
  }
  
  if (!group.description?.trim()) {
    errors.push('Group description is required');
  } else if (group.description.length > 500) {
    errors.push('Group description must be less than 500 characters');
  }
  
  return errors;
};

export const validateEvent = (event: Partial<Event>): string[] => {
  const errors: string[] = [];
  
  if (!event.title?.trim()) {
    errors.push('Event title is required');
  } else if (event.title.length < 3) {
    errors.push('Event title must be at least 3 characters');
  } else if (event.title.length > 100) {
    errors.push('Event title must be less than 100 characters');
  }
  
  if (!event.description?.trim()) {
    errors.push('Event description is required');
  } else if (event.description.length > 1000) {
    errors.push('Event description must be less than 1000 characters');
  }
  
  if (event.startDate && event.endDate && event.startDate >= event.endDate) {
    errors.push('End date must be after start date');
  }
  
  return errors;
};

// Image processing functions (without Firebase Storage)
export const resizeImageToBase64 = async (uri: string, maxWidth: number = 300, quality: number = 0.7): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (base64.length > 100000) {
          reject(new Error('Image too large. Please choose a smaller image.'));
        } else {
          resolve(base64);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

export const generateAvatarPlaceholder = (name: string): string => {
  const colors = ['#6200ee', '#03dac6', '#ff5722', '#4caf50', '#ff9800', '#e91e63'];
  const initials = name.substring(0, 2).toUpperCase();
  const colorIndex = name.length % colors.length;
  const color = colors[colorIndex];
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
      <text x="50" y="60" font-family="Arial" font-size="30" fill="white" text-anchor="middle">${initials}</text>
    </svg>
  `)}`;
};

// User Profile CRUD operations
export const createUserProfile = async (profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const errors = validateUserProfile(profileData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const profilePicture = profileData.profilePicture || generateAvatarPlaceholder(profileData.displayName);

    const docRef = await addDoc(collection(db, 'userProfiles'), {
      ...profileData,
      profilePicture,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, 'userProfiles'), where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
      bio: data.bio,
      profilePicture: data.profilePicture,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const errors = validateUserProfile(updates);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const docRef = doc(db, 'userProfiles', profileId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Posts CRUD operations
export const createPost = async (postData: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const errors = validatePost(postData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const documentData: any = {
      userId: postData.userId,
      userName: postData.userName,
      title: postData.title,
      content: postData.content,
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (postData.userAvatar !== undefined) {
      documentData.userAvatar = postData.userAvatar;
    }

    if (postData.imageData !== undefined) {
      documentData.imageData = postData.imageData;
    }

    const docRef = await addDoc(collection(db, 'posts'), documentData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const getPosts = async (limitCount: number = 20): Promise<Post[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        title: data.title,
        content: data.content,
        imageData: data.imageData,
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return posts;
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
};

export const getPost = async (postId: string): Promise<Post | null> => {
  try {
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        title: data.title,
        content: data.content,
        imageData: data.imageData,
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
};

export const updatePost = async (postId: string, updates: Partial<Post>): Promise<void> => {
  try {
    const errors = validatePost(updates);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    const likesQuery = query(collection(db, 'likes'), where('postId', '==', postId));
    const likesSnapshot = await getDocs(likesQuery);
    
    const deleteLikesPromises = likesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteLikesPromises);
    
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Comments CRUD operations (FIXED - No composite index needed)
export const createComment = async (commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const errors = validateComment(commentData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const documentData: any = {
      postId: commentData.postId,
      userId: commentData.userId,
      userName: commentData.userName,
      content: commentData.content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (commentData.userAvatar !== undefined) {
      documentData.userAvatar = commentData.userAvatar;
    }

    const docRef = await addDoc(collection(db, 'comments'), documentData);
    
    const postRef = doc(db, 'posts', commentData.postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
      const currentCount = postDoc.data().commentsCount || 0;
      await updateDoc(postRef, { commentsCount: currentCount + 1 });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

export const getComments = async (postId: string): Promise<Comment[]> => {
  try {
    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        postId: data.postId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        content: data.content,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    // Sort in JavaScript instead of Firestore
    comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

export const deleteComment = async (commentId: string, postId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
    
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
      const currentCount = postDoc.data().commentsCount || 0;
      await updateDoc(postRef, { commentsCount: Math.max(0, currentCount - 1) });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// Likes CRUD operations
export const toggleLike = async (postId: string, userId: string, userName: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'likes'),
      where('postId', '==', postId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, 'likes'), {
        postId,
        userId,
        userName,
        createdAt: serverTimestamp()
      });
      
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentCount = postDoc.data().likesCount || 0;
        await updateDoc(postRef, { likesCount: currentCount + 1 });
      }
      
      return true;
    } else {
      const likeDoc = querySnapshot.docs[0];
      await deleteDoc(likeDoc.ref);
      
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentCount = postDoc.data().likesCount || 0;
        await updateDoc(postRef, { likesCount: Math.max(0, currentCount - 1) });
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const getUserLikes = async (userId: string): Promise<string[]> => {
  try {
    const q = query(collection(db, 'likes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const likedPostIds: string[] = [];
    querySnapshot.forEach((doc) => {
      likedPostIds.push(doc.data().postId);
    });
    
    return likedPostIds;
  } catch (error) {
    console.error('Error getting user likes:', error);
    throw error;
  }
};

// Groups CRUD operations
export const createGroup = async (groupData: Omit<Group, 'id' | 'memberCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const errors = validateGroup(groupData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const documentData: any = {
      name: groupData.name,
      description: groupData.description,
      createdBy: groupData.createdBy,
      creatorName: groupData.creatorName,
      memberCount: 1,
      isPrivate: groupData.isPrivate || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (groupData.imageData !== undefined) {
      documentData.imageData = groupData.imageData;
    }

    const docRef = await addDoc(collection(db, 'groups'), documentData);
    
    // Add creator as admin member
    await addDoc(collection(db, 'groupMembers'), {
      groupId: docRef.id,
      userId: groupData.createdBy,
      userName: groupData.creatorName,
      role: 'admin',
      joinedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const getGroups = async (limitCount: number = 20): Promise<Group[]> => {
  try {
    const q = query(
      collection(db, 'groups'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        creatorName: data.creatorName,
        memberCount: data.memberCount || 0,
        isPrivate: data.isPrivate || false,
        imageData: data.imageData,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return groups;
  } catch (error) {
    console.error('Error getting groups:', error);
    throw error;
  }
};

export const joinGroup = async (groupId: string, userId: string, userName: string): Promise<void> => {
  try {
    // Check if already a member
    const memberQuery = query(
      collection(db, 'groupMembers'),
      where('groupId', '==', groupId),
      where('userId', '==', userId)
    );
    const memberSnapshot = await getDocs(memberQuery);
    
    if (!memberSnapshot.empty) {
      throw new Error('Already a member of this group');
    }

    // Add as member
    await addDoc(collection(db, 'groupMembers'), {
      groupId,
      userId,
      userName,
      role: 'member',
      joinedAt: serverTimestamp()
    });

    // Update member count
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (groupDoc.exists()) {
      const currentCount = groupDoc.data().memberCount || 0;
      await updateDoc(groupRef, { memberCount: currentCount + 1 });
    }
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
};

// Events CRUD operations
export const createEvent = async (eventData: Omit<Event, 'id' | 'currentParticipants' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const errors = validateEvent(eventData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const documentData: any = {
      title: eventData.title,
      description: eventData.description,
      createdBy: eventData.createdBy,
      creatorName: eventData.creatorName,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      currentParticipants: 1,
      isPublic: eventData.isPublic || true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (eventData.groupId !== undefined) {
      documentData.groupId = eventData.groupId;
    }
    if (eventData.location !== undefined) {
      documentData.location = eventData.location;
    }
    if (eventData.maxParticipants !== undefined) {
      documentData.maxParticipants = eventData.maxParticipants;
    }

    const docRef = await addDoc(collection(db, 'events'), documentData);
    
    // Add creator as participant
    await addDoc(collection(db, 'eventParticipants'), {
      eventId: docRef.id,
      userId: eventData.createdBy,
      userName: eventData.creatorName,
      status: 'going',
      joinedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const getEvents = async (limitCount: number = 20): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, 'events'),
      orderBy('startDate', 'asc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const events: Event[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        createdBy: data.createdBy,
        creatorName: data.creatorName,
        groupId: data.groupId,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        location: data.location,
        maxParticipants: data.maxParticipants,
        currentParticipants: data.currentParticipants || 0,
        isPublic: data.isPublic || true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting events:', error);
    throw error;
  }
};

// Notifications CRUD operations
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId: string, limitCount: number = 50): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.isRead || false,
        relatedId: data.relatedId,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    // Sort by date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Topics CRUD operations
export const createTopic = async (topicData: Omit<Topic, 'id' | 'postCount' | 'followerCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'topics'), {
      ...topicData,
      postCount: 0,
      followerCount: 1,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Add creator as follower
    await addDoc(collection(db, 'topicFollowers'), {
      topicId: docRef.id,
      userId: topicData.createdBy,
      userName: topicData.creatorName,
      followedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating topic:', error);
    throw error;
  }
};

export const getTopics = async (limitCount: number = 20): Promise<Topic[]> => {
  try {
    const q = query(
      collection(db, 'topics'),
      where('isActive', '==', true),
      orderBy('followerCount', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const topics: Topic[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      topics.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        creatorName: data.creatorName,
        postCount: data.postCount || 0,
        followerCount: data.followerCount || 0,
        isActive: data.isActive || true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return topics;
  } catch (error) {
    console.error('Error getting topics:', error);
    throw error;
  }
};

// Settings CRUD operations
export const createUserSettings = async (userId: string): Promise<string> => {
  try {
    const defaultSettings = {
      userId,
      notifications: {
        likes: true,
        comments: true,
        follows: true,
        groupInvites: true,
        eventInvites: true,
        systemUpdates: true
      },
      privacy: {
        profileVisibility: 'public' as const,
        showEmail: false,
        showOnlineStatus: true
      },
      preferences: {
        theme: 'system' as const,
        language: 'en',
        autoPlayVideos: true
      },
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'userSettings'), defaultSettings);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user settings:', error);
    throw error;
  }
};

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const q = query(collection(db, 'userSettings'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      userId: data.userId,
      notifications: data.notifications,
      privacy: data.privacy,
      preferences: data.preferences,
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
};

export const updateUserSettings = async (settingsId: string, updates: Partial<UserSettings>): Promise<void> => {
  try {
    const docRef = doc(db, 'userSettings', settingsId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// Real-time listeners (FIXED - No composite index needed)
export const subscribeToComments = (postId: string, callback: (comments: Comment[]) => void) => {
  // Simple query without orderBy to avoid index requirement
  const q = query(
    collection(db, 'comments'),
    where('postId', '==', postId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const comments: Comment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        postId: data.postId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        content: data.content,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    // Sort in JavaScript instead of Firestore
    comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    callback(comments);
  });
};

export const subscribeToPosts = (callback: (posts: Post[]) => void) => {
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        title: data.title,
        content: data.content,
        imageData: data.imageData,
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    callback(posts);
  });
};

export const subscribeToUserNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(50)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.isRead || false,
        relatedId: data.relatedId,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    // Sort by date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(notifications);
  });
};