import crypto from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const TABLE = process.env.WAITLIST_TABLE;

// Basic email validation (good enough for waitlists)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
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

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod;
  const path = event?.rawPath || event?.path;

  // Route check
  if (method !== "POST" || path !== "/api/waitlist") {
    return json(404, { error: "Not found" });
  }

  const body = safeJsonParse(event?.body);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const email = String(body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "Invalid email address." });
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

    return json(201, { ok: true });
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Email already exists." });
    }
    console.error("DynamoDB error:", e);
    return json(500, { error: "Failed to save email." });
  }
};
