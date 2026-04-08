import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type Target = "body" | "params" | "query";

export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const { issues } = result.error as ZodError;
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: issues[0].message,
        fields: issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    req[target] = result.data;
    next();
  };
}
