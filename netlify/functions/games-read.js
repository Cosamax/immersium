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
    process.env.SUPABASE_DATABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
        .order("name", { ascending: true });

      if (error) {
        // Si la table n'existe pas encore, retourner un tableau vide
        if (err.message.includes("competencies")) {
          return { statusCode: 200, headers, body: JSON.stringify([]) };
        }
        throw error;
      }
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    }

    // ── Lecture des colonnes disponibles pour diagnostic ──
    if (params.type === "schema") {
      const { data, error } = await sb
        .from("games")
        .select("*")
        .limit(1);

      if (error) throw error;
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      return { statusCode: 200, headers, body: JSON.stringify({ columns, sample: data }) };
    }

    // ── Liste complète des jeux (avec filtres optionnels) ──
    // Exclure challenges_data du listing pour rester sous la limite 6 MB Netlify
    const listColumns = "id,title,subtitle,description,color,bg,published,price,skills,challenges,questions_per_challenge,total_questions,duration_per_challenge,difficulty,sessions,created_at,updated_at,competency_id,sort_order,video_url,intro_text";
    let query = sb.from("games").select(listColumns);

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

    // Tri par titre (compatible avec toutes les structures de table)
    query = query.order("title", { ascending: true });

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
