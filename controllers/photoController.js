import { getSupabase } from "../db/db.js";

const BUCKET = "photos";
const TABELA = "userapp";
const LIMITE_BASE64 = 7 * 1024 * 1024; // ~5 MB de imagem (base64 é ~33% maior)

// Caminho fixo por usuário: a foto nova sempre substitui a antiga
function caminhoFoto(userId) {
  return `perfil/${userId}.jpg`;
}

// Converte base64 em bytes (sem depender de Buffer)
function base64ParaBytes(base64) {
  const limpo = base64.replace(/^data:image\/\w+;base64,/, "");
  const binario = atob(limpo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

// Atualiza (ou troca) a foto de perfil do usuário logado
export async function atualizarFoto(c) {
  const supabase = getSupabase(c.env);

  try {
    // id do usuário vem do token (authMiddleware), não do corpo da requisição
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Usuário não identificado no token." }, 401);
    }

    const { foto_base64 } = await c.req.json();

    if (!foto_base64) {
      return c.json({ error: "Foto não informada." }, 400);
    }

    if (foto_base64.length > LIMITE_BASE64) {
      return c.json({ error: "Foto muito grande." }, 413);
    }

    const bytes = base64ParaBytes(foto_base64);
    const caminho = caminhoFoto(userId);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

    // ?t= evita que o app mostre a imagem antiga em cache
    const photo_url = `${data.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from(TABELA)
      .update({ photo_url })
      .eq("id_user", userId);

    if (dbError) throw dbError;

    return c.json({ message: "Foto atualizada!", photo_url }, 200);
  } catch (err) {
    console.error("Erro ao salvar foto:", err);
    return c.json({ error: "Erro ao salvar foto." }, 500);
  }
}

// Remove a foto de perfil do usuário logado
export async function removerFoto(c) {
  const supabase = getSupabase(c.env);

  try {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Usuário não identificado no token." }, 401);
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([caminhoFoto(userId)]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from(TABELA)
      .update({ photo_url: null })
      .eq("id_user", userId);

    if (dbError) throw dbError;

    return c.json({ message: "Foto removida!", photo_url: null }, 200);
  } catch (err) {
    console.error("Erro ao remover foto:", err);
    return c.json({ error: "Erro ao remover foto." }, 500);
  }
}