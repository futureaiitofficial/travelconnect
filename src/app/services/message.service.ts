import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface MessageUser {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface MessageReaction {
  user: MessageUser;
  emoji: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: MessageUser;
  receiverId?: MessageUser;
  messageText: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'location';
  mediaUrl?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  read: boolean;
  readBy: Array<{
    user: MessageUser;
    readAt: string;
  }>;
  isDelivered: boolean;
  replyTo?: {
    _id: string;
    messageText: string;
    senderId: MessageUser;
  };
  reactions: MessageReaction[];
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  members: MessageUser[];
  isGroup: boolean;
  groupName?: string;
  groupAdmin?: MessageUser;
  lastMessageAt: string;
  lastMessage?: string;
  lastMessageBy?: MessageUser;
  isActive: boolean;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  success: boolean;
  data: Conversation[];
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface MessageResponse {
  success: boolean;
  data: Message;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    conversation: Conversation;
    messages: Message[];
    pagination?: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly API_URL = `${environment.backendUrl}/api/messages`;

  // Reactive state
  private conversations = signal<Conversation[]>([]);
  private currentConversation = signal<Conversation | null>(null);
  private messages = signal<Message[]>([]);
  private loading = signal<boolean>(false);
  private error = signal<string>('');

  // Public computed signals
  readonly allConversations = computed(() => this.conversations());
  readonly activeConversation = computed(() => this.currentConversation());
  readonly conversationMessages = computed(() => this.messages());
  readonly isLoading = computed(() => this.loading());
  readonly errorMessage = computed(() => this.error());

  // Behavior subjects for real-time updates
  private newMessageSubject = new BehaviorSubject<Message | null>(null);
  private messageReadSubject = new BehaviorSubject<{ messageId: string; readBy: string } | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get user's conversations
   */
  getConversations(page: number = 1, limit: number = 20): Observable<ConversationResponse> {
    this.loading.set(true);
    this.error.set('');

    return this.http.get<ConversationResponse>(`${this.API_URL}/conversations?page=${page}&limit=${limit}`).pipe(
      tap(response => {
        if (response.success) {
          if (page === 1) {
            this.conversations.set(response.data);
          } else {
            this.conversations.update(prev => [...prev, ...response.data]);
          }
        }
        this.loading.set(false);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create or get direct conversation
   */
  createOrGetConversation(userId: string): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.API_URL}/conversations`, {
      userId,
      isGroup: false
    }).pipe(
      tap(response => {
        if (response.success) {
          // Add to conversations if not already present
          this.conversations.update(prev => {
            const exists = prev.find(c => c._id === response.data[0]._id);
            if (!exists) {
              return [response.data[0], ...prev];
            }
            return prev;
          });
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create group conversation
   */
  createGroupConversation(groupName: string, memberIds: string[]): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.API_URL}/conversations`, {
      isGroup: true,
      groupName,
      memberIds
    }).pipe(
      tap(response => {
        if (response.success) {
          this.conversations.update(prev => [response.data[0], ...prev]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get conversation messages
   */
  getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Observable<MessagesResponse> {
    this.loading.set(true);
    this.error.set('');

    return this.http.get<MessagesResponse>(`${this.API_URL}/conversations/${conversationId}?page=${page}&limit=${limit}`).pipe(
      tap(response => {
        if (response.success) {
          this.currentConversation.set(response.data.conversation);

          if (page === 1) {
            this.messages.set(response.data.messages);
          } else {
            this.messages.update(prev => [...response.data.messages, ...prev]);
          }
        }
        this.loading.set(false);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Send message
   */
  sendMessage(conversationId: string, messageText: string, messageType: 'text' | 'image' | 'video' | 'file' | 'location' = 'text', mediaUrl?: string, replyTo?: string): Observable<MessageResponse> {
    const messageData: any = {
      messageText,
      messageType
    };

    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
    }

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    return this.http.post<MessageResponse>(`${this.API_URL}/conversations/${conversationId}/messages`, messageData).pipe(
      tap(response => {
        if (response.success) {
          // Add message to current conversation
          this.messages.update(prev => [...prev, response.data]);

          // Update conversation's last message
          this.updateConversationLastMessage(conversationId, messageText);

          // Emit new message for real-time updates
          this.newMessageSubject.next(response.data);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.API_URL}/messages/${messageId}/read`, {}).pipe(
      tap(response => {
        if (response.success) {
          // Update message in current conversation
          this.messages.update(prev =>
            prev.map(msg =>
              msg._id === messageId
                ? { ...msg, read: true, readBy: response.data.readBy }
                : msg
            )
          );

          // Emit message read event
          this.messageReadSubject.next({
            messageId,
            readBy: response.data.readBy[response.data.readBy.length - 1]?.user._id || ''
          });
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete message
   */
  deleteMessage(messageId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/messages/${messageId}`).pipe(
      tap(response => {
        if (response.success) {
          // Remove message from current conversation
          this.messages.update(prev => prev.filter(msg => msg._id !== messageId));
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Add reaction to message
   */
  addReaction(messageId: string, emoji: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API_URL}/messages/${messageId}/reactions`, { emoji }).pipe(
      tap(response => {
        if (response.success) {
          // Update message in current conversation
          this.messages.update(prev =>
            prev.map(msg =>
              msg._id === messageId
                ? { ...msg, reactions: response.data.reactions }
                : msg
            )
          );
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Remove reaction from message
   */
  removeReaction(messageId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.API_URL}/messages/${messageId}/reactions`).pipe(
      tap(response => {
        if (response.success) {
          // Update message in current conversation
          this.messages.update(prev =>
            prev.map(msg =>
              msg._id === messageId
                ? { ...msg, reactions: response.data.reactions }
                : msg
            )
          );
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get unread message count
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.API_URL}/unread-count`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): Observable<ConversationResponse> {
    return this.http.get<ConversationResponse>(`${this.API_URL}/search?q=${encodeURIComponent(query)}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Set current conversation
   */
  setCurrentConversation(conversation: Conversation | null): void {
    this.currentConversation.set(conversation);
    if (!conversation) {
      this.messages.set([]);
    }
  }

  /**
   * Add message to current conversation (for real-time updates)
   */
  addMessageToConversation(message: Message): void {
    this.messages.update(prev => [...prev, message]);
    this.updateConversationLastMessage(message.conversationId, message.messageText);
  }

  /**
   * Update conversation's last message
   */
  private updateConversationLastMessage(conversationId: string, messageText: string): void {
    this.conversations.update(prev =>
      prev.map(conv =>
        conv._id === conversationId
          ? {
              ...conv,
              lastMessage: messageText.length > 200 ? messageText.substring(0, 197) + '...' : messageText,
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0
            }
          : conv
      )
    );
  }

  /**
   * Get new message observable
   */
  getNewMessageObservable(): Observable<Message | null> {
    return this.newMessageSubject.asObservable();
  }

  /**
   * Get message read observable
   */
  getMessageReadObservable(): Observable<{ messageId: string; readBy: string } | null> {
    return this.messageReadSubject.asObservable();
  }

  /**
   * Clear current conversation
   */
  clearCurrentConversation(): void {
    this.currentConversation.set(null);
    this.messages.set([]);
  }

  /**
   * Get other user in direct conversation
   */
  getOtherUser(conversation: Conversation, currentUserId: string): MessageUser | null {
    if (conversation.isGroup) {
      return null;
    }

    return conversation.members.find(member => member._id !== currentUserId) || null;
  }

  /**
   * Get conversation display name
   */
  getConversationDisplayName(conversation: Conversation, currentUserId: string): string {
    if (conversation.isGroup) {
      return conversation.groupName || 'Group Chat';
    }

    const otherUser = this.getOtherUser(conversation, currentUserId);
    return otherUser ? otherUser.fullName || otherUser.username : 'Unknown User';
  }

  /**
   * Get conversation avatar
   */
  getConversationAvatar(conversation: Conversation, currentUserId: string): string {
    if (conversation.isGroup) {
      // For group chats, return first member's avatar or default
      return conversation.members[0]?.profilePicture || this.getDefaultAvatar();
    }

    const otherUser = this.getOtherUser(conversation, currentUserId);
    return otherUser?.profilePicture || this.getDefaultAvatar();
  }

  /**
   * Get default avatar
   */
  private getDefaultAvatar(): string {
    // Return base64 encoded SVG data URL for default avatar
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTI4IDI4QzI4IDI0LjY4NjMgMjQuNDE4MyAyMiAyMCAyMkMxNS41ODE3IDIyIDEyIDI0LjY4NjMgMTIgMjhIMjhaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error && error.error.errors) {
        // Validation errors
        errorMessage = error.error.errors.map((err: any) => err.msg).join(', ');
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('MessageService Error:', error);
    this.error.set(errorMessage);
    this.loading.set(false);

    return new Observable(observer => {
      observer.error(new Error(errorMessage));
    });
  };
}
