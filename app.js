import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./routes/authRoutes.js";
import appRoutes from "./routes/appRoutes.js";

const app = new Hono();

app.use("*", cors());

app.route("/api", authRoutes);
app.route("/api/mobile", appRoutes);

app.get("/", (c) => c.text("API rodando com sucesso no Cloudflare Workers 🚀"));

export default app;
