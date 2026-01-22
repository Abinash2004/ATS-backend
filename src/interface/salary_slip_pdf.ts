export interface ISalarySlipPDF {
    month: string;
    company: {
        name: string;
        address: string;
    };
    employee: {
        name: string;
        email: string;
        account: string;
        bank: string;
        department: string;
    };
    attendance: {
        working_shift: string;
        present_shift: string;
        absent_shift: string;
        paid_leave: string;
        over_time: string;
    },
    salary: {
        basic: string;
        hra: string;
        da: string;
        advance: string;
        over_time: string;
        bonus: string;
        penalty: string;
        epf: string;
        gross: string;
    }
}