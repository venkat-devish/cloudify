package com.cloudify.api.store;

import com.cloudify.api.domain.SessionRecord;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class SessionStore {
    private final Map<String, SessionRecord> sessions = new ConcurrentHashMap<>();

    public void save(SessionRecord record) {
        sessions.put(record.getId(), record);
    }

    public Optional<SessionRecord> find(String id) {
        return Optional.ofNullable(sessions.get(id));
    }
}
