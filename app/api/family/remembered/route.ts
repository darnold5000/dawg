import { NextResponse } from "next/server";
import {
  forgetFamilyOnDevice,
  loadRememberedFamily,
} from "@/lib/family-device";

export async function GET() {
  try {
    const family = await loadRememberedFamily();
    return NextResponse.json({ family });
  } catch (error) {
    console.error("[api/family/remembered] GET", error);
    return NextResponse.json({ family: null });
  }
}

export async function DELETE() {
  try {
    await forgetFamilyOnDevice();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/family/remembered] DELETE", error);
    return NextResponse.json(
      { error: "Could not forget this device." },
      { status: 500 },
    );
  }
}
