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
      // Express v5 makes req.query read-only; attach parsed data to req.body
      // so the controller reads validated+coerced values from there.
      req.body = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
