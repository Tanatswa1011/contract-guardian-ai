import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user with anon client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data in dependency order
    // 1. notification_queue & notification_log (reference contracts/contract_dates)
    await adminClient.from("notification_queue").delete().eq("user_id", userId);
    await adminClient.from("notification_log").delete().eq("user_id", userId);

    // 2. email_events
    await adminClient.from("email_events").delete().eq("user_id", userId);

    // 3. reminder_rules
    await adminClient.from("reminder_rules").delete().eq("user_id", userId);

    // 4. extraction_runs, contract_files, contract_dates (via contracts)
    const { data: contracts } = await adminClient
      .from("contracts")
      .select("id")
      .eq("user_id", userId);

    if (contracts && contracts.length > 0) {
      const contractIds = contracts.map((c: { id: string }) => c.id);
      await adminClient
        .from("extraction_runs")
        .delete()
        .in("contract_id", contractIds);
      await adminClient
        .from("contract_files")
        .delete()
        .in("contract_id", contractIds);
      await adminClient
        .from("contract_dates")
        .delete()
        .in("contract_id", contractIds);
    }

    // 5. contracts
    await adminClient.from("contracts").delete().eq("user_id", userId);

    // 6. workspace_invites (invited_by this user)
    await adminClient.from("workspace_invites").delete().eq("invited_by", userId);

    // 7. workspace_members
    await adminClient.from("workspace_members").delete().eq("user_id", userId);

    // 8. Delete owned workspaces (no remaining members)
    await adminClient.from("workspaces").delete().eq("created_by", userId);

    // 9. profiles
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // 10. waitlist entries
    await adminClient
      .from("pro_waitlist")
      .delete()
      .eq("email", user.email ?? "");

    // 11. Delete auth user
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Account deletion error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
