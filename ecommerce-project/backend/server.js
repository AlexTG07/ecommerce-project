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



app.get("/", (req, res) => {
  res.json({ message: "Backend e-commerce con Supabase attivo" });
});

// =========================
// USERS
// =========================

// Tutti gli utenti
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore lettura utenti" });
  }
});

// Utente per id
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "ID utente non valido" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore recupero utente" });
  }
});

// Aggiunta crediti bonus
app.patch("/api/users/:id/credits", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { amount } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "ID utente non valido" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount non valido" });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError && userError.code !== "PGRST116") {
      return res.status(500).json({ error: userError.message });
    }

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const newCredits = user.credits + amount;

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ credits: newCredits })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: "Crediti aggiornati con successo",
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento crediti" });
  }
});

// =========================
// PRODUCTS
// =========================

// Tutti i prodotti
app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore lettura prodotti" });
  }
});

// Aggiunta nuovo prodotto
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Nome prodotto non valido" });
    }

    if (typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "Prezzo non valido" });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "Stock non valido" });
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: name.trim(),
          price,
          stock
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: "Prodotto aggiunto con successo",
      product: data
    });
  } catch (err) {
    res.status(500).json({ error: "Errore creazione prodotto" });
  }
});

// Modifica stock prodotto
app.patch("/api/products/:id/stock", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { stock } = req.body;

    if (!Number.isInteger(productId)) {
      return res.status(400).json({ error: "ID prodotto non valido" });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "Stock non valido" });
    }

    const { data: product, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (findError && findError.code !== "PGRST116") {
      return res.status(500).json({ error: findError.message });
    }

    if (!product) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update({ stock })
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: "Stock aggiornato con successo",
      product: updatedProduct
    });
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento stock" });
  }
});

// =========================
// PURCHASE
// =========================

app.post("/api/purchase", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!Number.isInteger(userId) || !Number.isInteger(productId)) {
      return res.status(400).json({ error: "userId o productId non validi" });
    }

    const { data, error } = await supabase.rpc("purchase_product", {
      p_user_id: userId,
      p_product_id: productId
    });

    if (error) {
      const msg = error.message || "Errore durante l'acquisto";

      if (
        msg.includes("Utente non trovato") ||
        msg.includes("Prodotto non trovato")
      ) {
        return res.status(404).json({ error: msg });
      }

      if (
        msg.includes("Prodotto esaurito") ||
        msg.includes("Crediti insufficienti")
      ) {
        return res.status(409).json({ error: msg });
      }

      return res.status(500).json({ error: msg });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'acquisto" });
  }
});

// --- ROTTA DI LOGIN (Modificata per restituire il Token) ---
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

    // Creazione del Token JWT valido per 24 ore
    const token = jwt.sign(
      { id: user.id, name: user.name }, 
      process.env.JWT_SECRET || 'segreto_di_backup', 
      { expiresIn: '24h' }
    );

    delete user.password;
    res.status(200).json({ message: "Login effettuato", user: user, token: token });
  } catch (error) {
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// --- NUOVA ROTTA: Verifica utente loggato (/api/me) ---
// Questa rotta viene chiamata dal frontend al caricamento della pagina per ripristinare la sessione
app.get('/api/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: "Nessun token fornito" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segreto_di_backup');
    
    // Recupera i dati aggiornati dell'utente (es. i crediti)
    const { data: user, error } = await supabase.from('users').select('*').eq('id', decoded.id).single();
    if (error || !user) throw new Error("Utente non trovato");

    delete user.password;
    res.json({ user });
  } catch (err) {
    res.status(403).json({ error: "Token non valido o scaduto" });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});