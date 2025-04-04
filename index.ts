import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";

// Read config passed from automation API
const config = new pulumi.Config();
const repoName = config.require("repoName");
const description = config.get("description") || "";
const privateRepo = config.getBoolean("private") ?? true;
const collaborators = config.getObject<Array<{ username: string; permission: string }>>("collaborators") || [];
const labels = config.getObject<string[]>("labels") || [];
const branchProtection = config.getObject<{
  requiredApprovingReviewCount: number;
  requireCodeOwnerReviews: boolean;
}>("branchProtection") || {
  requiredApprovingReviewCount: 1,
  requireCodeOwnerReviews: true,
};

// 1. Create GitHub repo
const repo = new github.Repository(repoName, {
  name: repoName,
  description,
  private: privateRepo,
  hasIssues: true,
  autoInit: true,
  visibility: privateRepo ? "private" : "public",
});

// 2. Add collaborators
collaborators.forEach((collab, i) => {
  new github.RepositoryCollaborator(`${repoName}-collab-${i}`, {
    repository: repo.name,
    username: collab.username,
    permission: collab.permission as "pull" | "push" | "admin" | "maintain" | "triage",
  });
});

// 3. Add default labels
labels.forEach((label, i) => {
  new github.IssueLabel(`${repoName}-label-${i}`, {
    repository: repo.name,
    name: label,
    color: "ededed", // light gray, you can randomize or map colors later
  });
});

// 4. Set branch protection (main branch)
new github.BranchProtection(`${repoName}-protection`, {
  repositoryId: repo.nodeId,
  pattern: "main",
  requiredPullRequestReviews: {
    requiredApprovingReviewCount: branchProtection.requiredApprovingReviewCount,
    requireCodeOwnerReviews: branchProtection.requireCodeOwnerReviews,
  },
  requiredStatusChecks: {
    strict: true,
    contexts: [],
  },
});
