const API_BASE = "https://ecommerce-project-he8a.onrender.com";

const userSelect = document.getElementById("userSelect");
const userCredits = document.getElementById("userCredits");
const productsContainer = document.getElementById("productsContainer");
const message = document.getElementById("message");

let users = [];
let products = [];

async function fetchUsers() {
  const response = await fetch(`${API_BASE}/api/users`);
  users = await response.json();

  userSelect.innerHTML = "";
  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} (ID: ${user.id})`;
    userSelect.appendChild(option);
  });

  updateSelectedUser();
}

async function fetchProducts() {
  const response = await fetch(`${API_BASE}/api/products`);
  products = await response.json();
  renderProducts();
}

function updateSelectedUser() {
  const selectedId = Number(userSelect.value);
  const user = users.find(u => u.id === selectedId);

  if (user) {
    userCredits.textContent = user.credits;
  }
}

function renderProducts() {
  productsContainer.innerHTML = "";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <h3>${product.name}</h3>
      <p><strong>Prezzo:</strong> ${product.price} crediti</p>
      <p><strong>Stock:</strong> ${product.stock}</p>
      <button ${product.stock <= 0 ? "disabled" : ""} onclick="buyProduct(${product.id})">
        Acquista
      </button>
    `;

    productsContainer.appendChild(card);
  });
}

async function buyProduct(productId) {
  const userId = Number(userSelect.value);

  try {
    const response = await fetch(`${API_BASE}/api/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, productId })
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = `Errore: ${data.error}`;
      return;
    }

    message.textContent = data.message;
    await fetchUsers();
    await fetchProducts();
  } catch (error) {
    message.textContent = "Errore di connessione al server";
  }
}

userSelect.addEventListener("change", updateSelectedUser);

fetchUsers();
fetchProducts();
