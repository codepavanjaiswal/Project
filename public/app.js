const form = document.getElementById("userForm");
const usersContainer = document.getElementById("users");
const message = document.getElementById("message");
const refreshBtn = document.getElementById("refreshBtn");

async function loadUsers() {
  usersContainer.textContent = "Loading...";

  try {
    const response = await fetch("/api/users");
    const data = await readJsonResponse(response, "Failed to load users");

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
  } catch (error) {
    usersContainer.textContent = error.message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  message.textContent = "Saving...";

  try {
    const response = await fetch("/api/users", {
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

refreshBtn.addEventListener("click", loadUsers);

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

loadUsers();