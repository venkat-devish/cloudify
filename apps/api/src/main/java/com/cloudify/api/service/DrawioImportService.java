package com.cloudify.api.service;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.service.TopologyGraphBuilder.ImportedEdge;
import com.cloudify.api.service.TopologyGraphBuilder.ImportedNode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DrawioImportService {

    private static final Pattern VALUE_ATTR = Pattern.compile("value=\"([^\"]*)\"");
    private static final Pattern MX_GEOMETRY = Pattern.compile(
            "x=\"([\\d.]+)\"[^>]*y=\"([\\d.]+)\"", Pattern.CASE_INSENSITIVE);

    public Topology parseDrawio(MultipartFile file, String projectName) throws IOException {
        String xml = new String(file.getBytes(), StandardCharsets.UTF_8);
        List<ImportedNode> nodes = new ArrayList<>();
        for (String fragment : xml.split("<mxCell")) {
            if (!fragment.contains("vertex=\"1\"")) {
                continue;
            }
            Matcher vm = VALUE_ATTR.matcher(fragment);
            if (!vm.find()) {
                continue;
            }
            String label = decodeXml(vm.group(1));
            if (label.isBlank()) {
                continue;
            }
            Double x = null;
            Double y = null;
            Matcher gm = MX_GEOMETRY.matcher(fragment);
            if (gm.find()) {
                x = Double.parseDouble(gm.group(1));
                y = Double.parseDouble(gm.group(2));
            }
            nodes.add(new ImportedNode(label, null, x, y));
        }
        List<ImportedEdge> edges = inferChainEdges(nodes);
        return TopologyGraphBuilder.build(projectName, nodes, edges);
    }

    private List<ImportedEdge> inferChainEdges(List<ImportedNode> nodes) {
        List<ImportedEdge> edges = new ArrayList<>();
        for (int i = 0; i < nodes.size() - 1; i++) {
            edges.add(new ImportedEdge(nodes.get(i).label(), nodes.get(i + 1).label()));
        }
        return edges;
    }

    private String decodeXml(String raw) {
        return raw.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&#xa;", " ").trim();
    }
}
