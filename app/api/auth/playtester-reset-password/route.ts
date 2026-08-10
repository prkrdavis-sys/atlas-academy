import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ResetBody = {
  email?: unknown;
  password?: unknown;
};

type ResetResult = {
  ok?: boolean;
  error?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetBody;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("playtester_reset_password", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error("Failed to reset playtester password", error);
      return NextResponse.json(
        { error: "Could not reset that password right now." },
        { status: 500 },
      );
    }

    const result = data as ResetResult | null;
    if (!result?.ok) {
      return NextResponse.json(
        { error: result?.error ?? "Could not reset that password." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset playtester password", error);
    return NextResponse.json(
      { error: "Could not reset that password right now." },
      { status: 500 },
    );
  }
}
