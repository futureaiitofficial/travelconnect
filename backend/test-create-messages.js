const mongoose = require('mongoose');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10
});

const sampleMessages = [
  {
    messageText: "Hey! How's your trip planning going?",
    messageType: 'text'
  },
  {
    messageText: "It's going great! I'm thinking of visiting Japan next month. Any recommendations?",
    messageType: 'text'
  },
  {
    messageText: "Absolutely! You have to visit Tokyo and Kyoto. The cherry blossoms should be in full bloom!",
    messageType: 'text'
  },
  {
    messageText: "That sounds amazing! I've been looking at some ryokans in Kyoto. Have you stayed in any traditional inns?",
    messageType: 'text'
  },
  {
    messageText: "Yes! I stayed at a beautiful ryokan in Gion. The traditional breakfast was incredible. I'll send you some photos!",
    messageType: 'text'
  },
  {
    messageText: "Wow, that looks stunning! The garden view is breathtaking. How much did it cost per night?",
    messageType: 'text'
  },
  {
    messageText: "It was around $200 per night, but totally worth it for the experience. The onsen was perfect after a long day of sightseeing.",
    messageType: 'text'
  },
  {
    messageText: "I'm definitely adding that to my itinerary! Any other must-visit places in Kyoto?",
    messageType: 'text'
  },
  {
    messageText: "Fushimi Inari Shrine early in the morning to avoid crowds, and the bamboo forest in Arashiyama. Also, don't miss the golden temple!",
    messageType: 'text'
  },
  {
    messageText: "Perfect! I'm making a list. Thanks for all the tips! 😊",
    messageType: 'text'
  },
  {
    messageText: "You're welcome! Let me know if you need any other recommendations. Have a great trip! ✈️",
    messageType: 'text'
  }
];

const groupMessages = [
  {
    messageText: "Hey everyone! Who's up for a weekend hiking trip?",
    messageType: 'text'
  },
  {
    messageText: "I'm in! Where are you thinking?",
    messageType: 'text'
  },
  {
    messageText: "I was thinking Mount Tamalpais. The views are incredible and it's not too far from the city.",
    messageType: 'text'
  },
  {
    messageText: "Sounds perfect! What time should we meet?",
    messageType: 'text'
  },
  {
    messageText: "How about 8 AM at the trailhead? We can grab coffee on the way.",
    messageType: 'text'
  },
  {
    messageText: "Works for me! Don't forget to bring water and snacks.",
    messageType: 'text'
  },
  {
    messageText: "I'll bring some energy bars and trail mix to share!",
    messageType: 'text'
  },
  {
    messageText: "Great idea! I'm so excited for this. The weather should be perfect.",
    messageType: 'text'
  }
];

async function createSampleConversations() {
  try {
    console.log('Creating sample conversations and messages...');

    // Get some users from the database
    const users = await User.find().limit(5);
    if (users.length < 3) {
      console.log('Need at least 3 users in the database. Please run the user creation script first.');
      return;
    }

    // Create direct conversations
    const directConversations = [];

    // Conversation 1: User 1 with User 2
    const conv1 = await Conversation.findOrCreateDirectConversation(users[0]._id, users[1]._id);
    directConversations.push(conv1);

    // Conversation 2: User 1 with User 3
    const conv2 = await Conversation.findOrCreateDirectConversation(users[0]._id, users[2]._id);
    directConversations.push(conv2);

    // Conversation 3: User 2 with User 3
    const conv3 = await Conversation.findOrCreateDirectConversation(users[1]._id, users[2]._id);
    directConversations.push(conv3);

    // Create a group conversation
    const groupConv = await Conversation.createGroupConversation(
      'Travel Enthusiasts',
      users[0]._id,
      [users[1]._id, users[2]._id, users[3]._id]
    );
    directConversations.push(groupConv);

    console.log('Created conversations:', directConversations.length);

    // Add messages to conversations
    for (let i = 0; i < directConversations.length; i++) {
      const conversation = directConversations[i];
      const messages = i === 0 ? sampleMessages : groupMessages;

      for (let j = 0; j < messages.length; j++) {
        const messageData = messages[j];
        const senderId = conversation.isGroup
          ? users[j % users.length]._id
          : (j % 2 === 0 ? conversation.members[0] : conversation.members[1]);

        const message = new Message({
          conversationId: conversation._id,
          senderId: senderId,
          messageText: messageData.messageText,
          messageType: messageData.messageType,
          read: j < messages.length - 2, // Mark all but last 2 messages as read
          isDelivered: true
        });

        await message.save();

        // Update conversation's last message
        await conversation.updateLastMessage(messageData.messageText, senderId);
      }

      console.log(`Added ${messages.length} messages to conversation ${i + 1}`);
    }

    // Add some reactions to messages
    const allMessages = await Message.find().populate('senderId');
    for (let i = 0; i < Math.min(allMessages.length, 10); i++) {
      const message = allMessages[i];
      if (i % 3 === 0) {
        await message.addReaction(users[0]._id, '❤️');
      }
      if (i % 4 === 0) {
        await message.addReaction(users[1]._id, '👍');
      }
      if (i % 5 === 0) {
        await message.addReaction(users[2]._id, '😊');
      }
    }

    console.log('✅ Sample conversations and messages created successfully!');
    console.log(`Created ${directConversations.length} conversations`);
    console.log(`Created ${await Message.countDocuments()} messages`);

  } catch (error) {
    console.error('Error creating sample conversations:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createSampleConversations();
