const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require('bcryptjs');

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

// --- ROTTA DI REGISTRAZIONE ---
app.post('/api/register', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: "Nome e password sono obbligatori" });
  }

  try {
    // 1. Cripta la password (crea l'hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Salva l'utente nel database con la password criptata
    const { data, error } = await supabase
      .from('users')
      .insert([{ name: name, password: hashedPassword, credits: 0 }]) // Credits iniziali a 0
      .select();

    if (error) {
      // Codice 23505 è l'errore di violazione "unique" se il nome esiste già (se hai impostato il nome come univoco in Supabase)
      if (error.code === '23505') return res.status(400).json({ error: "Nome utente già in uso" });
      throw error;
    }

    res.status(201).json({ message: "Registrazione completata con successo!" });
  } catch (error) {
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// --- ROTTA DI LOGIN ---
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Nome e password sono obbligatori" });
  }

  try {
    // 1. Cerca l'utente nel database tramite il nome
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name);

    if (error) throw error;
    
    // 2. Se l'utente non esiste
    if (users.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const user = users[0];

    // 3. Confronta la password inserita con l'hash salvato nel database
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Password errata" });
    }

    // 4. Se è tutto ok, restituiamo l'utente (Rimuoviamo prima la password per sicurezza!)
    delete user.password;
    res.status(200).json({ message: "Login effettuato", user: user });

  } catch (error) {
    res.status(500).json({ error: "Errore interno del server" });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});