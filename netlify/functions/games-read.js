// ═══════════════════════════════════════════════════════════
// GAMES-READ — Lecture des jeux depuis Supabase
// Supporte : liste complète, jeu par ID, filtrage par compétence/niveau
// ═══════════════════════════════════════════════════════════

const { createClient } = require("@supabase/supabase-js");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const params = event.queryStringParameters || {};

  try {
    // ── Lecture d'un jeu spécifique par ID ──
    if (params.id) {
      const { data, error } = await sb
        .from("games")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ── Lecture des compétences ──
    if (params.type === "competencies") {
      const { data, error } = await sb
        .from("competencies")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    }

    // ── Liste complète des jeux (avec filtres optionnels) ──
    let query = sb.from("games").select("*");

    // Filtre par compétence
    if (params.competency_id) {
      query = query.eq("competency_id", params.competency_id);
    }

    // Filtre par niveau
    if (params.difficulty) {
      query = query.eq("difficulty", params.difficulty);
    }

    // Filtre par statut publié
    if (params.published !== undefined) {
      query = query.eq("published", params.published === "true");
    }

    // Tri par ordre de tri puis par titre
    query = query.order("sort_order", { ascending: true }).order("title", { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify(data || []) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
