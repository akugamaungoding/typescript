import { Request, Response } from "express";
import { prisma } from "../../config/db";

// GET /api/products - List products with search, filter, sorting, pagination
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = "",
      status, // 'all', '1', '0'
      sortBy = "product_id",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    const validSortFields = ["product_id", "product_name", "price", "stock", "is_active", "created_at"];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : "product_id";
    const orderDirection: "asc" | "desc" = String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

    const searchTrimmed = String(search).trim();

    const whereCondition: any = {
      AND: [
        searchTrimmed
          ? {
              OR: [
                { product_name: { contains: searchTrimmed } },
                { description: { contains: searchTrimmed } },
              ],
            }
          : {},
        status !== undefined && status !== "" && status !== "all"
          ? { is_active: status === "1" || status === "true" }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.product_mst.findMany({
        where: whereCondition,
        orderBy: { [sortField]: orderDirection },
        skip,
        take: limitNumber,
      }),
      prisma.product_mst.count({ where: whereCondition }),
    ]);

    res.status(200).json({
      success: true,
      data,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error: any) {
    console.error("Error in getAllProducts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
    });
  }
};

// GET /api/products/active - List only active products with stock > 0 for transaction dropdown
export const getActiveProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product_mst.findMany({
      where: {
        is_active: true,
      },
      orderBy: { product_name: "asc" },
      select: {
        product_id: true,
        product_name: true,
        price: true,
        stock: true,
      },
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Error in getActiveProducts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active products",
    });
  }
};

// GET /api/products/:id - Get product detail
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await prisma.product_mst.findUnique({
      where: { product_id: id },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Error in getProductById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch product detail",
    });
  }
};

// POST /api/products - Create new product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_name, description, price, stock } = req.body;

    if (!product_name || typeof product_name !== "string" || product_name.trim() === "") {
      res.status(400).json({ success: false, message: "Product name is required" });
      return;
    }

    const numPrice = Number(price);
    const numStock = parseInt(stock, 10);

    if (isNaN(numPrice) || numPrice < 0) {
      res.status(400).json({ success: false, message: "Price must be a valid non-negative number" });
      return;
    }

    if (isNaN(numStock) || numStock < 0) {
      res.status(400).json({ success: false, message: "Stock must be a valid non-negative integer" });
      return;
    }

    const created = await prisma.product_mst.create({
      data: {
        product_name: product_name.trim(),
        description: description ? String(description).trim() : null,
        price: numPrice,
        stock: numStock,
        is_active: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: created,
    });
  } catch (error: any) {
    console.error("Error in createProduct:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
};

// PUT /api/products/:id - Update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const { product_name, description, price, stock, is_active } = req.body;

    const existing = await prisma.product_mst.findUnique({
      where: { product_id: id },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const updateData: any = {};

    if (product_name !== undefined) {
      if (typeof product_name !== "string" || product_name.trim() === "") {
        res.status(400).json({ success: false, message: "Product name cannot be empty" });
        return;
      }
      updateData.product_name = product_name.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        res.status(400).json({ success: false, message: "Price must be a non-negative number" });
        return;
      }
      updateData.price = numPrice;
    }

    if (stock !== undefined) {
      const numStock = parseInt(stock, 10);
      if (isNaN(numStock) || numStock < 0) {
        res.status(400).json({ success: false, message: "Stock cannot be negative" });
        return;
      }
      updateData.stock = numStock;
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    updateData.updated_at = new Date();

    const updated = await prisma.product_mst.update({
      where: { product_id: id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error in updateProduct:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
};

// PUT /api/products/:id/status - Toggle or soft delete product (IS_ACTIVE = false/true)
export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const existing = await prisma.product_mst.findUnique({
      where: { product_id: id },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    // Default toggles is_active or sets to body.is_active
    const newStatus = req.body.is_active !== undefined ? Boolean(req.body.is_active) : !existing.is_active;

    const updated = await prisma.product_mst.update({
      where: { product_id: id },
      data: {
        is_active: newStatus,
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: newStatus ? "Product activated successfully" : "Product deactivated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error in toggleProductStatus:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product status",
    });
  }
};
