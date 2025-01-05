import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

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
const db = getFirestore();

const authContainer = document.getElementById('auth-container');
const homeContainer = document.getElementById('home-container');
const userEmailSpan = document.getElementById('user-email');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupButton = document.getElementById('signup');
const signinButton = document.getElementById('signin');
const googleSigninButton = document.getElementById('google-signin');
const signoutButton = document.getElementById('signout');
const errorMessageDiv = document.getElementById('error-message');
const loadingDiv = document.getElementById('loading');
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const saveUsernameButton = document.getElementById('save-username');
const usernameError = document.getElementById('username-error');

function showHome(user) {
    window.location.href = 'home.html'; 
}

function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    setTimeout(() => errorMessageDiv.style.display = 'none', 5000);
    loadingDiv.style.display = 'none';
}

function showLoading() {
    loadingDiv.style.display = 'block';
}

function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
}

function isValidPassword(password) {
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return passwordPattern.test(password);
}

signupButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (email && password) {
      if (!isValidEmail(email)) {
          displayError("Please enter a valid email.");
          return;
      }
      if (!isValidPassword(password)) {
          displayError("Password must be at least 8 characters long, contain at least one letter, one number, and one special character.");
          return;
      }
      showLoading();
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Fetch IP address
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();

          // Get device info
          const deviceInfo = {
              platform: navigator.platform,
              userAgent: navigator.userAgent,
              language: navigator.language,
          };

          await setDoc(doc(db, "users", user.uid), {
              email: user.email,
              createdAt: new Date().toISOString(),
              role: "user",
              uid: user.uid,
              provider: "email",
              ipAddress: ipData.ip, // Save IP address
              deviceInfo,           // Save device info
          });

          showHome(user);  
      } catch (error) {
          displayError("Error: " + error.message);
      }
  } else {
      displayError("Please enter a valid email and password.");
  }
});

signinButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (email && password) {
        if (!isValidEmail(email)) {
            displayError("Please enter a valid email.");
            return;
        }
        showLoading();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            showHome(user);  
        } catch (error) {
            displayError("Error: " + error.message);
        }
    } else {
        displayError("Please enter a valid email and password.");
    }
});

googleSigninButton.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  showLoading();
  try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Fetch IP address
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();

      // Get device info
      const deviceInfo = {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
      };

      if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
              email: user.email,
              createdAt: new Date().toISOString(),
              role: "user",
              uid: user.uid,
              provider: "google",
              ipAddress: ipData.ip, // Save IP address
              deviceInfo,           // Save device info
          });
      }

      if (!userDocSnap.exists() || !userDocSnap.data().username) {
          showUsernameModal();
      } else {
          showHome(user);
      }
  } catch (error) {
      displayError("Error: " + error.message);
  }
});

signoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        displayError("Error: " + error.message);
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().username) {
            showHome(user);  
        } else {
            showUsernameModal();
        }
    } else {
        authContainer.style.display = 'block';
        homeContainer.style.display = 'none';
    }
});

function isValidUsername(username) {
    const usernamePattern = /^[a-zA-Z0-9_]{3,15}$/;
    return usernamePattern.test(username);
}

function showUsernameModal() {
    usernameModal.style.display = 'block';
    authContainer.style.display = 'none';
    homeContainer.style.display = 'none';
}

async function saveUsername(userId) {
    const username = usernameInput.value.trim();
    if (!isValidUsername(username)) {
        usernameError.textContent = "Invalid username. Must be 3-15 characters long and contain only letters, numbers, or underscores.";
        usernameError.style.display = 'block';
        return;
    }

    try {
        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(usernameQuery);

        if (!querySnapshot.empty) {
            usernameError.textContent = "Username is already taken.";
            usernameError.style.display = 'block';
            return;
        }

        await setDoc(doc(db, "users", userId), { username }, { merge: true });

        usernameModal.style.display = 'none';
        const user = auth.currentUser;
        if (user) showHome(user);
    } catch (error) {
        usernameError.textContent = "Error saving username. Please try again.";
        usernameError.style.display = 'block';
    }
}

saveUsernameButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
        await saveUsername(user.uid);
    }
});
