import bodyParser from "body-parser";
import express from "express";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

dotenv.config();

// Connect to the database using the DATABASE_URL environment variable
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

app.get("/", async (req, res) => {
  const result = await db.execute(sql`SELECT NOW()`);
  res.send(`Hello, World! The time from the DB is ${result[0].now}`);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
