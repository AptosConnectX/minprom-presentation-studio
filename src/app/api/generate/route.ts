import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "route.ts needs full restore — copy from artifacts/src_app_api_generate_route.ts" },
    { status: 503 }
  );
}
