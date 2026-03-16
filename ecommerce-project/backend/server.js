const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =========================
// MIDDLEWARE DI SICUREZZA (JWT)
// =========================

// Protegge le rotte Admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Accesso negato. Token mancante." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Non sei autorizzato. Solo admin." });
    }
    next(); 
  } catch (err) {
    res.status(403).json({ error: "Token admin non valido o scaduto." });
  }
};

// Protegge le rotte Utente (es. acquisti)
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Accesso negato. Effettua il login." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Salviamo i dati decodificati nella request
    next(); 
  } catch (err) {
    res.status(403).json({ error: "Token utente non valido o scaduto." });
  }
};

// =========================
// ROTTE DI AUTENTICAZIONE
// =========================

// Login Admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: "Accesso consentito", token });
  } else {
    res.status(401).json({ error: "Credenziali amministratore errate" });
  }
});

// Registrazione Utente
app.post('/api/register', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) return res.status(400).json({ error: "Nome e password sono obbligatori" });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([{ name: name, password: hashedPassword, credits: 0 }])
      .select();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "Nome utente già in uso" });
      throw error;
    }
    res.status(201).json({ message: "Registrazione completata con successo!" });
  } catch (error) {
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// Login Utente
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) return res.status(400).json({ error: "Nome e password sono obbligatori" });

  try {
    const { data: users, error } = await supabase.from('users').select('*').eq('name', name);
    if (error) throw error;
    if (users.length === 0) return res.status(404).json({ error: "Utente non trovato" });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) return res.status(401).json({ error: "Password errata" });

    // Crea Token JWT
    const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });

    delete user.password;
    res.status(200).json({ message: "Login effettuato", user: user, token: token });
  } catch (error) {
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// Verifica sessione utente
app.get('/api/me', authenticateUser, async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();
    if (error || !user) throw new Error("Utente non trovato");

    delete user.password;
    res.json({ user });
  } catch (err) {
    res.status(403).json({ error: "Errore recupero utente" });
  }
});


// =========================
// ROTTE ADMIN (Protette)
// =========================

app.get("/api/users", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("id, name, credits").order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore lettura utenti" });
  }
});

app.patch("/api/users/:id/credits", authenticateAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { amount } = req.body;

    if (!Number.isInteger(userId) || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Dati non validi" });
    }

    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single();
    if (userError || !user) return res.status(404).json({ error: "Utente non trovato" });

    const newCredits = user.credits + amount;
    const { data: updatedUser, error: updateError } = await supabase.from("users").update({ credits: newCredits }).eq("id", userId).select().single();
    if (updateError) return res.status(500).json({ error: updateError.message });

    res.json({ message: "Crediti aggiornati con successo", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento crediti" });
  }
});

app.post("/api/products", authenticateAdmin, async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (!name || typeof price !== "number" || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "Dati prodotto non validi" });
    }

    const { data, error } = await supabase.from("products").insert([{ name: name.trim(), price, stock }]).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: "Prodotto aggiunto", product: data });
  } catch (err) {
    res.status(500).json({ error: "Errore creazione prodotto" });
  }
});

app.patch("/api/products/:id/stock", authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { stock } = req.body;

    if (!Number.isInteger(productId) || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "Dati non validi" });
    }

    const { data: updatedProduct, error } = await supabase.from("products").update({ stock }).eq("id", productId).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Stock aggiornato", product: updatedProduct });
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento stock" });
  }
});


// =========================
// ROTTE PUBBLICHE E ACQUISTI
// =========================

app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore lettura prodotti" });
  }
});

// Rotta acquisto protetta dal token Utente
app.post("/api/purchase", authenticateUser, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id; // Lo prendiamo dal token in modo sicuro!

    if (!Number.isInteger(productId)) return res.status(400).json({ error: "productId non valido" });

    const { data, error } = await supabase.rpc("purchase_product", {
      p_user_id: userId,
      p_product_id: productId
    });

    if (error) {
      const msg = error.message || "Errore durante l'acquisto";
      return res.status(400).json({ error: msg });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'acquisto" });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});