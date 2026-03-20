import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendInviteEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { email, workspace_id } = await req.json();

    // Derive app_url from environment — never trust client-supplied URLs in emails
    const app_url = Deno.env.get("APP_URL") ?? "https://app.contractguard.cloud";

    if (!email || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: workspace } = await serviceClient
      .from("workspaces")
      .select("name")
      .eq("id", workspace_id)
      .single();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();

    const workspaceName = workspace?.name || "a workspace";
    const inviterName = profile?.display_name || "A teammate";
    const signupLink = `${app_url}/signup?invite_email=${encodeURIComponent(email)}`;

    const result = await sendInviteEmail({
      to: email,
      inviteLink: signupLink,
      workspaceName,
      inviterName,
    });

    if (!result.success) {
      console.error("Email send failed:", result.error);
      return new Response(JSON.stringify({ error: "Failed to send email", details: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Exception:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
