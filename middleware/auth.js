import jwt from "jsonwebtoken";

// Middleware para proteger rotas usando JWT
export async function authMiddleware(c, next) {
  try {
    // Pega o header "Authorization" da requisição
    const authHeader = c.req.header("authorization");

    // Se não houver header, retorna erro 401 (não autorizado)
    if (!authHeader) {
      return c.json({ error: "Token não fornecido." }, 401);
    }

    // Extrai o token (espera formato "Bearer <token>")
    const token = authHeader.split(" ")[1];
    if (!token) {
      return c.json({ error: "Token inválido." }, 401);
    }

    // Verifica o token usando a chave secreta do ambiente
    const decoded = jwt.verify(token, c.env.JWT_SECRET);

    //  Adiciona informações do usuário no contexto da requisição
    //    para que as rotas seguintes possam acessar
    c.set("userId", decoded.id);
    c.set("userEmail", decoded.email);

    // Chama a próxima função/middleware da rota
    await next();
  } catch (error) {
    console.error("Erro na autenticação JWT:", error);

    // Tratamento de token expirado
    if (error.name === "TokenExpiredError") {
      return c.json({ error: "Token expirado." }, 401);
    }

    // Qualquer outro erro retorna 403 (proibido)
    return c.json({ error: "Token inválido ou expirado." }, 403);
  }
}
