const firebaseConfig = {
  apiKey: "AIzaSyDb-WPwHj-m7pn1xvHrSYBbUme_QoRyl9s",
  authDomain: "sciconnect-24e28.firebaseapp.com",
  databaseURL: "https://sciconnect-24e28-default-rtdb.firebaseio.com",
  projectId: "sciconnect-24e28",
  storageBucket: "sciconnect-24e28.appspot.com",
  messagingSenderId: "532390735714",
  appId: "1:532390735714:web:a539dde2a8adb34774863b",
  measurementId: "G-47M9XEL8DW"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const activityForm = document.getElementById('activity-form');
const subjectInput = document.getElementById('subject-name');
const activityNameInput = document.getElementById('activity-name');
const activityDateInput = document.getElementById('activity-date');
const activityTimeInput = document.getElementById('activity-time');
const classSectionInput = document.getElementById('class-section');
const activityList = document.getElementById('activity-list');
const saveBtn = document.getElementById('save-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const updateBtn = document.getElementById('update-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
let currentEditId = null;

const formatTime = (time) => {
  const [hour, minute] = time.split(':');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minute} ${ampm}`;
};

const fetchActivities = () => {
  db.ref('activities').on('value', (snapshot) => {
      activityList.innerHTML = '';
      const activities = snapshot.val();
      for (const subject in activities) {
          for (const id in activities[subject]) {
              const activity = activities[subject][id];
              const tr = document.createElement('tr');
              tr.innerHTML = `
                  <td>${subject}</td>
                  <td>${activity.name}</td>
                  <td>${activity.date}</td>
                  <td>${formatTime(activity.time)}</td>
                  <td>${activity.classSection}</td>
                  <td>
                      <button class="btn btn-warning btn-sm" onclick="editActivity('${subject}', '${id}', '${activity.name}', '${activity.date}', '${activity.time}', '${activity.classSection}')">Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteActivity('${subject}', '${id}')">Delete</button>
                  </td>
              `;
              activityList.appendChild(tr);
          }
      }
  });
};

saveBtn.addEventListener('click', () => {
  const subject = subjectInput.value;
  const name = activityNameInput.value;
  const date = activityDateInput.value;
  const time = formatTime(activityTimeInput.value);
  const classSection = classSectionInput.value;

  if (subject && name && date && time && classSection) {
      const id = db.ref().child('activities').push().key;
      db.ref(`activities/${subject}/${id}`).set({ name, date, time, classSection }).then(() => {
          activityForm.reset();
      });
  } else {
      alert("All fields are required.");
  }
});

saveEditBtn.addEventListener('click', () => {
  const subject = subjectInput.value;
  const name = activityNameInput.value;
  const date = activityDateInput.value;
  const time = formatTime(activityTimeInput.value);
  const classSection = classSectionInput.value;

  if (subject && name && date && time && classSection) {
      db.ref(`activities/${subject}/${currentEditId}`).set({ name, date, time, classSection }).then(() => {
          activityForm.reset();
          saveBtn.style.display = 'block';
          saveEditBtn.style.display = 'none';
          updateBtn.style.display = 'none';
          cancelEditBtn.style.display = 'none';
      });
  } else {
      alert("All fields are required.");
  }
});

updateBtn.addEventListener('click', () => {
  const subject = subjectInput.value;
  const name = activityNameInput.value;
  const date = activityDateInput.value;
  const time = formatTime(activityTimeInput.value);
  const classSection = classSectionInput.value;

  if (subject && name && date && time && classSection) {
      db.ref(`activities/${subject}/${currentEditId}`).set({ name, date, time, classSection }).then(() => {
          activityForm.reset();
          saveBtn.style.display = 'block';
          updateBtn.style.display = 'none';
      });
  } else {
      alert("All fields are required.");
  }
});

window.editActivity = (subject, id, name, date, time, classSection) => {
  subjectInput.value = subject;
  activityNameInput.value = name;
  activityDateInput.value = date;
  activityTimeInput.value = time;
  classSectionInput.value = classSection;
  currentEditId = id;
  saveBtn.style.display = 'none';
  saveEditBtn.style.display = 'block';
  updateBtn.style.display = 'none';
  cancelEditBtn.style.display = 'block';
};

window.deleteActivity = (subject, id) => {
  if (confirm('Are you sure you want to delete this activity?')) {
      db.ref(`activities/${subject}/${id}`).remove();
  }
};

function cancelEdit() {
  activityForm.reset();
  saveBtn.style.display = 'block';
  saveEditBtn.style.display = 'none';
  updateBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
}

fetchActivities();