import { Component } from '@angular/core';

/**
 * Feed Component - Displays the main social feed
 * This component shows posts from users the current user follows
 * Features infinite scroll, like/unlike, comments, and sharing
 */
@Component({
  selector: 'app-feed',
  template: `
    <!-- Full-width header -->
    <header class="app-header">
      <div class="header-container">
        <div class="header-left">
          <h1 class="app-title">Travel<span class="accent">Connect</span></h1>
        </div>
        <div class="header-center">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search destinations, people, or hashtags...">
          </div>
        </div>
        <div class="header-right">
          <button class="icon-btn notification-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="notification-badge">3</span>
          </button>
          <button class="icon-btn messages-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <div class="user-profile-menu">
            <img src="https://via.placeholder.com/40" alt="Your profile" class="user-avatar">
          </div>
        </div>
      </div>
    </header>

    <div class="main-content">
      <div class="feed-container">
        <div class="feed-header">
          <h2 class="feed-title">Discover<span class="accent">.</span></h2>
          <div class="feed-actions">
            <button class="filter-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filter
            </button>
            <button class="create-post-btn">
              <span class="btn-text">Share Story</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
        
        <!-- Stories section -->
        <div class="stories-container">
          <div class="story-item your-story">
            <div class="story-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span class="story-username">Add Story</span>
          </div>
          @for (user of featuredUsers; track user.id) {
            <div class="story-item" [class.active]="user.hasUnviewedStory">
              <div class="story-avatar">
                <img [src]="user.avatar" [alt]="user.name">
              </div>
              <span class="story-username">{{ user.name }}</span>
            </div>
          }
        </div>
        
        <div class="feed-content">
          <!-- Post creation card -->
          <div class="create-post-card">
            <div class="create-post-header">
              <img src="https://via.placeholder.com/40" alt="Your avatar" class="user-avatar">
              <div class="create-post-input-wrapper">
                <input 
                  type="text" 
                  placeholder="Share your travel experience..." 
                  class="create-post-input"
                >
              </div>
            </div>
            <div class="create-post-actions">
              <button class="post-action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                Photo
              </button>
              <button class="post-action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Location
              </button>
              <button class="post-action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Tag People
              </button>
            </div>
          </div>
          
          <!-- Sample posts -->
          <div class="posts-list">
            @for (post of samplePosts; track post.id) {
              <div class="post-card">
                <div class="post-header">
                  <div class="user-info">
                    <div class="user-avatar-container">
                      <img [src]="post.userAvatar" [alt]="post.userName + ' avatar'" class="user-avatar">
                    </div>
                    <div class="user-details">
                      <h3 class="user-name">{{ post.userName }}</h3>
                      <div class="post-meta">
                        <span class="post-location">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {{ post.location }}
                        </span>
                        <span class="post-time">{{ post.timeAgo }}</span>
                      </div>
                    </div>
                  </div>
                  <button class="post-menu-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                  </button>
                </div>
                
                @if (post.image) {
                  <div class="post-image-container">
                    <img [src]="post.image" [alt]="post.caption" loading="lazy" class="post-image">
                  </div>
                }
                
                <div class="post-content">
                  <div class="post-actions">
                    <div class="post-actions-primary">
                      <button class="action-btn like-btn" [class.liked]="post.isLiked">
                        <svg *ngIf="!post.isLiked" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <svg *ngIf="post.isLiked" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      </button>
                      <button class="action-btn comment-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      </button>
                      <button class="action-btn share-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    </div>
                    <button class="action-btn bookmark-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                  </div>
                  
                  <div class="post-engagement">
                    <span class="likes-count">{{ post.likesCount }} likes</span>
                  </div>
                  
                  <div class="post-caption-container">
                    <span class="caption-username">{{ post.userName }}</span>
                    <p class="post-caption">{{ post.caption }}</p>
                  </div>
                  
                  @if (post.commentsCount > 0) {
                    <button class="view-comments-btn">View all {{ post.commentsCount }} comments</button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- Sidebar for suggested content (will be visible on larger screens) -->
      <div class="sidebar">
        <div class="sidebar-section profile-summary">
          <div class="profile-summary-header">
            <img src="https://via.placeholder.com/50" alt="Your profile" class="profile-avatar">
            <div class="profile-info">
              <h3 class="profile-name">Your Name</h3>
              <p class="profile-handle">@yourhandle</p>
            </div>
          </div>
        </div>
        
        <div class="sidebar-section trending-topics">
          <h3 class="sidebar-title">Trending Destinations</h3>
          <ul class="trending-list">
            <li class="trending-item">
              <div class="trending-content">
                <span class="trending-name">#Bali</span>
                <span class="trending-count">24.5K posts</span>
              </div>
            </li>
            <li class="trending-item">
              <div class="trending-content">
                <span class="trending-name">#NewYorkCity</span>
                <span class="trending-count">18.3K posts</span>
              </div>
            </li>
            <li class="trending-item">
              <div class="trending-content">
                <span class="trending-name">#ParisInSpring</span>
                <span class="trending-count">12.7K posts</span>
              </div>
            </li>
            <li class="trending-item">
              <div class="trending-content">
                <span class="trending-name">#RoadTrip</span>
                <span class="trending-count">9.2K posts</span>
              </div>
            </li>
          </ul>
        </div>
        
        <div class="sidebar-section suggested-users">
          <h3 class="sidebar-title">People to Follow</h3>
          <ul class="suggested-list">
            @for (user of suggestedUsers; track user.id) {
              <li class="suggested-item">
                <div class="suggested-user-info">
                  <img [src]="user.avatar" [alt]="user.name + ' avatar'" class="suggested-avatar">
                  <div class="suggested-user-details">
                    <span class="suggested-name">{{ user.name }}</span>
                    <span class="suggested-bio">{{ user.bio }}</span>
                  </div>
                </div>
                <button class="follow-btn">Follow</button>
              </li>
            }
          </ul>
        </div>
      </div>
    </div>
    
    <!-- Full-width footer -->
    <footer class="app-footer">
      <div class="footer-container">
        <div class="footer-section footer-brand">
          <h2 class="footer-logo">Travel<span class="accent">Connect</span></h2>
          <p class="footer-tagline">Connect with travelers around the world.</p>
        </div>
        
        <div class="footer-section footer-links">
          <h4 class="footer-title">Quick Links</h4>
          <ul class="footer-menu">
            <li><a href="#">About Us</a></li>
            <li><a href="#">Explore</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>
        
        <div class="footer-section footer-links">
          <h4 class="footer-title">Resources</h4>
          <ul class="footer-menu">
            <li><a href="#">Travel Guides</a></li>
            <li><a href="#">Trip Planner</a></li>
            <li><a href="#">Safety Tips</a></li>
            <li><a href="#">Community Guidelines</a></li>
          </ul>
        </div>
        
        <div class="footer-section footer-social">
          <h4 class="footer-title">Follow Us</h4>
          <div class="social-icons">
            <a href="#" class="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="#" class="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" class="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
            </a>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p class="copyright">© 2025 TravelConnect. All rights reserved.</p>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      background-color: var(--surface-background, #f8f9fa);
      color: var(--text-primary, #0f172a);
    }
    
    /* Global styles */
    * {
      box-sizing: border-box;
    }
    
    /* Header styles */
    .app-header {
      position: sticky;
      top: 0;
      width: 100%;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 0.75rem 0;
      z-index: 100;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .header-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-left {
      display: flex;
      align-items: center;
    }
    
    .app-title {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    
    .header-center {
      flex: 1;
      max-width: 500px;
      margin: 0 2rem;
    }
    
    .search-bar {
      position: relative;
      width: 100%;
      background-color: #f1f5f9;
      border-radius: 1.5rem;
      padding: 0.5rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.2s ease;
    }
    
    .search-bar:focus-within {
      background-color: #e2e8f0;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }
    
    .search-bar svg {
      color: #64748b;
    }
    
    .search-bar input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);
    }
    
    .search-bar input::placeholder {
      color: #94a3b8;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .icon-btn {
      background: transparent;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #64748b;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s ease;
    }
    
    .icon-btn:hover {
      background-color: #f1f5f9;
      color: #334155;
    }
    
    .notification-badge {
      position: absolute;
      top: 0;
      right: 0;
      background: #ef4444;
      color: white;
      font-size: 0.65rem;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 600;
      border: 2px solid white;
    }
    
    .user-profile-menu {
      cursor: pointer;
    }
    
    .user-profile-menu .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e2e8f0;
      transition: border-color 0.2s ease;
    }
    
    .user-profile-menu:hover .user-avatar {
      border-color: #3b82f6;
    }
    
    /* Main content layout */
    .main-content {
      display: grid;
      grid-template-columns: 1fr;
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1rem;
      gap: 2rem;
    }
    
    @media (min-width: 1024px) {
      .main-content {
        grid-template-columns: 650px 1fr;
      }
    }
    
    /* Feed container */
    .feed-container {
      width: 100%;
    }
    
    /* Feed header */
    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .feed-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      letter-spacing: -0.5px;
      margin: 0;
    }
    
    .feed-title .accent {
      color: var(--accent-color, #3b82f6);
    }
    
    .feed-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    
    .filter-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background-color: transparent;
      border: 1px solid rgba(203, 213, 225, 0.5);
      color: var(--text-secondary, #64748b);
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .filter-btn:hover {
      background-color: var(--surface-hover, #f1f5f9);
      border-color: rgba(203, 213, 225, 0.8);
    }
    
    .create-post-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(37, 99, 235, 0.2);
      transition: all 0.3s ease;
    }
    
    .create-post-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    }
    
    .btn-text {
      font-weight: 600;
    }
    
    /* Stories Section */
    .stories-container {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding: 0.5rem 0 1.5rem;
      margin-bottom: 1.5rem;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .stories-container::-webkit-scrollbar {
      display: none;
    }
    
    .story-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    
    .story-avatar {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: white;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s ease;
    }
    
    .story-item.active .story-avatar::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #ec4899 50%, #f59e0b 100%);
      z-index: -1;
    }
    
    .your-story .story-avatar {
      background-color: #f1f5f9;
      color: #64748b;
    }
    
    .story-avatar img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid white;
    }
    
    .story-username {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
      max-width: 70px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }
    
    .story-item:hover .story-avatar {
      transform: scale(1.05);
    }
    
    /* Post Creation Card */
    .create-post-card {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 2px 20px rgba(0,0,0,0.05);
      margin-bottom: 1.5rem;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .create-post-card:hover {
      box-shadow: 0 4px 25px rgba(0,0,0,0.08);
    }
    
    .create-post-header {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .create-post-input-wrapper {
      flex: 1;
      background-color: #f1f5f9;
      border-radius: 1.5rem;
      padding: 0.25rem 0.25rem 0.25rem 1.25rem;
      transition: background-color 0.2s ease;
    }
    
    .create-post-input-wrapper:focus-within {
      background-color: #e2e8f0;
    }
    
    .create-post-input {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);
      outline: none;
    }
    
    .create-post-input::placeholder {
      color: #94a3b8;
    }
    
    .create-post-actions {
      display: flex;
      justify-content: space-around;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    
    .post-action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      color: #64748b;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    
    .post-action-btn:hover {
      background-color: #f1f5f9;
      color: #334155;
    }
    
    /* Posts List */
    .posts-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .post-card {
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 2px 20px rgba(0,0,0,0.05);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .post-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    
    .post-header {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .user-info {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    
    .user-avatar-container {
      position: relative;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
    }
    
    .user-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }
    
    .post-meta {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-top: 0.25rem;
    }
    
    .post-location {
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .post-time {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    
    .post-menu-btn {
      background: transparent;
      border: none;
      color: #64748b;
      padding: 0.5rem;
      border-radius: 50%;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .post-menu-btn:hover {
      background-color: #f1f5f9;
    }
    
    .post-image-container {
      width: 100%;
      position: relative;
    }
    
    .post-image {
      width: 100%;
      max-height: 500px;
      object-fit: cover;
      display: block;
    }
    
    .post-content {
      padding: 1rem;
    }
    
    .post-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .post-actions-primary {
      display: flex;
      gap: 1rem;
    }
    
    .action-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-radius: 50%;
      color: #64748b;
      transition: all 0.2s ease;
    }
    
    .action-btn:hover {
      background-color: rgba(241, 245, 249, 0.8);
      transform: scale(1.1);
    }
    
    .like-btn.liked {
      color: #ef4444;
    }
    
    .post-engagement {
      margin-bottom: 0.75rem;
    }
    
    .likes-count {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }
    
    .post-caption-container {
      margin-bottom: 1rem;
    }
    
    .caption-username {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary, #0f172a);
      margin-right: 0.5rem;
    }
    
    .post-caption {
      display: inline;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-secondary, #334155);
      margin: 0;
    }
    
    .view-comments-btn {
      background: transparent;
      border: none;
      font-size: 0.85rem;
      color: #94a3b8;
      padding: 0;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    
    .view-comments-btn:hover {
      color: #64748b;
    }
    
    /* Sidebar Styles */
    .sidebar {
      display: none;
    }
    
    @media (min-width: 1024px) {
      .sidebar {
        display: block;
        position: sticky;
        top: 5rem;
        height: calc(100vh - 5rem);
        overflow-y: auto;
        scrollbar-width: thin;
      }
    }
    
    .sidebar-section {
      background: white;
      border-radius: 1rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 20px rgba(0,0,0,0.05);
    }
    
    .sidebar-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin-top: 0;
      margin-bottom: 1rem;
    }
    
    .profile-summary-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .profile-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .profile-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }
    
    .profile-handle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }
    
    .trending-list,
    .suggested-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .trending-item,
    .suggested-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .trending-item:last-child,
    .suggested-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .trending-name {
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--text-primary, #0f172a);
      display: block;
    }
    
    .trending-count {
      font-size: 0.8rem;
      color: #64748b;
      display: block;
      margin-top: 0.25rem;
    }
    
    .suggested-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .suggested-user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .suggested-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .suggested-user-details {
      display: flex;
      flex-direction: column;
    }
    
    .suggested-name {
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--text-primary, #0f172a);
    }
    
    .suggested-bio {
      font-size: 0.8rem;
      color: #64748b;
    }
    
    .follow-btn {
      background: transparent;
      border: 1px solid #3b82f6;
      color: #3b82f6;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.35rem 0.75rem;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .follow-btn:hover {
      background: rgba(59, 130, 246, 0.1);
    }
    
    /* Footer Styles */
    .app-footer {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 3rem 0 1rem;
      margin-top: 3rem;
      width: 100%;
    }
    
    .footer-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1rem;
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 2rem;
    }
    
    @media (min-width: 640px) {
      .footer-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 1024px) {
      .footer-container {
        grid-template-columns: 2fr 1fr 1fr 1fr;
      }
    }
    
    .footer-brand {
      grid-column: 1 / -1;
    }
    
    @media (min-width: 1024px) {
      .footer-brand {
        grid-column: auto;
      }
    }
    
    .footer-logo {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .footer-tagline {
      font-size: 0.95rem;
      color: #94a3b8;
      margin: 0;
    }
    
    .footer-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem;
      color: #f1f5f9;
    }
    
    .footer-menu {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .footer-menu li {
      margin-bottom: 0.75rem;
    }
    
    .footer-menu a {
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s ease;
    }
    
    .footer-menu a:hover {
      color: white;
    }
    
    .social-icons {
      display: flex;
      gap: 1rem;
    }
    
    .social-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: center;
      align-items: center;
      color: #e2e8f0;
      transition: all 0.3s ease;
    }
    
    .social-icon:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-3px);
      color: white;
    }
    
    .footer-bottom {
      max-width: 1280px;
      margin: 2rem auto 0;
      padding: 1.5rem 1rem 0;
      border-top: 1px solid rgba(203, 213, 225, 0.1);
      text-align: center;
    }
    
    .copyright {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0;
    }
    
    @media (max-width: 768px) {
      .app-header {
        padding: 0.5rem 0;
      }
      
      .header-center {
        display: none;
      }
      
      .feed-header {
        padding: 0 0.5rem;
      }
      
      .stories-container {
        padding: 0 0.5rem 1.5rem;
      }
      
      .post-card {
        border-radius: 0.75rem;
      }
      
      .post-image {
        max-height: 400px;
      }
      
      .create-post-card {
        margin: 0 0.5rem 1.5rem;
      }
      
      .footer-container {
        gap: 1.5rem;
      }
    }
  `]
})
export class FeedComponent {
  // Featured users for stories section
  featuredUsers = [
    {
      id: 1,
      name: 'Sarah',
      avatar: 'https://via.placeholder.com/70/3498db/ffffff?text=S',
      hasUnviewedStory: true
    },
    {
      id: 2,
      name: 'Mike',
      avatar: 'https://via.placeholder.com/70/2ecc71/ffffff?text=M',
      hasUnviewedStory: true
    },
    {
      id: 3,
      name: 'Luna',
      avatar: 'https://via.placeholder.com/70/e67e22/ffffff?text=L',
      hasUnviewedStory: false
    },
    {
      id: 4,
      name: 'Carlos',
      avatar: 'https://via.placeholder.com/70/9b59b6/ffffff?text=C',
      hasUnviewedStory: true
    },
    {
      id: 5,
      name: 'Ayesha',
      avatar: 'https://via.placeholder.com/70/e74c3c/ffffff?text=A',
      hasUnviewedStory: false
    },
    {
      id: 6,
      name: 'Tyler',
      avatar: 'https://via.placeholder.com/70/f1c40f/ffffff?text=T',
      hasUnviewedStory: true
    }
  ];
  
  // Suggested users for sidebar
  suggestedUsers = [
    {
      id: 1,
      name: 'Marco Polo',
      avatar: 'https://via.placeholder.com/40/8e44ad/ffffff?text=MP',
      bio: 'Travel photographer | 28 countries'
    },
    {
      id: 2,
      name: 'Amelia Wanderlust',
      avatar: 'https://via.placeholder.com/40/16a085/ffffff?text=AW',
      bio: 'Digital nomad exploring Asia'
    },
    {
      id: 3,
      name: 'Backpack Brothers',
      avatar: 'https://via.placeholder.com/40/d35400/ffffff?text=BB',
      bio: 'Budget travel tips & hacks'
    }
  ];

  // Sample data for development - will be replaced with real data from API
  samplePosts = [
    {
      id: 1,
      userName: 'Sarah Explorer',
      userAvatar: 'https://via.placeholder.com/40/3498db/ffffff?text=SE',
      location: 'Santorini, Greece',
      timeAgo: '2 hours ago',
      caption: 'Just witnessed the most breathtaking sunset from Oia! The blue domes and white buildings create such a magical contrast against the golden sky. Greece, you have my heart! 💙 #Santorini #Greece #Sunset',
      image: 'https://via.placeholder.com/500x300/3498db/ffffff?text=Santorini+Sunset',
      likesCount: 42,
      commentsCount: 8,
      isLiked: false
    },
    {
      id: 2,
      userName: 'Adventure Mike',
      userAvatar: 'https://via.placeholder.com/40/2ecc71/ffffff?text=AM',
      location: 'Machu Picchu, Peru',
      timeAgo: '1 day ago',
      caption: 'Finally made it to Machu Picchu after a 4-day Inca Trail trek! The ancient architecture and mountain views are absolutely incredible. Worth every step of the challenging hike! 🏔️ #MachuPicchu #Peru #IncaTrail #Hiking',
      image: 'https://via.placeholder.com/500x300/2ecc71/ffffff?text=Machu+Picchu',
      likesCount: 67,
      commentsCount: 12,
      isLiked: true
    },
    {
      id: 3,
      userName: 'Luna Wanderer',
      userAvatar: 'https://via.placeholder.com/40/e67e22/ffffff?text=LW',
      location: 'Tokyo, Japan',
      timeAgo: '3 days ago',
      caption: 'Lost in the neon lights of Shibuya! Tokyo is a perfect blend of traditional culture and modern innovation. The street food here is absolutely amazing 🍜 #Tokyo #Japan #Shibuya #StreetFood',
      image: 'https://via.placeholder.com/500x300/e67e22/ffffff?text=Tokyo+Nights',
      likesCount: 89,
      commentsCount: 15,
      isLiked: false
    }
  ];
}
