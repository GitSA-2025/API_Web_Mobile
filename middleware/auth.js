import jwt from "jsonwebtoken";

export async function authMiddleware(c, next) {
  try {
    const authHeader = c.req.header("authorization");

    if (!authHeader) {
      return c.json({ error: "Token não fornecido." }, 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return c.json({ error: "Token inválido." }, 401);
    }

    const decoded = jwt.verify(token, c.env.JWT_SECRET);

    c.set("userId", decoded.id);
    c.set("userEmail", decoded.email);


    await next();
  } catch (error) {
    console.error("Erro na autenticação JWT:", error);

    if (error.name === "TokenExpiredError") {
      return c.json({ error: "Token expirado." }, 401);
    }

    return c.json({ error: "Token inválido ou expirado." }, 403);
  }
}
