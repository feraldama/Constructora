import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === "query" ? req.query : req.body;
    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json({
        error: "Datos inválidos",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    if (source === "query") {
      (req as unknown as Record<string, unknown>).query = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
