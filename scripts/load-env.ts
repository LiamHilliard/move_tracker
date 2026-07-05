// Imported for its side effect, and it must be the FIRST import in any
// script: ES module imports are hoisted and evaluated before the importing
// module's body, so calling dotenv config() inline runs too late for
// modules (like src/db) that read process.env at module scope.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
