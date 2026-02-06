import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const PORT = Number(process.env.PORT || 3000);
const AWS_REGION = process.env.AWS_REGION;
const WAITLIST_TABLE = process.env.WAITLIST_TABLE;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_HEADERS = "Content-Type";
const ALLOWED_METHODS = "POST, OPTIONS";
const DIST_DIR = path.join(process.cwd(), "dist");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (ALLOWED_ORIGINS.includes("*")) {
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

app.use((req, res, next) => {
  const requestOrigin = req.get("Origin");
  const allowed = isOriginAllowed(requestOrigin);

  res.setHeader("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Max-Age", "600");

  if (requestOrigin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  } else if (!requestOrigin && ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  if (req.method === "OPTIONS") {
    if (!allowed) {
      return res.status(403).json({ error: "Origin not allowed by CORS policy." });
    }

    return res.status(204).end();
  }

  if (requestOrigin && !allowed && req.path.startsWith("/api/")) {
    return res.status(403).json({ error: "Origin not allowed by CORS policy." });
  }

  next();
});

app.use(express.json({ limit: "16kb" }));
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

const hasAwsConfig = Boolean(AWS_REGION && WAITLIST_TABLE);

if (!hasAwsConfig) {
  console.warn("Missing AWS config. Set AWS_REGION and WAITLIST_TABLE in environment variables.");
}

const dynamo = hasAwsConfig
  ? DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }))
  : null;

app.post("/api/waitlist", async (req, res) => {
  if (!dynamo || !WAITLIST_TABLE) {
    return res.status(500).json({ error: "Server is not configured." });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  try {
    await dynamo.send(
      new PutCommand({
        TableName: WAITLIST_TABLE,
        Item: {
          email,
          createdAt: new Date().toISOString(),
          source: "landing-page",
          requestId: crypto.randomUUID(),
          userAgent: req.get("user-agent") || "",
          ip: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        },
        ConditionExpression: "attribute_not_exists(email)"
      })
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      return res.status(409).json({ error: "Email already exists." });
    }

    if (error?.name === "ResourceNotFoundException") {
      return res.status(500).json({ error: "DynamoDB table was not found. Check WAITLIST_TABLE." });
    }

    if (error?.name === "CredentialsProviderError" || error?.name === "UnrecognizedClientException") {
      return res.status(500).json({ error: "AWS credentials are not configured correctly on the API server." });
    }

    console.error("Failed to save email", error);
    return res.status(500).json({
      error: "Failed to save email.",
      details: IS_PRODUCTION ? undefined : String(error?.message || error)
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

if (fs.existsSync(DIST_DIR)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/health") {
      return next();
    }

    return res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
