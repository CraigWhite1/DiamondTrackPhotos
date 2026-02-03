require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const sql = require("mssql");

const app = express();

// Log incoming requests to help diagnose Azure 500s.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const config = {
  port: getPort(),
  fastApi: {
    baseUrl: process.env.FASTAPI_BASE_URL || "",
    authHeader: process.env.FASTAPI_AUTH_HEADER || "x-api-key",
    authValue:
      process.env.FASTAPI_AUTH_VALUE || process.env.FASTAPI_API_KEY || "",
    timeoutMs: parseInt(process.env.FASTAPI_TIMEOUT_MS || "5000", 10),
    jewelryPath: process.env.FASTAPI_JEWELRY_PATH || "/jewelry",
    diamondsPath: process.env.FASTAPI_DIAMONDS_PATH || "/colorDiamonds",
  },
  gia: {
    baseUrl: process.env.GIA_BASE_URL || "https://api.reportresults.gia.edu/",
    authHeader: process.env.GIA_AUTH_HEADER || "Authorization",
    authValue:
      process.env.GIA_AUTH_VALUE || process.env.GIA_API_KEY || "",
    timeoutMs: parseInt(process.env.GIA_TIMEOUT_MS || "5000", 10),
  },
  blob: {
    baseUrl:
      process.env.BLOB_BASE_URL || "https://gemelody.blob.core.windows.net",
    mediaContainer: process.env.BLOB_MEDIA_CONTAINER || "img",
    certContainer: process.env.BLOB_CERT_CONTAINER || "certslotname",
  },
  mocks: {
    enabled: process.env.USE_MOCKS === "true",
    path:
      process.env.MOCK_CERT_PATH ||
      path.join(__dirname, "mocks", "certs.sample.json"),
  },
  sql: {
    enabled: process.env.USE_SQL_FALLBACK === "true",
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: parseInt(process.env.SQL_PORT || "1433", 10),
  },
};

function getPort() {
  // iisnode sets PORT to a named pipe (e.g., \\.\pipe\xxx); use it directly.
  const port = process.env.PORT || process.env.WEBSITE_PORT || process.env.HTTP_PLATFORM_PORT;
  
  console.log(`Port selection: PORT=${process.env.PORT}, WEBSITE_PORT=${process.env.WEBSITE_PORT}, HTTP_PLATFORM_PORT=${process.env.HTTP_PLATFORM_PORT}`);
  
  if (port) {
    console.log(`Using port: ${port}`);
    return port;
  }

  // Fallback for local dev.
  const fallback = process.env.WEBSITE_SITE_NAME ? 8080 : 3000;
  console.log(`No port env var found, using fallback: ${fallback}`);
  return fallback;
}

const mockCerts = loadMockCerts();

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("landing");
});

app.get("/diamonds/:id", async function (req, res) {
  const lot = req.params.id;
  try {
    const media = buildMediaUrls(lot);
    const cert = await getCertInfo(lot, "diamonds");
    res.render("show", { lot, media, cert });
  } catch (error) {
    console.error("/diamonds handler error", error.message);
    res.render("error", { words: { LotName: "error" } });
  }
});

app.get("/jewelry/:id", async function (req, res) {
  const lot = req.params.id;
  try {
    const media = buildMediaUrls(lot);
    const cert = await getCertInfo(lot, "jewelry");
    const details = await fetchSqlDetails(lot);

    res.render("jewelry", { lot, media, cert, details });
  } catch (error) {
    console.error("/jewelry handler error", error.message);
    res.render("error", { words: { LotName: "error" } });
  }
});

// Generic error handler to ensure stack traces hit the logs.
app.use(function (err, req, res, next) {
  console.error("Express error handler", err && err.stack ? err.stack : err);
  res.status(500).send("Internal Server Error");
});

app.listen(config.port, function () {
  console.log(`Server listening on port ${config.port}`);
});

// Catch unhandled promise rejections and exceptions so they surface in logs.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception", error);
});

function buildMediaUrls(lot) {
  const base = config.blob.baseUrl.replace(/\/$/, "");
  const media = config.blob.mediaContainer.replace(/\/$/, "");
  return {
    imageUrl: `${base}/${media}/${lot}.jpg`,
    videoUrl: `${base}/${media}/${lot}.mp4`,
  };
}

function buildBlobCertUrl(lot) {
  const base = config.blob.baseUrl.replace(/\/$/, "");
  const container = config.blob.certContainer.replace(/\/$/, "");
  return `${base}/${container}/${lot}.PDF`;
}

function normalizeLab(lab) {
  return (lab || "").trim().toUpperCase();
}

function loadMockCerts() {
  if (!config.mocks.enabled) return [];
  try {
    const raw = fs.readFileSync(config.mocks.path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Mock cert load failed", error.message);
    return [];
  }
}

function getFastApiHeaders() {
  const headers = {};
  if (config.fastApi.authHeader && config.fastApi.authValue) {
    headers[config.fastApi.authHeader] = config.fastApi.authValue;
  }
  return headers;
}

function getGiaHeaders() {
  const headers = {};
  if (config.gia.authHeader && config.gia.authValue) {
    headers[config.gia.authHeader] = config.gia.authValue;
  }
  return headers;
}

async function fetchFromFastApi(lot, kind) {
  if (!config.fastApi.baseUrl) return null;
  const base = config.fastApi.baseUrl.replace(/\/$/, "");
  const pathPart =
    kind === "jewelry"
      ? config.fastApi.jewelryPath
      : config.fastApi.diamondsPath;
  const normalizedPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const url = `${base}${normalizedPath}`;

  const payload = {
    page: 1,
    limit: 1,
    filters: {
      search: lot,
    },
    sortBy: "Sale1",
    sortOrder: "desc",
  };

  try {
    const response = await axios.post(url, payload, {
      headers: getFastApiHeaders(),
      timeout: config.fastApi.timeoutMs,
    });
    return response.data;
  } catch (error) {
    console.warn(`FastAPI fetch failed for ${kind}`, error.message);
    return null;
  }
}

async function fetchFromGia(certNumber) {
  if (!config.gia.baseUrl || !certNumber) return null;
  const url = config.gia.baseUrl.replace(/\/$/, "");
  const payload = {
    query: `\n  query GetReportLink($reportNumber: String!) {\n    getReport(report_number: $reportNumber) {\n      links {\n        pdf\n      }\n    }\n  }\n`,
    variables: { reportNumber: certNumber },
  };
  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        ...getGiaHeaders(),
      },
      timeout: config.gia.timeoutMs,
    });
    const pdfUrl =
      response.data &&
      response.data.data &&
      response.data.data.getReport &&
      response.data.data.getReport.links
        ? response.data.data.getReport.links.pdf
        : null;
    if (!pdfUrl) return null;
    return { certNumber, certUrl: pdfUrl };
  } catch (error) {
    console.warn("GIA fetch failed", error.message);
    return null;
  }
}

async function getCertInfo(lot, kind) {
  if (config.mocks.enabled && mockCerts.length) {
    const mockMatch = mockCerts.find(
      (item) => item.lotName && item.lotName.toUpperCase() === lot.toUpperCase()
    );
    if (mockMatch) {
      return {
        certNumber: mockMatch.certNumber || lot,
        lab: mockMatch.lab || "MOCK",
        certUrl: mockMatch.certUrl || buildBlobCertUrl(lot),
        source: "mock",
      };
    }
  }

  const fastApiEnvelope = await fetchFromFastApi(lot, kind);
  const first = fastApiEnvelope && Array.isArray(fastApiEnvelope.results)
    ? fastApiEnvelope.results[0]
    : null;
  const fastApiLab = normalizeLab(first ? first.Lab : "");
  const fastApiCertNumber = first ? first.CertificateNo : "";
  const fastApiCertUrl = first && first.CertificateUrl ? first.CertificateUrl : "";

  if (fastApiLab === "GIA") {
    const giaData = await fetchFromGia(fastApiCertNumber || lot);
    if (giaData) {
      return {
        certNumber: giaData.certNumber || fastApiCertNumber || lot,
        lab: "GIA",
        certUrl: giaData.certUrl || fastApiCertUrl || buildBlobCertUrl(lot),
        source: "gia",
      };
    }
  }

  if (first) {
    return {
      certNumber: fastApiCertNumber || lot,
      lab: fastApiLab || first.Lab || "",
      certUrl: fastApiCertUrl || buildBlobCertUrl(lot),
      source: "fastapi",
    };
  }

  return {
    certNumber: lot,
    lab: "",
    certUrl: buildBlobCertUrl(lot),
    source: "blob-fallback",
  };
}

async function fetchSqlDetails(lot) {
  if (!config.sql.enabled) return [];
  const dbConfig = {
    server: config.sql.server,
    database: config.sql.database,
    user: config.sql.user,
    password: config.sql.password,
    port: config.sql.port,
    options: {
      encrypt: true,
      enableArithAbort: true,
    },
  };

  if (!dbConfig.server || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.warn("SQL fallback skipped: missing credentials");
    return [];
  }

  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    request.input("lot", sql.VarChar, lot);
    const result = await request.query("SELECT * FROM Certs WHERE LotName = @lot;");
    await pool.close();
    return result.recordset || [];
  } catch (error) {
    console.warn("SQL fallback failed", error.message);
    return [];
  }
}
