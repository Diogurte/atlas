import { buildOperationCenter } from "../core/atlas.engine";
import { getRepairs } from "./repairs.service";

export async function getAtlasOperationCenter() {
  const repairs = await getRepairs();
  return buildOperationCenter(repairs);
}
