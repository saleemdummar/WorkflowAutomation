import "server-only";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { MssqlDialect } from "kysely";
import * as Tedious from "tedious";
import * as Tarn from "tarn";
import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";
const pbkdf2Async = promisify(pbkdf2);
const PW_ITERATIONS = 100_000;
const PW_KEY_LEN = 64;
const PW_DIGEST = "sha512";

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const key = await pbkdf2Async(
        password,
        salt,
        PW_ITERATIONS,
        PW_KEY_LEN,
        PW_DIGEST,
    );
    return `${PW_ITERATIONS}:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(data: {
    hash: string;
    password: string;
}): Promise<boolean> {
    const [iterStr, saltHex, storedKey] = data.hash.split(":");
    const iterations = parseInt(iterStr, 10);
    const saltBuffer = Buffer.from(saltHex, "hex");
    const key = await pbkdf2Async(
        data.password,
        saltBuffer,
        iterations,
        PW_KEY_LEN,
        PW_DIGEST,
    );
    return key.toString("hex") === storedKey;
}

// ── MSSQL Dialect (Kysely + Tedious) ──────────────

const dialect = new MssqlDialect({
    tarn: {
        ...Tarn,
        options: { min: 0, max: 10 },
    },
    tedious: {
        ...Tedious,
        connectionFactory: () =>
            new Tedious.Connection({
                authentication: {
                    options: {
                        password: process.env.DB_PASSWORD || "",
                        userName: process.env.DB_USER || "sa",
                    },
                    type: "default",
                },
                options: {
                    database: process.env.DB_NAME || "WorkflowAutomationDb",
                    trustServerCertificate: true,
                    encrypt: false,
                },
                server: process.env.DB_SERVER || "localhost",
            }),
    },
});

// ── Better Auth Instance ──────────────────────────

export const auth = betterAuth({
    database: {
        dialect,
        type: "mssql",
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    basePath: "/api/auth",
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
    },
    user: {
        modelName: "auth_users",
    },
    session: {
        modelName: "auth_sessions",
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    account: {
        modelName: "auth_accounts",
    },
    advanced: {
        database: {
            generateId: "uuid",
        },
    },
    trustedOrigins: [
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    ],
    plugins: [
        admin({
            defaultRole: "submitter",
        }),
    ],
});

export type Session = typeof auth.$Infer.Session;