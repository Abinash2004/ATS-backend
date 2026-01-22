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
async function getEPFPercentage(): Promise<number> {
    try {
        const policy = await Policy.findOne({});
        if (!policy) return 0;
        return policy.epf_percentage;
    } catch(error) {
        console.log(error);
        return 0;
    }
}
async function getEPFCap(): Promise<number> {
    try {
        const policy = await Policy.findOne({});
        if (!policy) return 0;
        return policy.epf_cap;
    } catch(error) {
        console.log(error);
        return 0;
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
        await Policy.updateOne({},policy);
    } catch(error) {
        console.log(error);
    }
}
async function readPolicy(): Promise<IPolicy | null> {
    try {
        return await Policy.findOne();
    } catch(error) {
        console.log(error);
        return null;
    }
}

export{getLateInPenalty,getEarlyOutPenalty,getBreakPerHourPenalty,getBreakLimitPenalty,getEPFPercentage,getEPFCap,createPolicy,updatePolicy,readPolicy};