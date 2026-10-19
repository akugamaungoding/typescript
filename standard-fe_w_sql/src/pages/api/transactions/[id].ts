import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

const serializeTransaction = (trx: any) => {
  return {
    ...trx,
    transaction_id: trx.transaction_id ? trx.transaction_id.toString() : trx.transaction_id,
    total_amount: trx.total_amount ? Number(trx.total_amount) : trx.total_amount,
    product: trx.product
      ? {
          ...trx.product,
          price: trx.product.price ? Number(trx.product.price) : trx.product.price,
        }
      : undefined,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }

  const { id } = req.query;

  try {
    const trxId = BigInt(String(id));

    const transaction = await prisma.product_trx.findUnique({
      where: { transaction_id: trxId },
      include: {
        product: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      data: serializeTransaction(transaction),
    });
  } catch (error: any) {
    console.error("API Error (GET /api/transactions/[id]):", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction",
    });
  }
}
