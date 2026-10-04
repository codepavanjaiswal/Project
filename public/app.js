const form = document.getElementById("userForm");
const usersContainer = document.getElementById("users");
const message = document.getElementById("message");
const refreshBtn = document.getElementById("refreshBtn");
const refreshIntervalMs = 3000;
const apiBaseUrl = document.querySelector('meta[name="api-base-url"]').content.trim().replace(/\/+$/, "")
  || (window.location.port === "5500" ? "http://localhost:3000" : "");
const isGitHubPages = window.location.hostname.endsWith(".github.io");
let isLoadingUsers = false;
let lastRenderedUsers = null;

async function loadUsers(showLoading = false) {
  if (isLoadingUsers) return;
  isLoadingUsers = true;

  if (showLoading && lastRenderedUsers === null) {
    usersContainer.textContent = "Loading...";
  }

  try {
    const response = await fetch(getUsersApiUrl(), { cache: "no-store" });
    const data = await readJsonResponse(response, "Failed to load users");
    const serializedUsers = JSON.stringify(data);

    if (serializedUsers !== lastRenderedUsers) {
      lastRenderedUsers = serializedUsers;

      if (data.length === 0) {
        usersContainer.textContent = "No users saved yet.";
        return;
      }

      usersContainer.innerHTML = data.map(user => `
        <div class="user">
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(user.email)}</span>
          <br>
          <small>${new Date(user.createdAt).toLocaleString()}</small>
        </div>
      `).join("");
    }
  } catch (error) {
    if (lastRenderedUsers === null) {
      usersContainer.textContent = error.message;
    }
  } finally {
    isLoadingUsers = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  message.textContent = "Saving...";

  try {
    const response = await fetch(getUsersApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });

    await readJsonResponse(response, "Failed to save user");

    message.textContent = "User saved successfully!";
    form.reset();
    await loadUsers();
  } catch (error) {
    message.textContent = error.message;
  }
});

refreshBtn.addEventListener("click", () => loadUsers(true));

function getUsersApiUrl() {
  if (isGitHubPages && !apiBaseUrl) {
    throw new Error("Set the deployed Express API URL in index.html to use the GitHub Pages site.");
  }

  return apiBaseUrl ? `${apiBaseUrl}/api/users` : "/api/users";
}

async function readJsonResponse(response, fallbackMessage) {
  const body = await response.text();
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    const responseDescription = body.trim() ? "invalid JSON" : "an empty response";
    throw new Error(`Server returned ${responseDescription} (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadUsers(true);
window.setInterval(() => {
  if (!document.hidden) loadUsers();
}, refreshIntervalMs);
