import { prisma } from "prisma/lib/prisma";

export async function ServerApiFindProduct() {
	try {
		const isproduct = await prisma.product.findMany({
			take: 10
		});

		if (isproduct.length) {
			return {
				success: true,
				message: "Get product data successfully",
				data: isproduct
			}
		} else {
			return {
				success: false,
				message: "Failed to get product data",
			};
		}
	} catch (error: any) {
		return {
			success: false,
			message: "Failed to get product data"
		};
	}
}