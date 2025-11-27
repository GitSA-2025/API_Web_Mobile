import { Hono } from "hono"; // Framework leve para APIs em JavaScript/TypeScript
import { cors } from "hono/cors"; // Middleware para habilitar CORS
import authRoutes from "./routes/authRoutes.js"; // Rotas de autenticação
import appRoutes from "./routes/appRoutes.js";   // Rotas do app/mobile

const app = new Hono(); // Cria a instância do Hono

// --- Middleware global ---
// Habilita CORS para todas as rotas e origens
app.use("*", cors());

// --- Rotas da API ---
// Prefixo "/api" para rotas de autenticação (login, cadastro, 2FA, etc)
app.route("/api", authRoutes);

// Prefixo "/api/mobile" para rotas do app/mobile (entradas, entregas, QR Codes, etc)
app.route("/api/mobile", appRoutes);

// Rota raiz para teste rápido se a API está rodando
app.get("/", (c) => c.text("API rodando com sucesso no Cloudflare Workers 🚀"));

// Exporta a instância do app para ser usado no worker
export default app;
