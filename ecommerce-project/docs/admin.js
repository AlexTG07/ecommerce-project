const API_BASE = "https://ecommerce-project-he8a.onrender.com";

const addProductForm = document.getElementById("addProductForm");
const updateStockForm = document.getElementById("updateStockForm");
const addCreditsForm = document.getElementById("addCreditsForm");

const stockProductSelect = document.getElementById("stockProductSelect");
const creditsUserSelect = document.getElementById("creditsUserSelect");

const usersList = document.getElementById("usersList");
const productsList = document.getElementById("productsList");
const adminMessage = document.getElementById("adminMessage");

let users = [];
let products = [];

async function loadData() {
  await fetchUsers();
  await fetchProducts();
}

async function fetchUsers() {
  const response = await fetch(`${API_BASE}/api/users`);
  users = await response.json();

  creditsUserSelect.innerHTML = "";
  usersList.innerHTML = "";

  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} (ID: ${user.id})`;
    creditsUserSelect.appendChild(option);

    const li = document.createElement("li");
    li.textContent = `${user.name} - Crediti: ${user.credits}`;
    usersList.appendChild(li);
  });
}

async function fetchProducts() {
  const response = await fetch(`${API_BASE}/api/products`);
  products = await response.json();

  stockProductSelect.innerHTML = "";
  productsList.innerHTML = "";

  products.forEach(product => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (ID: ${product.id})`;
    stockProductSelect.appendChild(option);

    const li = document.createElement("li");
    li.textContent = `${product.name} - Prezzo: ${product.price} - Stock: ${product.stock}`;
    productsList.appendChild(li);
  });
}

addProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const stock = Number(document.getElementById("productStock").value);

  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, price, stock })
    });

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent = `Errore: ${data.error}`;
      return;
    }

    adminMessage.textContent = data.message;
    addProductForm.reset();
    await fetchProducts();
  } catch (error) {
    adminMessage.textContent = "Errore di connessione al server";
  }
});

updateStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const productId = Number(stockProductSelect.value);
  const stock = Number(document.getElementById("newStock").value);

  try {
    const response = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stock })
    });

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent = `Errore: ${data.error}`;
      return;
    }

    adminMessage.textContent = data.message;
    updateStockForm.reset();
    await fetchProducts();
  } catch (error) {
    adminMessage.textContent = "Errore di connessione al server";
  }
});

addCreditsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = Number(creditsUserSelect.value);
  const amount = Number(document.getElementById("creditsAmount").value);

  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}/credits`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent = `Errore: ${data.error}`;
      return;
    }

    adminMessage.textContent = data.message;
    addCreditsForm.reset();
    await fetchUsers();
  } catch (error) {
    adminMessage.textContent = "Errore di connessione al server";
  }
});

loadData();
