import { updateRepairStatus } from "./repairs.service";

export async function executeWorkflowAction(
  repairId: string,
  nextStatus: string,
  eventDescription: string
) {
  await updateRepairStatus(repairId, nextStatus, eventDescription);
}