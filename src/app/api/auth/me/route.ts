import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { mapCustomerDTO } from "@/lib/inventory";
import { route } from "@/lib/validators";

export const GET = route(async () => {
  const customer = await getCurrentCustomer();
  return NextResponse.json({
    customer: customer ? mapCustomerDTO(customer) : null,
  });
});
