import { NextResponse, type NextRequest } from "next/server";
import { fetchGenrePortfolios } from "@/lib/supabase/home-genre-queries";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json([], { status: 400 });
  }
  const data = await fetchGenrePortfolios(categoryId, 10);
  return NextResponse.json(data);
}
