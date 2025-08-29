// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the travelconnect database
db = db.getSiblingDB('travelconnect');

// Create a user for the application
db.createUser({
  user: 'travelconnect_user',
  pwd: 'travelconnect_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'travelconnect'
    }
  ]
});

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('trips');
db.createCollection('posts');
db.createCollection('comments');
db.createCollection('conversations');
db.createCollection('messages');
db.createCollection('notifications');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.trips.createIndex({ "createdBy": 1 });
db.trips.createIndex({ "isPublic": 1 });
db.posts.createIndex({ "author": 1 });
db.posts.createIndex({ "createdAt": -1 });
db.comments.createIndex({ "postId": 1 });
db.conversations.createIndex({ "members": 1 });
db.messages.createIndex({ "conversationId": 1, "createdAt": 1 });
db.notifications.createIndex({ "recipient": 1, "read": 1 });

print('MongoDB initialization completed successfully!');
