import { Router } from "express";
import {
  getAllProducts,
  getActiveProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
} from "../controllers/ProductController";
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
} from "../controllers/TransactionController";

const router = Router();

// Product endpoints
router.get("/products", getAllProducts);
router.get("/products/active", getActiveProducts);
router.get("/products/:id", getProductById);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.put("/products/:id/status", toggleProductStatus);

// Transaction endpoints
router.get("/transactions", getAllTransactions);
router.get("/transactions/:id", getTransactionById);
router.post("/transactions", createTransaction);

export default router;
