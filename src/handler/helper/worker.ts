import dotenv from "dotenv";
import { Worker } from "bullmq";
import { getEmployeeById } from "../mongoose/employee";
import { runEmployeePayroll } from "./payroll";

dotenv.config({ quiet: true });
const redisURI = process.env.REDIS_QUEUE_URL || "redis://localhost:6379/0";

export function startPayrollWorker() {
	const worker = new Worker(
		"payroll",
		async (job) => {
			const data = job.data;
			const start = new Date(data.start);
			const end = new Date(data.end);
			const recentAttendanceDate = new Date(data.recentAttendanceDate);
			const actualEndDate = new Date(data.actualEndDate);
			const emp = await getEmployeeById(data.employeeId);
			if (emp)
				await runEmployeePayroll(
					emp,
					start,
					end,
					data.isPendingAdvancePayroll,
					data.pendingAdvancePayroll,
					data.isAdvancePayroll,
					recentAttendanceDate,
					actualEndDate,
					data.fullAttendance,
				);
			console.log(`Payroll completed for employee ${data.employeeId}`);
		},
		{ connection: { url: redisURI, skipVersionCheck: true } },
	);
	worker.on("failed", (job, err) =>
		console.error(`Payroll failed for employee ${job?.data.employeeId}:`, err),
	);
}
