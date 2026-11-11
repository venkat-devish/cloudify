package com.cloudify.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class GitHubService {
  private final ObjectMapper mapper = new ObjectMapper();
  private final RestClient client;

  @Value("${cloudify.github.owner}")
  private String owner;

  @Value("${cloudify.github.repository}")
  private String repository;

  @Value("${cloudify.github.default-branch:main}")
  private String defaultBranch;

  @Value("${cloudify.github.personal-access-token:}")
  private String token;

  public GitHubService() {
    this.client = RestClient.builder().baseUrl("https://api.github.com").build();
  }

  public record PushResult(String pullRequestUrl, int pullRequestNumber) {}

  public PushResult pushTerraformAndOpenPr(String branchName, String projectName, Map<String, String> files) {
    if (token == null || token.isBlank()) {
      throw new IllegalStateException("Set GITHUB_TOKEN or cloudify.github.personal-access-token");
    }
    if (owner == null || owner.isBlank()) {
      throw new IllegalStateException("Set cloudify.github.owner or GITHUB_OWNER");
    }

    String baseCommitSha = resolveBranchSha(defaultBranch);
    String baseTreeSha = resolveCommitTreeSha(baseCommitSha);
    List<TreeEntry> treeEntries = new ArrayList<>();
    for (Map.Entry<String, String> e : files.entrySet()) {
      String path = normalizePath(e.getKey());
      String blobSha = createBlob(e.getValue());
      treeEntries.add(new TreeEntry(path, blobSha));
    }

    String treeSha = createTree(baseTreeSha, treeEntries);
    String commitSha = createCommit(baseCommitSha, treeSha, "Cloudify: " + projectName + " — generated Terraform");
    createBranchRef(branchName, commitSha);

    int prNumber = createPullRequest(branchName, projectName);
    String prUrl = "https://github.com/" + owner + "/" + repository + "/pull/" + prNumber;
    return new PushResult(prUrl, prNumber);
  }

  private record TreeEntry(String path, String sha) {}

  private String resolveBranchSha(String branch) {
    String body = get("/repos/" + owner + "/" + repository + "/git/ref/heads/" + branch);
    try {
      return mapper.readTree(body).path("object").path("sha").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to resolve branch " + branch, e);
    }
  }

  private String resolveCommitTreeSha(String commitSha) {
    String body = get("/repos/" + owner + "/" + repository + "/git/commits/" + commitSha);
    try {
      return mapper.readTree(body).path("tree").path("sha").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to resolve commit tree", e);
    }
  }

  private String createBlob(String content) {
    ObjectNode body = mapper.createObjectNode();
    body.put("content", content);
    body.put("encoding", "utf-8");
    String response = post("/repos/" + owner + "/" + repository + "/git/blobs", body);
    try {
      return mapper.readTree(response).path("sha").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to create blob", e);
    }
  }

  private String createTree(String baseTreeSha, List<TreeEntry> entries) {
    ObjectNode body = mapper.createObjectNode();
    body.put("base_tree", baseTreeSha);
    ArrayNode tree = body.putArray("tree");
    for (TreeEntry entry : entries) {
      ObjectNode item = tree.addObject();
      item.put("path", entry.path());
      item.put("mode", "100644");
      item.put("type", "blob");
      item.put("sha", entry.sha());
    }
    String response = post("/repos/" + owner + "/" + repository + "/git/trees", body);
    try {
      return mapper.readTree(response).path("sha").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to create tree", e);
    }
  }

  private String createCommit(String parentSha, String treeSha, String message) {
    ObjectNode body = mapper.createObjectNode();
    body.put("message", message);
    body.put("tree", treeSha);
    ArrayNode parents = body.putArray("parents");
    parents.add(parentSha);
    String response = post("/repos/" + owner + "/" + repository + "/git/commits", body);
    try {
      return mapper.readTree(response).path("sha").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to create commit", e);
    }
  }

  private void createBranchRef(String branchName, String commitSha) {
    ObjectNode body = mapper.createObjectNode();
    body.put("ref", "refs/heads/" + branchName);
    body.put("sha", commitSha);
    try {
      post("/repos/" + owner + "/" + repository + "/git/refs", body);
    } catch (RestClientResponseException ex) {
      if (ex.getStatusCode().value() == 422) {
        throw new IllegalStateException("Branch already exists: " + branchName, ex);
      }
      throw ex;
    }
  }

  private int createPullRequest(String branchName, String projectName) {
    ObjectNode body = mapper.createObjectNode();
    body.put("title", "Cloudify: " + projectName);
    body.put(
        "body",
        "Generated by Cloudify.\n\n"
            + "- Terraform files under `infra/`\n"
            + "- GitHub Actions runs **init / validate / plan** on this PR\n"
            + "- **Apply** runs after merge to `"
            + defaultBranch
            + "` (environment `cloudify-aws`)\n\n"
            + "Add `.github/workflows/terraform-aws.yml` from this repo's `templates/github-actions/` if not present.");
    body.put("head", branchName);
    body.put("base", defaultBranch);
    String response = post("/repos/" + owner + "/" + repository + "/pulls", body);
    try {
      JsonNode node = mapper.readTree(response);
      return node.path("number").asInt();
    } catch (Exception e) {
      throw new IllegalStateException("Failed to create pull request", e);
    }
  }

  private String get(String path) {
    return client.get().uri(path).headers(this::auth).retrieve().body(String.class);
  }

  private String post(String path, ObjectNode body) {
    return client
        .post()
        .uri(path)
        .headers(this::auth)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .retrieve()
        .body(String.class);
  }

  private void auth(HttpHeaders h) {
    h.setBearerAuth(token);
    h.set(HttpHeaders.ACCEPT, "application/vnd.github+json");
    h.set("X-GitHub-Api-Version", "2022-11-28");
  }

  private static String normalizePath(String key) {
    if (key.startsWith("/")) {
      return key.substring(1);
    }
    return key;
  }
}
