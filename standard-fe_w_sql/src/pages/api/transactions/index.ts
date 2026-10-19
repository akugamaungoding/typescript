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
  if (req.method === "GET") {
    try {
      const {
        search = "",
        productId,
        sortBy = "transaction_id",
        sortOrder = "desc",
        page = "1",
        limit = "10",
      } = req.query;

      const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNumber = Math.max(1, parseInt(limit as string, 10) || 10);
      const skip = (pageNumber - 1) * limitNumber;

      const validSortFields = [
        "transaction_id",
        "transaction_code",
        "transaction_date",
        "quantity",
        "total_amount",
        "created_at",
      ];
      const sortField = validSortFields.includes(String(sortBy))
        ? String(sortBy)
        : "transaction_id";
      const orderDirection: "asc" | "desc" =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      const searchTrimmed = String(search).trim();

      const whereCondition: any = {
        AND: [
          searchTrimmed
            ? {
                OR: [
                  { transaction_code: { contains: searchTrimmed } },
                  {
                    product: {
                      product_name: { contains: searchTrimmed },
                    },
                  },
                ],
              }
            : {},
          productId ? { product_id: parseInt(String(productId), 10) } : {},
        ],
      };

      const [data, total] = await Promise.all([
        prisma.product_trx.findMany({
          where: whereCondition,
          include: {
            product: {
              select: {
                product_id: true,
                product_name: true,
                price: true,
                is_active: true,
              },
            },
          },
          orderBy: { [sortField]: orderDirection },
          skip,
          take: limitNumber,
        }),
        prisma.product_trx.count({ where: whereCondition }),
      ]);

      return res.status(200).json({
        success: true,
        data: data.map(serializeTransaction),
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      });
    } catch (error: any) {
      console.error("API Error (GET /api/transactions):", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch transactions",
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { product_id, quantity } = req.body;

      const numProductId = parseInt(product_id, 10);
      const numQuantity = parseInt(quantity, 10);

      if (isNaN(numProductId)) {
        return res
          .status(400)
          .json({ success: false, message: "Valid Product ID is required" });
      }

      if (isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      // Execute within Prisma interactive transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch product
        const product = await tx.product_mst.findUnique({
          where: { product_id: numProductId },
        });

        if (!product) {
          throw new Error("Product not found");
        }

        if (!product.is_active) {
          throw new Error(
            "Selected product is inactive and cannot be transacted"
          );
        }

        if (product.stock < numQuantity) {
          throw new Error(
            `Insufficient stock. Available: ${product.stock}, Requested: ${numQuantity}`
          );
        }

        // 2. Generate unique transaction code
        const now = new Date();
        const datePart = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const transactionCode = `TRX-${datePart}-${randomPart}`;

        // 3. Calculate total amount
        const unitPrice = Number(product.price);
        const totalAmount = unitPrice * numQuantity;

        // 4. Insert transaction
        const newTransaction = await tx.product_trx.create({
          data: {
            transaction_code: transactionCode,
            product_id: product.product_id,
            transaction_date: now,
            quantity: numQuantity,
            total_amount: totalAmount,
            created_at: now,
          },
          include: {
            product: true,
          },
        });

        // 5. Decrement product stock
        await tx.product_mst.update({
          where: { product_id: product.product_id },
          data: {
            stock: {
              decrement: numQuantity,
            },
            updated_at: now,
          },
        });

        return newTransaction;
      });

      return res.status(201).json({
        success: true,
        message: "Transaction created successfully and stock updated",
        data: serializeTransaction(result),
      });
    } catch (error: any) {
      console.error("API Error (POST /api/transactions):", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to process transaction",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
}
