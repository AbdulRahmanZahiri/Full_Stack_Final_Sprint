// Open the socket and JOIN
const webSocket = new WebSocket("ws://localhost:3000/ws");
webSocket.addEventListener("open", () => {
  console.log("WebSocket connection established");
});


// Handle incoming messages
webSocket.addEventListener("message", (event) => {
  const { type, payload } = JSON.parse(event.data);

  switch (type) {
    case "JOIN":
      onUserConnected(payload.username);
      break;
    case "LEAVE":
      onUserDisconnected(payload.username);
      break;
    case "MESSAGE":
      onNewMessageReceived(
        payload.username,
        payload.timestamp,
        payload.message
      );
      break;
    case "USERS":
      if (payload.users && Array.isArray(payload.users)) {
        updateUsersList(payload.users);
      }
      break;
    default:
      console.warn("Unknown WS message type:", type);
  }
});

// If the socket closes, update the UX
webSocket.addEventListener("close", () => {
  if (window.CURRENT_USERNAME) {
    onUserDisconnected(window.CURRENT_USERNAME);
  }
});

// Send chat messages
function onMessageSent(e) {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  console.log("Sending message:", text);
  if (!text) return;

  webSocket.send(JSON.stringify({
    type: "MESSAGE",
    payload: {
      username: window.CURRENT_USERNAME,
      timestamp: new Date().toISOString(),
      message: text
    }
  }));

  input.value = "";
}

// Wire up a single listener to the form
document
  .getElementById("messageForm")
  .addEventListener("submit", onMessageSent);

// —————————————————————
// DOM‑update helpers 
// —————————————————————
function onUserConnected(username) {

  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.innerHTML = `
    <div class="message-join">
      <p>${username}</p>
      <p>joined the chat - </p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function onUserDisconnected(username) {
  const li = document.getElementById(`user-${username}`);
  if (li) li.remove();
  updateUserCount();

  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.innerHTML = `
    <div class="message-leave">
      <p>${username}</p>
      <p>left the chat - </p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateUserCount() {
  const count = document.querySelectorAll("#userList li").length;
  document.getElementById("userCount").textContent = count;
}

// Update the user list when a new user connects //
function updateUsersList(users) {
  const ul = document.getElementById("userList");

  // Clear existing list
  ul.innerHTML = "";

  // Add each user
  users.forEach(username => {
    // Create new user element
    const li = document.createElement("li");
    li.className = "user-item";
    li.id = `user-${username}`;
    li.innerHTML = `
      <a href="/profile/${username}" class="user-link">
      <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=${username}" alt="${username}" class="user-avatar">
        <span class="user-name">${username}</span>
      </a>
    `;
    ul.appendChild(li);
  });

  // Update the counter
  updateUserCount();
}

function onNewMessageReceived(username, timestamp, message) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `
    <div class="message-title">
      <h3 class="message-sender">${username}</h3>
      <p class="message-time">${new Date(timestamp).toLocaleString()}</p>
    </div>
    <p class="message-text">${message}</p>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
