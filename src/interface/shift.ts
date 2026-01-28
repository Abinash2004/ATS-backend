export interface ISingleShift {
	start_time: string;
	end_time: string;
	day_status: "full_day" | "first_half" | "second_half" | "holiday";
}
export interface IShift {
	_id?: string;
	sunday: ISingleShift;
	monday: ISingleShift;
	tuesday: ISingleShift;
	wednesday: ISingleShift;
	thursday: ISingleShift;
	friday: ISingleShift;
	saturday: ISingleShift;
}
