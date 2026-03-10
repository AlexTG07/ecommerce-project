# E-Commerce Architetture Distribuite

## Descrizione
Progetto client-server per un e-commerce fittizio con:
- Vista Utente
- Vista Admin

Frontend in HTML/CSS/Vanilla JavaScript.
Backend in Node.js con Express.
Persistenza dati su Supabase (PostgreSQL).

---

## Architettura
Il client sviluppato è un **Thin Client**.

Motivazione:
- il frontend mostra i dati e invia richieste HTTP;
- la logica di business è implementata sul backend;
- i controlli sugli acquisti validi sono effettuati lato server;
- il backend comunica con Supabase per leggere e modificare i dati.

---

## Endpoint API

### Utenti
- `GET /api/users`  
  Ritorna tutti gli utenti

- `GET /api/users/:id`  
  Ritorna un utente specifico

- `PATCH /api/users/:id/credits`  
  Aggiunge crediti bonus a un utente

### Prodotti
- `GET /api/products`  
  Ritorna tutti i prodotti

- `POST /api/products`  
  Aggiunge un nuovo prodotto

- `PATCH /api/products/:id/stock`  
  Aggiorna lo stock di un prodotto

### Acquisto
- `POST /api/purchase`  
  Effettua l'acquisto di un prodotto da parte di un utente

Esempio body:
```json
{
  "userId": 1,
  "productId": 2
}


password db supabase "VERIFICATPSI"