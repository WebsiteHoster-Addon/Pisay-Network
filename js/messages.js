import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDb-WPwHj-m7pn1xvHrSYBbUme_QoRyl9s",
    authDomain: "sciconnect-24e28.firebaseapp.com",
    projectId: "sciconnect-24e28",
    storageBucket: "sciconnect-24e28.firebasestorage.app",
    messagingSenderId: "532390735714",
    appId: "1:532390735714:web:a539dde2a8adb34774863b",
    measurementId: "G-47M9XEL8DW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const firestore = getFirestore();
const userList = document.getElementById('user-list');
const searchUserInput = document.getElementById('search-user');
const chatModal = document.getElementById('chat-modal');
const chatMessages = document.getElementById('chat-messages');
const chatUsername = document.getElementById('chat-username');
const chatMessageInput = document.getElementById('chat-message-input');
const chatSendButton = document.getElementById('chat-send-button');
const closeChatModal = document.getElementById('close-chat-modal');
const loadingSpinner = document.getElementById('spinner');
const sidebar = document.getElementById('sidebar');
const toggleSidebarButton = document.getElementById('toggle-sidebar');
const userCache = new Map();

toggleSidebarButton.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

const showSpinner = () => {
    loadingSpinner?.classList.remove('hidden'); 
};

const hideSpinner = () => {
    loadingSpinner?.classList.add('hidden'); 
};

const validateString = (str) => typeof str === 'string' && str.trim().length > 0;

const getUsername = async (uid) => {
    if (!validateString(uid)) {
        console.error("Invalid UID provided for username fetch.");
        return 'Anonymous';
    }

    if (userCache.has(uid)) {
        return userCache.get(uid);
    }

    try {
        const userDoc = await getDocs(query(collection(firestore, 'users'), where('uid', '==', uid)));
        const username = userDoc.empty ? 'Anonymous' : userDoc.docs[0]?.data()?.username || 'Anonymous';
        userCache.set(uid, username);
        return username;
    } catch (error) {
        console.error("Error fetching username:", error);
        return 'Anonymous';
    }
};

const fetchUsers = async (searchQuery = '') => {
    showSpinner();
    userList.innerHTML = '';
    try {
        let userQuery = collection(firestore, 'users');
        if (validateString(searchQuery)) {
            userQuery = query(
                userQuery,
                where('username', '>=', searchQuery),
                where('username', '<=', searchQuery + '\uf8ff'),
                orderBy('username'),
                limit(10)
            );
        } else {
            userQuery = query(userQuery, orderBy('username'), limit(10));
        }

        const querySnapshot = await getDocs(userQuery);

        if (querySnapshot.empty) {
            userList.innerHTML = '<li>No users found.</li>';
            return;
        }

        userList.innerHTML = querySnapshot.docs
            .map(doc => `
                <li class="user" data-user-id="${doc.id}">
                    <i class="fas fa-user-circle user-icon"></i>
                    ${doc.data().username || 'Anonymous User'}
                </li>
            `)
            .join('');

        Array.from(userList.querySelectorAll('.user')).forEach(userElement => {
            userElement.addEventListener('click', () => {
                const userId = userElement.dataset.userId;
                const username = userElement.textContent;
                openChatModal(username, userId);
            });
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        userList.innerHTML = '<li>Error loading users.</li>';
    } finally {
        hideSpinner();
    }
};

const fetchMessages = async (userId) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !validateString(userId)) return;

    const chatPath = currentUser.uid < userId ? `${currentUser.uid}_${userId}` : `${userId}_${currentUser.uid}`;
    const messagesRef = collection(firestore, `messages/${chatPath}/userMessages`);
    const messagesQuery = query(messagesRef, orderBy('timestamp'));

    onSnapshot(messagesQuery, async (snapshot) => {
        chatMessages.innerHTML = '';
        if (snapshot.empty) {
            chatMessages.innerHTML = "<div class='no-messages'>No messages yet. Start the conversation!</div>";
            return;
        }

        for (const doc of snapshot.docs) {
            const message = doc.data();
            const isCurrentUser = message.senderId === currentUser.uid;

            const senderUsername = isCurrentUser
                ? "You"
                : await getUsername(message.senderId);

            const messageElement = document.createElement('div');
            messageElement.className = isCurrentUser ? 'message sent' : 'message received';
            messageElement.innerHTML = `
                <span class="message-sender" style="font-weight: bold;">${senderUsername}:</span>
                <span class="message-content">${message.content}</span>
                <span class="message-timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
            `;
            chatMessages.appendChild(messageElement);
        }

        const chatMessagesContainer = document.getElementById('chat-messages-container');
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
};

const openChatModal = (username, userId) => {
    if (!validateString(username) || !validateString(userId)) return;
    chatUsername.textContent = username;
    chatModal.classList.remove('hidden');
    chatModal.setAttribute('data-user-id', userId);
    fetchMessages(userId);
};

closeChatModal.addEventListener('click', () => {
    chatModal.classList.add('hidden');
    chatMessages.innerHTML = '';
});

chatSendButton.addEventListener('click', async () => {
  const userId = chatModal.getAttribute('data-user-id');
  const content = chatMessageInput.value.trim();
  if (!validateString(content)) return;

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  chatSendButton.disabled = true; // Disable the button during the sending process

  const senderUsername = await getUsername(currentUser.uid);
  const chatPath = currentUser.uid < userId ? `${currentUser.uid}_${userId}` : `${userId}_${currentUser.uid}`;
  const messagesRef = collection(firestore, `messages/${chatPath}/userMessages`);

  try {
      await addDoc(messagesRef, {
          content,
          senderId: currentUser.uid,
          senderUsername,
          timestamp: Date.now(),
      });

      chatMessageInput.value = ''; // Clear the input field
  } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
  } finally {
      chatSendButton.disabled = false; // Re-enable the button
  }
});

searchUserInput.addEventListener('input', () => fetchUsers(searchUserInput.value));

onAuthStateChanged(auth, (user) => {
    if (user) fetchUsers();
    else window.location.href = 'index.html';
});
