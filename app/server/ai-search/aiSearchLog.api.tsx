import { prisma } from "prisma/lib/prisma";

import type { AiSearchLogType } from 'types/aiSearchLog.type';

export async function AiSeachLog(params: AiSearchLogType) {
	try {
		const isproduct = await prisma.aisearchlog.create({
			data: {
				query: params.query as string,
				keyword: params.keyword as string,
				minPrice: params.minPrice as number,
				maxPrice: params.maxPrice as number
			}
		});
	} catch (error: any) {
		return {
			success: false,
			message: "Failed to get product data"
		};
	}
}