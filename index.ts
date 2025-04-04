import * as pulumi from "@pulumi/pulumi";
import { Octokit } from "@octokit/rest";

const config = new pulumi.Config();
const repositories = config.requireObject<string[]>("repositories");
const checks = config.getObject<{
  visibility?: boolean;
  collaborators?: boolean;
  branchProtection?: boolean;
  labels?: boolean;
}>("checks") || {};

const githubToken = config.require("github:token");
const octokit = new Octokit({ auth: githubToken });

for (const fullName of repositories) {
  const [owner, repo] = fullName.split("/");

  pulumi.all([owner, repo]).apply(async ([o, r]) => {
    console.log(`\n🔍 Auditing repository: ${o}/${r}`);

    const repoData = await octokit.repos.get({ owner: o, repo: r });

    if (checks.visibility) {
      console.log(`- Visibility: ${repoData.data.private ? "private" : "public"}`);
    }

    if (checks.collaborators) {
      const { data: collabs } = await octokit.repos.listCollaborators({ owner: o, repo: r });
      console.log(`- Collaborators: ${collabs.map(c => c.login).join(", ")}`);
    }

    if (checks.labels) {
      const { data: labels } = await octokit.issues.listLabelsForRepo({ owner: o, repo: r });
      console.log(`- Labels: ${labels.map(l => l.name).join(", ")}`);
    }

    if (checks.branchProtection) {
      try {
        const protection = await octokit.repos.getBranchProtection({
          owner: o,
          repo: r,
          branch: "main",
        });
        console.log("- Branch Protection: ✓ Enabled (Main)");
      } catch {
        console.log("- Branch Protection: ❌ Not enabled or branch does not exist");
      }
    }
  });
}
