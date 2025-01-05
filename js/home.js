import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { 
    getDatabase, ref, onValue, onDisconnect, set, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDb-WPwHj-m7pn1xvHrSYBbUme_QoRyl9s",
    authDomain: "sciconnect-24e28.firebaseapp.com",
    projectId: "sciconnect-24e28",
    storageBucket: "sciconnect-24e28.firebasestorage.app",
    messagingSenderId: "532390735714",
    appId: "1:532390735714:web:a539dde2a8adb34774863b",
    measurementId: "G-47M9XEL8DW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const database = getDatabase();
const Fdatabase = getFirestore(app);

const signoutButton = document.getElementById('signout');
const userEmailSpan = document.getElementById('user-email');
const sidebar = document.getElementById('sidebar');
const toggleSidebarButton = document.getElementById('toggle-sidebar');
const scheduleList = document.getElementById('schedule-list');
const filtersButton = document.getElementById('filters-button');
const filterSection = document.getElementById('filter-section');
const loadingSpinner = document.getElementById('loading-spinner');
const adminPageButton = document.getElementById('admin-page');
const onlineUsersRef = ref(database, "onlineUsers");
let userStatusRef;

// Set the user's presence to online
const setOnlineStatus = () => {
    if (auth.currentUser) {
        set(userStatusRef, {
            email: auth.currentUser.email,
            lastOnline: serverTimestamp(),
        });

        onDisconnect(userStatusRef).remove();
    } else {
        console.warn("User not authenticated; cannot set online status.");
    }
};

// Monitor online users count
const onlineCountElement = document.getElementById("online-count");
onValue(onlineUsersRef, (snapshot) => {
    const onlineUsers = snapshot.val() || {};
    const onlineCount = Object.keys(onlineUsers).length;

    onlineCountElement.textContent = onlineCount;
});

window.onload = () => {
    loadingSpinner.style.visibility = 'hidden'; // Hide the spinner once page has loaded
};

// Global variable to store activities
let activities = {};

// Fetch and display activity schedule in real-time
const fetchActivitySchedule = () => {
    loadingSpinner.style.visibility = 'visible'; // Show spinner

    const activityRef = ref(database, 'activities/');
    onValue(activityRef, (snapshot) => {
        if (snapshot.exists()) {
            activities = snapshot.val();
            scheduleList.innerHTML = '';

            Object.keys(activities).forEach(subject => {
                const subjectActivities = activities[subject];
                Object.keys(subjectActivities).forEach(activityKey => {
                    const activity = subjectActivities[activityKey];
                    const deadline = new Date(activity.date + ' ' + activity.time);
                    const countdown = getCountdown(deadline);

                    const activityRow = document.createElement('tr');
                    activityRow.innerHTML =
                        `<td>${subject}</td>
                         <td>${activity.name}</td>
                         <td>${activity.date}</td>
                         <td>${activity.time}</td>
                         <td>${activity.classSection || "N/A"}</td>
                         <td id="countdown-${activityKey}" data-activity-key="${activityKey}" data-subject="${subject}">${countdown}</td>`;
                    scheduleList.appendChild(activityRow);
                });
            });

            setInterval(updateCountdowns, 1000);
        } else {
            scheduleList.innerHTML = '<tr><td colspan="6">No activities scheduled.</td></tr>';
        }

        loadingSpinner.style.visibility = 'hidden'; // Hide spinner
    });
};

const getCountdown = (deadline) => {
    const now = new Date();
    const timeDiff = deadline - now;

    if (timeDiff <= 0) return 'Time is up!';

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const updateCountdowns = () => {
    const countdownElements = document.querySelectorAll('[id^="countdown-"]');
    countdownElements.forEach(countdownElement => {
        const activityKey = countdownElement.dataset.activityKey;
        const subject = countdownElement.dataset.subject;

        if (activities[subject] && activities[subject][activityKey]) {
            const activity = activities[subject][activityKey];
            const deadline = new Date(activity.date + ' ' + activity.time);
            const countdown = getCountdown(deadline);

            countdownElement.textContent = countdown;

            const now = new Date();
            const timeDiff = deadline - now;

            if (timeDiff <= 0) {
                countdownElement.style.color = "red";
            } else if (timeDiff <= 5 * 60 * 60 * 1000) { // Less than 5 hours
                countdownElement.style.color = "orange";
            } else if (timeDiff <= 12 * 60 * 60 * 1000) { // Less than 12 hours
                countdownElement.style.color = "yellow";
            } else {
                countdownElement.style.color = "green"; // More than 12 hours
            }
        } else {
            countdownElement.textContent = 'Invalid activity data';
        }
    });
};

// Handle filter visibility toggle
filtersButton.addEventListener('click', () => {
    filterSection.classList.toggle('visible');
});

// Handle filter
document.getElementById('apply-filters').addEventListener('click', () => {
    const sectionFilter = document.getElementById('section-filter').value.toLowerCase();
    const subjectFilter = document.getElementById('subject-filter').value.toLowerCase();
    const deadlineFilter = document.getElementById('deadline-filter').value;

    let filteredActivities = Object.keys(activities).reduce((result, subject) => {
        // Apply subject filter
        if (subjectFilter && !subject.toLowerCase().includes(subjectFilter)) {
            return result; // Skip this subject if it doesn't match the filter
        }

        const subjectActivities = activities[subject];
        const filteredSubjectActivities = Object.keys(subjectActivities).reduce((subResult, activityKey) => {
            const activity = subjectActivities[activityKey];
            const deadline = new Date(activity.date + ' ' + activity.time);
            const formattedDeadline = deadline.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            const matchesSection = sectionFilter === '' || (activity.classSection && activity.classSection.toLowerCase().includes(sectionFilter));
            const matchesDeadline = deadlineFilter === '' || formattedDeadline === deadlineFilter;
            
            if (matchesSection && matchesDeadline) {
                subResult[activityKey] = activity;
            }
            return subResult;
        }, {}); 

        if (Object.keys(filteredSubjectActivities).length > 0) {
            result[subject] = filteredSubjectActivities;
        }
        return result;
    }, {}); 

    // Update the table with the filtered activities
    scheduleList.innerHTML = '';
    if (Object.keys(filteredActivities).length > 0) {
        Object.keys(filteredActivities).forEach(subject => {
            const subjectActivities = filteredActivities[subject];
            Object.keys(subjectActivities).forEach(activityKey => {
                const activity = subjectActivities[activityKey];
                const deadline = new Date(activity.date + ' ' + activity.time);
                const countdown = getCountdown(deadline);

                const activityRow = document.createElement('tr');
                activityRow.innerHTML =
                    `<td>${subject}</td>
                     <td>${activity.name}</td>
                     <td>${activity.date}</td>
                     <td>${activity.time}</td>
                     <td>${activity.classSection || "N/A"}</td>
                     <td id="countdown-${activityKey}" data-activity-key="${activityKey}" data-subject="${subject}">${countdown}</td>`;
                scheduleList.appendChild(activityRow);
            });
        });

        setInterval(updateCountdowns, 1000);
    } else {
        scheduleList.innerHTML = '<tr><td colspan="6">No activities match your filters.</td></tr>';
    }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
      const userRef = doc(Fdatabase, "users", user.uid); // Reference to Firestore user document
      getDoc(userRef)
          .then((docSnap) => {
              if (docSnap.exists()) {
                  const userData = docSnap.data();
                  const userName = userData.username || user.email; // Use Firestore 'username' field, fallback to email
                  
                  userEmailSpan.textContent = `${userName}`;

                  // Check if the user is an admin
                  if (userData.role && userData.role === "admin") {
                      userEmailSpan.innerHTML = `<span style="color: red;">${userName} (ADMIN)</span>`;
                      adminPageButton.style.display = "block"; // Show admin page button
                      document.getElementById("online-users").style.display = "block"; // Show online users section
                      adminPageButton.addEventListener('click', () => {
                          window.location.href = 'admin-schedule.html'; // Redirect to the admin page
                      });
                  }
              } else {
                  console.error("No such document!");
                  userEmailSpan.textContent = "Guest";
              }
          })
          .catch((error) => {
              console.error("Error fetching user data:", error);
              userEmailSpan.textContent = "Welcome, Guest";
          });

      userStatusRef = ref(database, `onlineUsers/${user.uid}`);
      setOnlineStatus();

      fetchActivitySchedule(); // Load activities once the user is authenticated
  } else {
      window.location.href = 'index.html'; // Redirect to login if not authenticated
  }
});

signoutButton.addEventListener('click', async () => {
    const confirmSignOut = window.confirm("Are you sure you want to sign out?");
    if (confirmSignOut) {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            alert("Error signing out: " + error.message);
        }
    }
});

toggleSidebarButton.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-active');
});

// Handle clear filters
document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('section-filter').value = ''; // Reset section filter
    document.getElementById('deadline-filter').value = ''; // Reset deadline filter
    document.getElementById('subject-filter').value = ''; // Reset subject filter
    fetchActivitySchedule(); // Fetch all activities again
});

// Add event listeners for sorting buttons
document.getElementById('sort-least-time').addEventListener('click', () => {
    sortActivities('least');
});

document.getElementById('sort-most-time').addEventListener('click', () => {
    sortActivities('most');
});

// Function to sort activities based on time remaining
const sortActivities = (sortOrder) => {
    const rows = Array.from(scheduleList.getElementsByTagName('tr'));
    const sortedRows = rows.sort((a, b) => {
        const timeLeftA = parseTimeLeft(a.querySelector('[id^="countdown-"]').textContent);
        const timeLeftB = parseTimeLeft(b.querySelector('[id^="countdown-"]').textContent);

        if (sortOrder === 'least') {
            return timeLeftA - timeLeftB;
        } else {
            return timeLeftB - timeLeftA;
        }
    });

    // Append the sorted rows to the table
    sortedRows.forEach(row => scheduleList.appendChild(row));
};

// Helper function to convert countdown time to milliseconds
const parseTimeLeft = (timeText) => {
    // Handle the case where the timer has run out
    if (timeText === 'Time is up!') {
        return 0;  // No time left
    }

    const timeParts = timeText.split(' '); // [days, hours, minutes, seconds]
    const days = parseInt(timeParts[0]);
    const hours = parseInt(timeParts[1].replace('h', ''));
    const minutes = parseInt(timeParts[2].replace('m', ''));
    const seconds = parseInt(timeParts[3].replace('s', ''));

    return (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000);
};