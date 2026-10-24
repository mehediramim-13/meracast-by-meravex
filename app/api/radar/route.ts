import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 300;

export async function GET() {
  try {
    const radar = await weatherProvider.radar();
    return jsonOk(radar, 300, 900);
  } catch (error) {
    return jsonError(error);
  }
}
