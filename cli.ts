import * as fs from "fs";
import * as path from "path";
import * as automation from "@pulumi/pulumi/automation";

// Read config file
const configPath = path.resolve(__dirname, "config.json");
const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Define a function to run the Pulumi program
async function run() {
  const projectName = "github-repo-auto-master";
  const stackName = "dev"; // You can change or parameterize this

  const program = async () => {
    await import("./index");
  };

  console.log("⚙️  Initializing Pulumi stack...");

  const stack = await automation.LocalWorkspace.createOrSelectStack({
    stackName,
    projectName,
    program,
  });

  console.log("✅ Stack ready");

  // Set configuration values
  await stack.setAllConfig(
    Object.entries(configData).reduce((acc, [key, value]) => {
      acc[key] = {
        value: typeof value === "string" ? value : JSON.stringify(value),
        secret: false,
      };
      return acc;
    }, {} as automation.ConfigMap)
  );

  console.log("🔄 Refreshing...");
  await stack.refresh({ onOutput: console.log });

  console.log("🚀 Updating...");
  const upRes = await stack.up({ onOutput: console.log });

  console.log(`✅ Update summary: ${upRes.summary.result}`);
}

run().catch((err) => {
  console.error("❌ Error running Pulumi automation:", err);
  process.exit(1);
});
