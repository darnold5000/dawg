import { NextResponse } from "next/server";
import { loadRememberedFamily } from "@/lib/family-device";
import {
  emptyIntakeFormContext,
  resolveAuthorizedFamilyContextQuery,
} from "@/lib/family-context-access";
import { getIntakeFormContext } from "@/lib/intake";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const remembered = await loadRememberedFamily();

    if (!remembered) {
      return NextResponse.json(emptyIntakeFormContext());
    }

    const authorized = resolveAuthorizedFamilyContextQuery(remembered, {
      parentId: url.searchParams.get("parentId"),
      email: url.searchParams.get("email"),
      athleteId: url.searchParams.get("athleteId"),
      athleteFirstName: url.searchParams.get("athleteFirstName"),
      athleteLastName: url.searchParams.get("athleteLastName"),
      athleteDob: url.searchParams.get("athleteDob"),
    });

    if (!authorized) {
      return NextResponse.json(emptyIntakeFormContext());
    }

    const context = await getIntakeFormContext({
      parentId: authorized.parentId,
      athleteId: authorized.athleteId,
      athleteFirstName: authorized.athleteFirstName,
      athleteLastName: authorized.athleteLastName,
      athleteDob: authorized.athleteDob,
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
