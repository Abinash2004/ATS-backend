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

export{getLateInPenalty,getEarlyOutPenalty,getBreakPerHourPenalty,getBreakLimitPenalty};