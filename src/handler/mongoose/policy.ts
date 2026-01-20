import Policy from "../../model/policy.ts";
import type {IPolicy} from "../../interface/policy.ts";

async function getLateInPenalty(): Promise<number> {
    try {
        const policy: IPolicy | null = await Policy.findOne();
        if (!policy) return 0;
        return policy.late_in;
    } catch(error) {
        console.log(error);
        return 500;
    }
}
async function getEarlyOutPenalty(): Promise<number> {
    try {
        const policy: IPolicy | null = await Policy.findOne();
        if (!policy) return 0;
        return policy.late_in;
    } catch(error) {
        console.log(error);
        return 500;
    }
}
async function getBreakPerHourPenalty(): Promise<number> {
    try {
        const policy: IPolicy | null = await Policy.findOne();
        if (!policy) return 0;
        return policy.late_in;
    } catch(error) {
        console.log(error);
        return 500;
    }
}
async function getBreakLimitPenalty(): Promise<number> {
    try {
        const policy: IPolicy | null = await Policy.findOne();
        if (!policy) return 0;
        return policy.late_in;
    } catch(error) {
        console.log(error);
        return 500;
    }
}
async function createPolicy(policy: IPolicy): Promise<void> {
    try {
        await Policy.create(policy);
    } catch(error) {
        console.log(error);
    }
}
async function updatePolicy(policy: IPolicy): Promise<void> {
    try {
        await Policy.updateOne({},{
            late_in: policy.late_in,
            early_out: policy.early_out,
            break_per_hour: policy.break_per_hour,
            break_limit: policy.break_limit
        });
    } catch(error) {
        console.log(error);
    }
}

export{getLateInPenalty,getEarlyOutPenalty,getBreakPerHourPenalty,getBreakLimitPenalty,createPolicy,updatePolicy};