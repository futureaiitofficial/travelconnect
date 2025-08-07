import { Component } from '@angular/core';

/**
 * Explore Component - Discovery and search functionality
 * This component allows users to search for destinations, users, hashtags
 * and discover trending content and popular travel spots
 */
@Component({
  selector: 'app-explore',
  template: `
    <div class="explore-container">
      <div class="explore-header">
        <h1>Explore Travel Destinations</h1>
        <p class="header-subtitle">Discover amazing places and connect with fellow travelers</p>
      </div>
      
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search destinations, users, or hashtags..." 
            class="search-input"
            #searchInput
          >
          <button class="search-btn">Search</button>
        </div>
        
        <div class="search-filters">
          <button class="filter-btn active">All</button>
          <button class="filter-btn">Destinations</button>
          <button class="filter-btn">Users</button>
          <button class="filter-btn">Hashtags</button>
        </div>
      </div>
      
      <!-- Trending Section -->
      <div class="trending-section">
        <h2 class="section-title">🔥 Trending Destinations</h2>
        <div class="trending-grid">
          @for (destination of trendingDestinations; track destination.id) {
            <div class="destination-card">
              <div class="destination-image">
                <img [src]="destination.image" [alt]="destination.name" loading="lazy">
                <div class="destination-overlay">
                  <div class="destination-info">
                    <h3 class="destination-name">{{ destination.name }}</h3>
                    <p class="destination-country">{{ destination.country }}</p>
                  </div>
                  <div class="destination-stats">
                    <span class="post-count">{{ destination.postsCount }} posts</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- Suggested Users Section -->
      <div class="users-section">
        <h2 class="section-title">👥 Suggested Travelers</h2>
        <div class="users-grid">
          @for (user of suggestedUsers; track user.id) {
            <div class="user-card">
              <div class="user-avatar">
                <img [src]="user.avatar" [alt]="user.name + ' avatar'">
              </div>
              <div class="user-info">
                <h3 class="user-name">{{ user.name }}</h3>
                <p class="user-bio">{{ user.bio }}</p>
                <div class="user-stats">
                  <span class="stat">{{ user.followers }} followers</span>
                  <span class="stat">{{ user.posts }} posts</span>
                </div>
              </div>
              <button class="follow-btn">Follow</button>
            </div>
          }
        </div>
      </div>
      
      <!-- Popular Hashtags Section -->
      <div class="hashtags-section">
        <h2 class="section-title"># Popular Hashtags</h2>
        <div class="hashtags-cloud">
          @for (hashtag of popularHashtags; track hashtag.tag) {
            <button class="hashtag-btn" [style.font-size.rem]="hashtag.size">
              #{{ hashtag.tag }}
              <span class="hashtag-count">({{ hashtag.count }})</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .explore-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    .explore-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .explore-header h1 {
      color: #2c3e50;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .header-subtitle {
      color: #7f8c8d;
      font-size: 1.1rem;
      margin: 0;
    }
    
    /* Search Section */
    .search-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .search-icon {
      font-size: 1.2rem;
      color: #7f8c8d;
    }
    
    .search-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    
    .search-input:focus {
      border-color: #3498db;
    }
    
    .search-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .search-btn:hover {
      background: #2980b9;
    }
    
    .search-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .filter-btn {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-btn.active,
    .filter-btn:hover {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }
    
    /* Section Titles */
    .section-title {
      color: #2c3e50;
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    /* Trending Destinations */
    .trending-section {
      margin-bottom: 2rem;
    }
    
    .trending-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    
    .destination-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .destination-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .destination-image {
      position: relative;
      height: 200px;
      overflow: hidden;
    }
    
    .destination-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .destination-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .destination-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }
    
    .destination-country {
      font-size: 0.9rem;
      opacity: 0.9;
      margin: 0;
    }
    
    .post-count {
      font-size: 0.8rem;
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
    }
    
    /* Suggested Users */
    .users-section {
      margin-bottom: 2rem;
    }
    
    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .user-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.2s;
    }
    
    .user-card:hover {
      transform: translateY(-2px);
    }
    
    .user-avatar img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 1rem;
    }
    
    .user-name {
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }
    
    .user-bio {
      font-size: 0.85rem;
      color: #7f8c8d;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }
    
    .user-stats {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .stat {
      font-size: 0.8rem;
      color: #95a5a6;
    }
    
    .follow-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .follow-btn:hover {
      background: #2980b9;
    }
    
    /* Hashtags */
    .hashtags-section {
      margin-bottom: 2rem;
    }
    
    .hashtags-cloud {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }
    
    .hashtag-btn {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
      color: #3498db;
      font-weight: 600;
    }
    
    .hashtag-btn:hover {
      background: #e9ecef;
      transform: scale(1.05);
    }
    
    .hashtag-count {
      font-size: 0.7rem;
      color: #7f8c8d;
      font-weight: normal;
    }
    
    @media (max-width: 768px) {
      .explore-container {
        padding: 0.5rem;
      }
      
      .search-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-btn {
        margin-top: 0.5rem;
      }
      
      .trending-grid,
      .users-grid {
        grid-template-columns: 1fr;
      }
      
      .hashtags-cloud {
        justify-content: flex-start;
      }
    }
  `]
})
export class ExploreComponent {
  // Sample data for trending destinations
  trendingDestinations = [
    {
      id: 1,
      name: 'Bali',
      country: 'Indonesia',
      image: 'https://via.placeholder.com/300x200/27ae60/ffffff?text=Bali',
      postsCount: 1247
    },
    {
      id: 2,
      name: 'Paris',
      country: 'France',
      image: 'https://via.placeholder.com/300x200/3498db/ffffff?text=Paris',
      postsCount: 892
    },
    {
      id: 3,
      name: 'Tokyo',
      country: 'Japan',
      image: 'https://via.placeholder.com/300x200/e74c3c/ffffff?text=Tokyo',
      postsCount: 1056
    },
    {
      id: 4,
      name: 'New York',
      country: 'USA',
      image: 'https://via.placeholder.com/300x200/9b59b6/ffffff?text=NYC',
      postsCount: 743
    }
  ];
  
  // Sample data for suggested users
  suggestedUsers = [
    {
      id: 1,
      name: 'Alex Mountain',
      bio: 'Adventure photographer capturing stunning landscapes',
      avatar: 'https://via.placeholder.com/60/3498db/ffffff?text=AM',
      followers: 2500,
      posts: 124
    },
    {
      id: 2,
      name: 'Emma Beach',
      bio: 'Beach lover and sunset chaser 🌅',
      avatar: 'https://via.placeholder.com/60/e74c3c/ffffff?text=EB',
      followers: 1800,
      posts: 89
    },
    {
      id: 3,
      name: 'Carlos Culture',
      bio: 'Cultural explorer and food enthusiast',
      avatar: 'https://via.placeholder.com/60/f39c12/ffffff?text=CC',
      followers: 3200,
      posts: 156
    }
  ];
  
  // Sample data for popular hashtags with different sizes for cloud effect
  popularHashtags = [
    { tag: 'travel', count: 15678, size: 1.4 },
    { tag: 'wanderlust', count: 12456, size: 1.2 },
    { tag: 'adventure', count: 11234, size: 1.1 },
    { tag: 'backpacking', count: 8945, size: 1.0 },
    { tag: 'solotravel', count: 7832, size: 0.95 },
    { tag: 'digitalnomad', count: 6543, size: 0.9 },
    { tag: 'photography', count: 9876, size: 1.05 },
    { tag: 'nature', count: 8765, size: 1.0 },
    { tag: 'beach', count: 7654, size: 0.95 },
    { tag: 'mountains', count: 6789, size: 0.9 },
    { tag: 'citybreak', count: 5432, size: 0.85 },
    { tag: 'foodie', count: 4321, size: 0.8 }
  ];
}
