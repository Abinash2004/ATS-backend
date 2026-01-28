import { Worker } from "bullmq";
import { getEmployeeById } from "../mongoose/employee";
import { runEmployeePayroll } from "./payroll";

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
				);
			console.log(`Payroll completed for employee ${data.employeeId}`);
		},
		{ connection: { url: "redis://localhost:6379/0", skipVersionCheck: true } },
	);
	worker.on("failed", (job, err) =>
		console.error(`Payroll failed for employee ${job?.data.employeeId}:`, err),
	);
}
