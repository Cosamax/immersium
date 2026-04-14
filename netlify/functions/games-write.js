// ═══════════════════════════════════════════════════════════
// GAMES-WRITE — CRUD complet pour jeux et compétences
// Actions : upsert-game, delete-game, upsert-competency, delete-competency
// ═══════════════════════════════════════════════════════════

const { createClient } = require("@supabase/supabase-js");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "imm2025";

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const sb = createClient(
    process.env.SUPABASE_DATABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Vérification du mot de passe admin
  if (body.password !== ADMIN_PASSWORD) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Mot de passe incorrect" }) };
  }

  const action = body.action || "upsert-game";

  try {
    // ═══════════════════════════════════════
    // ACTION : Upsert (créer ou mettre à jour) un jeu
    // ═══════════════════════════════════════
    if (action === "upsert-game") {
      const game = body.game;
      if (!game || !game.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "game.id requis" }) };
      }

      const payload = {
        id: game.id,
        title: game.title || "",
        subtitle: game.sub || game.subtitle || "",
        description: game.description || game.desc || "",
        color: game.color || "#7C3AED",
        bg: game.bg || "rgba(124,58,237,.08)",
        published: game.published !== undefined ? game.published : true,
        price: game.price || "49 €",
        skills: game.skills || [],
        challenges: game.challenges || 21,
        questions_per_challenge: game.questionsPerChallenge || game.questions_per_challenge || 3,
        total_questions: game.totalQuestions || game.total_questions || 63,
        duration_per_challenge: game.durationPerChallenge || game.duration_per_challenge || "1h",
        difficulty: game.diff || game.difficulty || "Tous niveaux",
        competency_id: game.competency_id || null,
        sessions: game.sessions || [],
        sort_order: game.sort_order || 0,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from("games")
        .upsert(payload, { onConflict: "id" })
        .select();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, game: data?.[0] }) };
    }

    // ═══════════════════════════════════════
    // ACTION : Supprimer un jeu
    // ═══════════════════════════════════════
    if (action === "delete-game") {
      const gameId = body.game_id || body.gameId;
      if (!gameId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "game_id requis" }) };
      }

      const { error } = await sb
        .from("games")
        .delete()
        .eq("id", gameId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ═══════════════════════════════════════
    // ACTION : Upsert une compétence
    // ═══════════════════════════════════════
    if (action === "upsert-competency") {
      const comp = body.competency;
      if (!comp || !comp.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "competency.id requis" }) };
      }

      const payload = {
        id: comp.id,
        label: comp.label || "",
        description: comp.description || "",
        color: comp.color || "#024AFF",
        icon: comp.icon || "",
        sort_order: comp.sort_order || 0,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from("competencies")
        .upsert(payload, { onConflict: "id" })
        .select();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, competency: data?.[0] }) };
    }

    // ═══════════════════════════════════════
    // ACTION : Supprimer une compétence
    // ═══════════════════════════════════════
    if (action === "delete-competency") {
      const compId = body.competency_id || body.competencyId;
      if (!compId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "competency_id requis" }) };
      }

      // D'abord, dissocier les jeux de cette compétence
      await sb
        .from("games")
        .update({ competency_id: null })
        .eq("competency_id", compId);

      const { error } = await sb
        .from("competencies")
        .delete()
        .eq("id", compId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ═══════════════════════════════════════
    // ACTION : Compatibilité ancienne (body.game sans action)
    // ═══════════════════════════════════════
    if (body.game && !action) {
      // Fallback vers upsert-game pour compatibilité
      body.action = "upsert-game";
      // Réexécuter avec la bonne action (appel récursif simplifié)
      const game = body.game;
      const payload = {
        id: game.id,
        title: game.title || "",
        subtitle: game.sub || game.subtitle || "",
        description: game.description || "",
        color: game.color || "#7C3AED",
        bg: game.bg || "rgba(124,58,237,.08)",
        published: game.published !== undefined ? game.published : true,
        price: game.price || "49 €",
        skills: game.skills || [],
        challenges: game.challenges || 21,
        questions_per_challenge: game.questionsPerChallenge || 3,
        total_questions: game.totalQuestions || 63,
        duration_per_challenge: game.durationPerChallenge || "1h",
        difficulty: game.diff || game.difficulty || "Tous niveaux",
        sessions: game.sessions || [],
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from("games")
        .upsert(payload, { onConflict: "id" })
        .select();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, game: data?.[0] }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Action inconnue : " + action }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
