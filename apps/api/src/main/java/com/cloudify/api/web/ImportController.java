package com.cloudify.api.web;

import com.cloudify.api.domain.SessionRecord;
import com.cloudify.api.domain.Topology;
import com.cloudify.api.service.DrawioImportService;
import com.cloudify.api.service.VisionImportService;
import com.cloudify.api.service.VisionImportService.VisionResult;
import com.cloudify.api.store.SessionStore;
import com.cloudify.api.web.dto.ImportAnalyzeResponse;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/import")
public class ImportController {

    private final DrawioImportService drawioImportService;
    private final VisionImportService visionImportService;
    private final SessionStore store;

    public ImportController(
            DrawioImportService drawioImportService,
            VisionImportService visionImportService,
            SessionStore store) {
        this.drawioImportService = drawioImportService;
        this.visionImportService = visionImportService;
        this.store = store;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ImportAnalyzeResponse importDiagram(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "projectName", defaultValue = "imported-diagram") String projectName)
            throws Exception {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";

        Topology topology;
        String source;
        String visionProvider = null;
        boolean mock = false;
        String message;

        if (filename.endsWith(".drawio") || filename.endsWith(".xml") || contentType.contains("xml")) {
            topology = drawioImportService.parseDrawio(file, projectName);
            source = "drawio";
            message = "Parsed Draw.io / mxGraph labels into topology.";
        } else if (contentType.startsWith("image/") || filename.matches(".*\\.(png|jpe?g|webp|gif)$")) {
            VisionResult vision = visionImportService.analyzeImage(file, projectName);
            topology = vision.topology();
            source = "image";
            visionProvider = vision.provider();
            mock = vision.mock();
            message = vision.detail();
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Unsupported file. Use PNG/JPG/WebP or .drawio/.xml");
        }

        if (topology.getNodes() == null || topology.getNodes().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "No AWS resources detected. Try a clearer diagram.");
        }

        SessionRecord record = new SessionRecord();
        record.setId(UUID.randomUUID().toString());
        record.setMode("upload");
        record.setTopology(topology);
        record.setCreatedAt(Instant.now());
        store.save(record);

        return ImportAnalyzeResponse.builder()
                .sessionId(record.getId())
                .topology(topology)
                .source(source)
                .visionProvider(visionProvider)
                .mock(mock)
                .message(message)
                .nodeCount(topology.getNodes().size())
                .edgeCount(topology.getEdges() != null ? topology.getEdges().size() : 0)
                .build();
    }
}
