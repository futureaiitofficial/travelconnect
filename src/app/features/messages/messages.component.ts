import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MessageService, Conversation, Message, MessageUser } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messagesArea') messagesArea?: ElementRef;
  @ViewChild('messageInput') messageInput?: ElementRef;

  // Services
  messageService = inject(MessageService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  // State
  readonly conversations = computed(() => this.messageService.allConversations());
  readonly activeConversation = computed(() => this.messageService.activeConversation());
  readonly messages = signal<Message[]>([]);
  readonly loading = computed(() => this.messageService.isLoading());
  readonly error = computed(() => this.messageService.errorMessage());

  // UI State
  readonly newMessage = signal('');
  readonly searchQuery = signal('');
  readonly showSearch = signal(false);
  readonly showNewConversation = signal(false);
  readonly selectedUsers = signal<MessageUser[]>([]);
  readonly groupName = signal('');
  readonly isGroupChat = signal(false);

  // User search state
  readonly searchUsersQuery = signal('');
  readonly searchUsersResults = signal<MessageUser[]>([]);
  readonly searchingUsers = signal(false);

  // Pagination
  readonly currentPage = signal(1);
  readonly hasMoreMessages = signal(false);

  // Subscriptions
  private subscriptions = new Subscription();

  // Computed properties
  readonly currentUser = computed(() => this.authService.user());
  readonly filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.conversations();

    return this.conversations().filter(conversation => {
      const displayName = this.messageService.getConversationDisplayName(conversation, this.currentUser()?._id || '');
      return displayName.toLowerCase().includes(query);
    });
  });

  readonly activeConversationDisplayName = computed(() => {
    const conversation = this.activeConversation();
    if (!conversation) return '';
    return this.messageService.getConversationDisplayName(conversation, this.currentUser()?._id || '');
  });

  readonly activeConversationAvatar = computed(() => {
    const conversation = this.activeConversation();
    if (!conversation) return this.getDefaultAvatar();
    return this.messageService.getConversationAvatar(conversation, this.currentUser()?._id || '');
  });

  ngOnInit(): void {
    this.loadConversations();
    this.setupRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load user conversations
   */
  loadConversations(): void {
    this.messageService.getConversations().subscribe({
      error: (error) => console.error('Error loading conversations:', error)
    });
  }

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates(): void {
    // Subscribe to new messages
    this.subscriptions.add(
      this.messageService.getNewMessageObservable().subscribe(message => {
        if (message) {
          this.addMessageToConversation(message);
        }
      })
    );

    // Subscribe to message read updates
    this.subscriptions.add(
      this.messageService.getMessageReadObservable().subscribe(update => {
        if (update) {
          // Update message read status
          this.messages.update(messages =>
            messages.map(msg =>
              msg._id === update.messageId
                ? { ...msg, read: true }
                : msg
            )
          );
        }
      })
    );
  }

  /**
   * Add message to current conversation
   */
  addMessageToConversation(message: Message): void {
    const currentConversation = this.activeConversation();
    if (currentConversation && message.conversationId === currentConversation._id) {
      this.messages.update(prev => [...prev, message]);
      this.scrollToBottom();
    }
  }

  /**
   * Select conversation
   */
  selectConversation(conversation: Conversation): void {
    this.messageService.setCurrentConversation(conversation);
    this.loadConversationMessages(conversation._id);
    this.scrollToBottom();
  }

  /**
   * Load conversation messages
   */
  loadConversationMessages(conversationId: string, page: number = 1): void {
    this.currentPage.set(page);
    this.messageService.getConversationMessages(conversationId, page).subscribe({
      next: (response) => {
        if (response.success) {
          if (page === 1) {
            this.messages.set(response.data.messages);
          } else {
            this.messages.update(prev => [...response.data.messages, ...prev]);
          }
          this.hasMoreMessages.set(response.data.pagination?.hasMore || false);
        }
      },
      error: (error) => console.error('Error loading messages:', error)
    });
  }

  /**
   * Load more messages
   */
  loadMoreMessages(): void {
    const conversation = this.activeConversation();
    if (conversation && this.hasMoreMessages()) {
      this.loadConversationMessages(conversation._id, this.currentPage() + 1);
    }
  }

  /**
   * Send message
   */
  sendMessage(): void {
    const messageText = this.newMessage().trim();
    if (!messageText) return;

    const conversation = this.activeConversation();
    if (!conversation) return;

    this.messageService.sendMessage(conversation._id, messageText).subscribe({
      next: (response) => {
        if (response.success) {
          this.newMessage.set('');
          this.addMessageToConversation(response.data);
        }
      },
      error: (error) => console.error('Error sending message:', error)
    });
  }

  /**
   * Handle message input
   */
  onMessageInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.newMessage.set(target.value);
  }

  /**
   * Handle message key press
   */
  onMessageKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(message: Message): void {
    if (!message.read && !this.isCurrentUserMessage(message)) {
      this.messageService.markMessageAsRead(message._id).subscribe({
        error: (error) => console.error('Error marking message as read:', error)
      });
    }
  }

  /**
   * Delete message
   */
  deleteMessage(message: Message): void {
    if (confirm('Are you sure you want to delete this message?')) {
      this.messageService.deleteMessage(message._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.messages.update(prev => prev.filter(m => m._id !== message._id));
          }
        },
        error: (error) => console.error('Error deleting message:', error)
      });
    }
  }

  /**
   * Add reaction to message
   */
  addReaction(message: Message, emoji: string): void {
    this.messageService.addReaction(message._id, emoji).subscribe({
      next: (response) => {
        if (response.success) {
          // Update message with new reaction
          this.messages.update(messages =>
            messages.map(msg =>
              msg._id === message._id
                ? { ...msg, reactions: response.data.reactions }
                : msg
            )
          );
        }
      },
      error: (error) => console.error('Error adding reaction:', error)
    });
  }

  /**
   * Remove reaction from message
   */
  removeReaction(message: Message): void {
    this.messageService.removeReaction(message._id).subscribe({
      next: (response) => {
        if (response.success) {
          // Update message with removed reaction
          this.messages.update(messages =>
            messages.map(msg =>
              msg._id === message._id
                ? { ...msg, reactions: response.data.reactions }
                : msg
            )
          );
        }
      },
      error: (error) => console.error('Error removing reaction:', error)
    });
  }

  /**
   * Check if message is from current user
   */
  isCurrentUserMessage(message: Message): boolean {
    return message.senderId._id === this.currentUser()?._id;
  }

  /**
   * Get formatted message time
   */
  getMessageTime(message: Message): string {
    const date = new Date(message.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get formatted conversation time
   */
  getConversationTime(conversation: Conversation): string {
    if (!conversation.lastMessageAt) return '';

    const date = new Date(conversation.lastMessageAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Toggle search
   */
  toggleSearch(): void {
    this.showSearch.update(prev => !prev);
    if (!this.showSearch()) {
      this.searchQuery.set('');
    }
  }

  /**
   * Toggle new conversation modal
   */
  toggleNewConversation(): void {
    this.showNewConversation.update(prev => !prev);
    if (!this.showNewConversation()) {
      this.resetNewConversation();
    }
  }

  /**
   * Reset new conversation form
   */
  resetNewConversation(): void {
    this.selectedUsers.set([]);
    this.groupName.set('');
    this.isGroupChat.set(false);
    this.searchUsersQuery.set('');
    this.searchUsersResults.set([]);
  }

  /**
   * Toggle group chat mode
   */
  toggleGroupChat(): void {
    this.isGroupChat.update(prev => !prev);
    this.selectedUsers.set([]);
    this.groupName.set('');
  }

  /**
   * Search users
   */
  searchUsers(): void {
    const query = this.searchUsersQuery().trim();
    if (!query || query.length < 2) {
      this.searchUsersResults.set([]);
      return;
    }

    this.searchingUsers.set(true);
    this.profileService.searchUsers(query).subscribe({
      next: (response) => {
                 if (response.success) {
           // Filter out current user and already selected users
           const currentUserId = this.currentUser()?._id;
           const selectedUserIds = this.selectedUsers().map(u => u._id);

           const filteredUsers = response.data.users.filter((user: any) =>
             user._id !== currentUserId &&
             !selectedUserIds.includes(user._id)
           );

           this.searchUsersResults.set(filteredUsers);
         }
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.searchUsersResults.set([]);
      },
      complete: () => {
        this.searchingUsers.set(false);
      }
    });
  }

  /**
   * Add user to selected users
   */
  addSelectedUser(user: MessageUser): void {
    const exists = this.selectedUsers().find(u => u._id === user._id);
    if (!exists) {
      this.selectedUsers.update(prev => [...prev, user]);
      // Clear search results after selection
      this.searchUsersResults.set([]);
      this.searchUsersQuery.set('');
    }
  }

  /**
   * Remove user from selected users
   */
  removeSelectedUser(userId: string): void {
    this.selectedUsers.update(prev => prev.filter(u => u._id !== userId));
  }

  /**
   * Create new conversation
   */
  createNewConversation(): void {
    if (this.isGroupChat()) {
      // Create group conversation
      if (!this.groupName() || this.selectedUsers().length < 2) {
        alert('Please provide a group name and select at least 2 members');
        return;
      }

      const memberIds = this.selectedUsers().map(u => u._id);
      this.messageService.createGroupConversation(this.groupName(), memberIds).subscribe({
        next: (response) => {
          if (response.success) {
            this.toggleNewConversation();
            this.selectConversation(response.data[0]);
          }
        },
        error: (error) => {
          console.error('Error creating group conversation:', error);
        }
      });
    } else {
      // Create direct conversation
      if (this.selectedUsers().length !== 1) {
        alert('Please select exactly one user for direct conversation');
        return;
      }

      const userId = this.selectedUsers()[0]._id;
      this.messageService.createOrGetConversation(userId).subscribe({
        next: (response) => {
          if (response.success) {
            this.toggleNewConversation();
            this.selectConversation(response.data[0]);
          }
        },
        error: (error) => {
          console.error('Error creating conversation:', error);
        }
      });
    }
  }

  /**
   * Navigate to user profile
   */
  goToUserProfile(userId: string): void {
    this.router.navigate(['/user', userId]);
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(user: MessageUser): string {
    return user.profilePicture || this.getDefaultAvatar();
  }

  /**
   * Get default avatar
   */
  private getDefaultAvatar(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTI4IDI4QzI4IDI0LjY4NjMgMjQuNDE4MyAyMiAyMCAyMkMxNS41ODE3IDIyIDEyIDI0LjY4NjMgMTIgMjhIMjhaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
  }
}
