import crypto from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const TABLE = process.env.WAITLIST_TABLE;

// Basic email validation (good enough for waitlists)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

// Helper: parse JSON safely
const safeJsonParse = (s) => {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return null;
  }
};

// If you are using a Lambda Function URL or API Gateway HTTP API, OPTIONS preflight can happen.
// You can remove CORS headers here if you handle CORS entirely in Function URL / API Gateway settings.
const corsHeaders = () => {
  const origin = process.env.CORS_ALLOW_ORIGIN || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
};

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod;
  const path = event?.rawPath || event?.path;

  // Handle CORS preflight (optional but useful)
  if (method === "OPTIONS") {
    return json(204, {}, corsHeaders());
  }

  // Route check
  if (method !== "POST" || path !== "/api/waitlist") {
    return json(404, { error: "Not found" }, corsHeaders());
  }

  const body = safeJsonParse(event?.body);
  if (!body) return json(400, { error: "Invalid JSON body." }, corsHeaders());

  const email = String(body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "Invalid email address." }, corsHeaders());
  }

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          email,
          createdAt: new Date().toISOString(),
          source: body?.source ? String(body.source) : "landing-page",
          requestId: crypto.randomUUID(),
        },
        // prevent duplicates if email is the table partition key
        ConditionExpression: "attribute_not_exists(email)",
      })
    );

    return json(201, { ok: true }, corsHeaders());
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Email already exists." }, corsHeaders());
    }
    console.error("DynamoDB error:", e);
    return json(500, { error: "Failed to save email." }, corsHeaders());
  }
};
