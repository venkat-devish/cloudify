package com.cloudify.api.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TerraformCliService {
    @Value("${cloudify.terraform.binary:terraform}")
    private String terraformBinary;

    @Value("${cloudify.terraform.allow-apply:false}")
    private boolean allowApply;

    public record RunResult(boolean success, String initOutput, String validateOutput, String planOutput, String applyOutput, boolean applied) {}

    public RunResult run(Map<String, String> files, boolean apply) throws Exception {
        Path workDir = Files.createTempDirectory("cloudify-tf-");
        Path infra = workDir.resolve("infra");
        Files.createDirectories(infra);
        for (Map.Entry<String, String> e : files.entrySet()) {
            String rel = e.getKey().startsWith("infra/") ? e.getKey().substring("infra/".length()) : e.getKey();
            Files.writeString(infra.resolve(rel), e.getValue(), StandardCharsets.UTF_8);
        }

        String initOut = exec(infra, terraformBinary, "init", "-backend=false", "-input=false");
        boolean initOk = initOut.contains("Terraform has been successfully initialized")
                || initOut.toLowerCase().contains("success");

        String validateOut = exec(infra, terraformBinary, "validate");
        boolean validateOk = validateOut.contains("Success") || validateOut.toLowerCase().contains("success");

        String planOut = exec(infra, terraformBinary, "plan", "-input=false", "-refresh=false");
        String applyOut = "";
        boolean applied = false;
        if (apply && allowApply && validateOk) {
            applyOut = exec(infra, terraformBinary, "apply", "-auto-approve", "-input=false", "-refresh=false");
            applied = !applyOut.toLowerCase().contains("error");
        }

        boolean success = initOk && validateOk;
        return new RunResult(success, initOut, validateOut, planOut, applyOut, applied);
    }

    private String exec(Path dir, String... cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(dir.toFile());
        pb.redirectErrorStream(true);
        Process p = pb.start();
        String out;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            out = br.lines().collect(Collectors.joining("\n"));
        }
        int code = p.waitFor();
        if (code != 0 && !out.toLowerCase().contains("success")) {
            out = out + "\n\n(exit code " + code + ")";
        }
        return out;
    }
}
