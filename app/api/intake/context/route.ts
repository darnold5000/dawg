import { NextResponse } from "next/server";
import { loadRememberedFamily } from "@/lib/family-device";
import { getIntakeFormContext } from "@/lib/intake";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const remembered = await loadRememberedFamily();
    const context = await getIntakeFormContext({
      parentId: remembered?.parentId ?? url.searchParams.get("parentId"),
      email: url.searchParams.get("email") ?? remembered?.parentEmail,
      athleteId: url.searchParams.get("athleteId"),
      athleteFirstName: url.searchParams.get("athleteFirstName"),
      athleteLastName: url.searchParams.get("athleteLastName"),
      athleteDob: url.searchParams.get("athleteDob"),
    });

    return NextResponse.json(context);
  } catch (error) {
    console.error("[api/intake/context]", error);
    return NextResponse.json(
      { error: "Could not load intake context." },
      { status: 500 },
    );
  }
}
