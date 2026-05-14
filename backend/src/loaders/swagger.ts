import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BarberFlow API",
      version: "1.0.0",
      description: "API de agendamento para barbearias",
    },
    servers: [{ url: process.env.BACKEND_URL ?? "http://localhost:3001" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Booking: {
          type: "object",
          required: ["barberId", "serviceId", "clientName", "startTime"],
          properties: {
            barberId: { type: "string" },
            serviceId: { type: "string" },
            clientName: { type: "string", minLength: 2 },
            startTime: { type: "string", format: "date-time" },
            useOnlineDiscount: { type: "boolean", default: false },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            code: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});
